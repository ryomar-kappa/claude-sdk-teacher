# Claude Agent SDK - Hook統合完全ガイド

Claude Agent SDKでhook（フック）システムを統合し、エージェントの動作をカスタマイズする方法を詳しく解説します。

## 目次

1. [Hookとは](#hookとは)
2. [Hookの設計思想](#hookの設計思想)
3. [実装パターン](#実装パターン)
4. [完全な実装例](#完全な実装例)
5. [実用的な応用例](#実用的な応用例)
6. [ベストプラクティス](#ベストプラクティス)
7. [アーキテクチャパターン](#アーキテクチャパターン)

---

## Hookとは

### 概要

**Hook（フック）**は、プログラムの特定のポイントで実行されるカスタムコールバック関数です。Claude Agent SDKにhookを統合することで：

- ✅ エージェントの動作をカスタマイズ
- ✅ ツール実行前後での処理追加
- ✅ ロギング・モニタリング
- ✅ バリデーション・変換
- ✅ エラーハンドリング
- ✅ キャッシング・最適化

が可能になります。

### なぜHookが必要か

```typescript
// ❌ Hookなし: ロジックが密結合
async function executeTool(tool: ToolUse) {
  console.log(`Starting: ${tool.name}`); // ロギング
  validateInput(tool.input);              // バリデーション
  const result = await actualExecution(tool);
  logMetrics(tool.name, result);          // メトリクス
  return result;
}

// ✅ Hookあり: 関心の分離
async function executeTool(tool: ToolUse) {
  await hookManager.runHooks('pre:tool', tool);
  const result = await actualExecution(tool);
  await hookManager.runHooks('post:tool', { tool, result });
  return result;
}
```

---

## Hookの設計思想

### 1. Hook実行タイミング

```
┌─────────────────────────────────────────┐
│         Agent Lifecycle                 │
└─────────────────────────────────────────┘

  initialize
      ↓
  ┌─── before:message
  │       ↓
  │   process message
  │       ↓
  │   ┌─── before:tool_use
  │   │       ↓
  │   │   execute tool
  │   │       ↓
  │   └─── after:tool_use
  │       ↓
  │   format response
  │       ↓
  └─── after:message
      ↓
  shutdown
```

### 2. Hookの種類

| Hook Type | 実行タイミング | 用途 |
|-----------|--------------|------|
| **before:message** | メッセージ処理前 | 入力バリデーション、前処理 |
| **after:message** | メッセージ処理後 | ロギング、後処理 |
| **before:tool** | ツール実行前 | パラメータ検証、キャッシュ確認 |
| **after:tool** | ツール実行後 | 結果の変換、メトリクス記録 |
| **on:error** | エラー発生時 | エラーハンドリング、リトライ |
| **on:complete** | 処理完了時 | クリーンアップ、レポート生成 |

### 3. Hook設計原則

```typescript
// 原則1: 型安全性
interface Hook<T = any, R = any> {
  name: string;
  handler: (context: T) => Promise<R> | R;
  priority?: number;
  condition?: (context: T) => boolean;
}

// 原則2: 非侵入性
// Hookはメイン処理に影響を与えない

// 原則3: コンポーザビリティ
// 複数のHookを組み合わせ可能

// 原則4: エラー分離
// Hookのエラーがメイン処理を壊さない
```

---

## 実装パターン

### パターン1: シンプルなHookシステム

```typescript
type HookHandler<T = any> = (context: T) => Promise<void> | void;

class SimpleHookManager {
  private hooks: Map<string, HookHandler[]> = new Map();

  register(event: string, handler: HookHandler): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(handler);
  }

  async run(event: string, context: any): Promise<void> {
    const handlers = this.hooks.get(event) || [];
    for (const handler of handlers) {
      await handler(context);
    }
  }
}

// 使用例
const hooks = new SimpleHookManager();

hooks.register('before:tool', async (ctx) => {
  console.log(`Executing tool: ${ctx.toolName}`);
});

hooks.register('after:tool', async (ctx) => {
  console.log(`Tool result: ${JSON.stringify(ctx.result)}`);
});

await hooks.run('before:tool', { toolName: 'get_weather' });
```

### パターン2: 型安全なHookシステム

```typescript
// Hook型定義
interface HookContext {
  'before:message': { message: string; userId: string };
  'after:message': { message: string; response: string };
  'before:tool': { toolName: string; input: unknown };
  'after:tool': { toolName: string; result: unknown };
  'on:error': { error: Error; context: unknown };
}

type HookEvent = keyof HookContext;
type HookHandler<E extends HookEvent> = (
  context: HookContext[E]
) => Promise<void> | void;

class TypedHookManager {
  private hooks = new Map<HookEvent, HookHandler<any>[]>();

  on<E extends HookEvent>(event: E, handler: HookHandler<E>): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(handler);
  }

  async emit<E extends HookEvent>(
    event: E,
    context: HookContext[E]
  ): Promise<void> {
    const handlers = this.hooks.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error(`Hook error in ${event}:`, error);
      }
    }
  }
}

// 使用例（型安全）
const hooks = new TypedHookManager();

hooks.on('before:tool', async (ctx) => {
  // ctx.toolName と ctx.input は型推論される
  console.log(`Tool: ${ctx.toolName}`);
});

// ❌ コンパイルエラー（型が合わない）
// hooks.on('before:tool', async (ctx) => {
//   console.log(ctx.message); // Property 'message' does not exist
// });
```

### パターン3: ミドルウェアスタイルHook

```typescript
type Middleware<T = any> = (
  context: T,
  next: () => Promise<void>
) => Promise<void>;

class MiddlewareHookManager {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async execute(context: any): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(context, next);
      }
    };

    await next();
  }
}

// 使用例
const middleware = new MiddlewareHookManager();

middleware.use(async (ctx, next) => {
  console.log('Before');
  await next(); // 次のミドルウェアへ
  console.log('After');
});

middleware.use(async (ctx, next) => {
  console.log('Middle');
  await next();
});

await middleware.execute({ data: 'test' });
// 出力:
// Before
// Middle
// After
```

### パターン4: プライオリティ付きHook

```typescript
interface PrioritizedHook<T = any> {
  priority: number;
  handler: HookHandler<T>;
  name?: string;
}

class PriorityHookManager {
  private hooks = new Map<string, PrioritizedHook[]>();

  register(
    event: string,
    handler: HookHandler,
    priority: number = 0
  ): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    this.hooks.get(event)!.push({ priority, handler });

    // プライオリティでソート（高い順）
    this.hooks.get(event)!.sort((a, b) => b.priority - a.priority);
  }

  async run(event: string, context: any): Promise<void> {
    const hooks = this.hooks.get(event) || [];
    for (const { handler } of hooks) {
      await handler(context);
    }
  }
}

// 使用例
const hooks = new PriorityHookManager();

hooks.register('before:tool', async (ctx) => {
  console.log('Low priority');
}, 1);

hooks.register('before:tool', async (ctx) => {
  console.log('High priority');
}, 10);

await hooks.run('before:tool', {});
// 出力:
// High priority
// Low priority
```

---

## 完全な実装例

### 実装1: エンタープライズグレードHookシステム

```typescript
import Anthropic from '@anthropic-ai/sdk';

// ===== 型定義 =====

interface HookContext {
  'agent:init': { agentId: string };
  'agent:shutdown': { agentId: string };
  'message:before': {
    messages: Anthropic.MessageParam[];
    model: string;
  };
  'message:after': {
    messages: Anthropic.MessageParam[];
    response: Anthropic.Message;
  };
  'tool:before': {
    toolUse: Anthropic.ToolUseBlock;
    toolDefinition: Anthropic.Tool;
  };
  'tool:after': {
    toolUse: Anthropic.ToolUseBlock;
    result: unknown;
    duration: number;
  };
  'error:tool': {
    toolUse: Anthropic.ToolUseBlock;
    error: Error;
  };
  'error:message': {
    error: Error;
    messages: Anthropic.MessageParam[];
  };
}

type HookEvent = keyof HookContext;
type HookHandler<E extends HookEvent> = (
  context: HookContext[E]
) => Promise<void> | void;

interface Hook<E extends HookEvent = HookEvent> {
  name: string;
  priority: number;
  enabled: boolean;
  handler: HookHandler<E>;
  condition?: (context: HookContext[E]) => boolean;
}

// ===== Hook Manager =====

class HookManager {
  private hooks = new Map<HookEvent, Hook<any>[]>();
  private executionLog: Array<{
    event: string;
    timestamp: Date;
    duration: number;
  }> = [];

  /**
   * Hookを登録
   */
  register<E extends HookEvent>(
    event: E,
    name: string,
    handler: HookHandler<E>,
    options: {
      priority?: number;
      enabled?: boolean;
      condition?: (context: HookContext[E]) => boolean;
    } = {}
  ): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    const hook: Hook<E> = {
      name,
      priority: options.priority ?? 0,
      enabled: options.enabled ?? true,
      handler,
      condition: options.condition,
    };

    this.hooks.get(event)!.push(hook);
    this.sortHooks(event);
  }

  /**
   * Hookを無効化
   */
  disable(event: HookEvent, name: string): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      const hook = hooks.find(h => h.name === name);
      if (hook) hook.enabled = false;
    }
  }

  /**
   * Hookを有効化
   */
  enable(event: HookEvent, name: string): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      const hook = hooks.find(h => h.name === name);
      if (hook) hook.enabled = true;
    }
  }

  /**
   * Hookを実行
   */
  async emit<E extends HookEvent>(
    event: E,
    context: HookContext[E]
  ): Promise<void> {
    const startTime = Date.now();
    const hooks = this.hooks.get(event) || [];

    for (const hook of hooks) {
      if (!hook.enabled) continue;
      if (hook.condition && !hook.condition(context)) continue;

      try {
        await hook.handler(context);
      } catch (error) {
        console.error(`Hook error [${event}/${hook.name}]:`, error);
        // エラーを記録するが、続行
      }
    }

    const duration = Date.now() - startTime;
    this.executionLog.push({
      event,
      timestamp: new Date(),
      duration,
    });
  }

  /**
   * 実行ログを取得
   */
  getExecutionLog() {
    return [...this.executionLog];
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    const stats = new Map<string, { count: number; totalDuration: number }>();

    for (const log of this.executionLog) {
      const current = stats.get(log.event) || { count: 0, totalDuration: 0 };
      stats.set(log.event, {
        count: current.count + 1,
        totalDuration: current.totalDuration + log.duration,
      });
    }

    return Object.fromEntries(
      Array.from(stats.entries()).map(([event, data]) => [
        event,
        {
          count: data.count,
          avgDuration: data.totalDuration / data.count,
        },
      ])
    );
  }

  private sortHooks(event: HookEvent): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      hooks.sort((a, b) => b.priority - a.priority);
    }
  }
}

// ===== Hook統合エージェント =====

class HookedAgent {
  private client: Anthropic;
  private hooks: HookManager;
  private agentId: string;
  private tools: Map<string, Anthropic.Tool> = new Map();

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.hooks = new HookManager();
    this.agentId = Math.random().toString(36).substring(7);
  }

  /**
   * ツールを登録
   */
  registerTool(tool: Anthropic.Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Hookを登録
   */
  onHook<E extends HookEvent>(
    event: E,
    name: string,
    handler: HookHandler<E>,
    options?: {
      priority?: number;
      condition?: (context: HookContext[E]) => boolean;
    }
  ): void {
    this.hooks.register(event, name, handler, options);
  }

  /**
   * エージェントを初期化
   */
  async initialize(): Promise<void> {
    await this.hooks.emit('agent:init', { agentId: this.agentId });
  }

  /**
   * メッセージを処理
   */
  async processMessage(
    userMessage: string,
    model: string = 'claude-3-5-sonnet-20241022'
  ): Promise<Anthropic.Message> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    try {
      await this.hooks.emit('message:before', { messages, model });

      let response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        tools: Array.from(this.tools.values()),
        messages,
      });

      // ツール使用ループ
      while (response.stop_reason === 'tool_use') {
        const toolUses = response.content.filter(
          (block): block is Anthropic.ToolUseBlock =>
            block.type === 'tool_use'
        );

        messages.push({ role: 'assistant', content: response.content });

        for (const toolUse of toolUses) {
          const toolDef = this.tools.get(toolUse.name);
          if (!toolDef) continue;

          await this.hooks.emit('tool:before', {
            toolUse,
            toolDefinition: toolDef,
          });

          const startTime = Date.now();
          let result: unknown;
          let isError = false;

          try {
            result = await this.executeTool(toolUse);
          } catch (error) {
            isError = true;
            result = { error: (error as Error).message };
            await this.hooks.emit('error:tool', {
              toolUse,
              error: error as Error,
            });
          }

          const duration = Date.now() - startTime;

          await this.hooks.emit('tool:after', {
            toolUse,
            result,
            duration,
          });

          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
                is_error: isError,
              },
            ],
          });
        }

        response = await this.client.messages.create({
          model,
          max_tokens: 4096,
          tools: Array.from(this.tools.values()),
          messages,
        });
      }

      await this.hooks.emit('message:after', { messages, response });

      return response;
    } catch (error) {
      await this.hooks.emit('error:message', {
        error: error as Error,
        messages,
      });
      throw error;
    }
  }

  /**
   * ツールを実行（実装は省略、実際はツールごとに実装）
   */
  private async executeTool(toolUse: Anthropic.ToolUseBlock): Promise<unknown> {
    // 実際のツール実装
    return { success: true };
  }

  /**
   * エージェントをシャットダウン
   */
  async shutdown(): Promise<void> {
    await this.hooks.emit('agent:shutdown', { agentId: this.agentId });
  }

  /**
   * Hook統計を取得
   */
  getHookStats() {
    return this.hooks.getStats();
  }
}

// ===== 使用例 =====

async function main() {
  const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);

  // ロギングHook
  agent.onHook('message:before', 'logger', async (ctx) => {
    console.log('[LOG] Processing message...');
  });

  agent.onHook('message:after', 'logger', async (ctx) => {
    console.log('[LOG] Message processed');
  });

  // メトリクスHook
  const metrics = { toolCalls: 0, totalDuration: 0 };

  agent.onHook('tool:after', 'metrics', async (ctx) => {
    metrics.toolCalls++;
    metrics.totalDuration += ctx.duration;
    console.log(`[METRICS] Tool ${ctx.toolUse.name}: ${ctx.duration}ms`);
  });

  // エラーハンドリングHook
  agent.onHook('error:tool', 'error-handler', async (ctx) => {
    console.error(`[ERROR] Tool ${ctx.toolUse.name} failed:`, ctx.error);
  });

  // 初期化
  await agent.initialize();

  // メッセージ処理
  const response = await agent.processMessage('Hello!');

  console.log('\n=== Response ===');
  console.log(response.content);

  console.log('\n=== Metrics ===');
  console.log(metrics);

  console.log('\n=== Hook Stats ===');
  console.log(agent.getHookStats());

  await agent.shutdown();
}

export { HookManager, HookedAgent };
```

---

## 実用的な応用例

### 応用例1: ロギング・モニタリング

```typescript
import * as fs from 'fs';
import * as path from 'path';

class LoggingHooks {
  private logDir: string;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  register(agent: HookedAgent): void {
    // メッセージログ
    agent.onHook('message:before', 'message-logger', async (ctx) => {
      this.writeLog('messages', {
        timestamp: new Date().toISOString(),
        type: 'request',
        messages: ctx.messages,
      });
    });

    agent.onHook('message:after', 'message-logger', async (ctx) => {
      this.writeLog('messages', {
        timestamp: new Date().toISOString(),
        type: 'response',
        response: {
          id: ctx.response.id,
          model: ctx.response.model,
          stop_reason: ctx.response.stop_reason,
        },
      });
    });

    // ツール実行ログ
    agent.onHook('tool:after', 'tool-logger', async (ctx) => {
      this.writeLog('tools', {
        timestamp: new Date().toISOString(),
        tool: ctx.toolUse.name,
        duration: ctx.duration,
        success: true,
      });
    });

    // エラーログ
    agent.onHook('error:tool', 'error-logger', async (ctx) => {
      this.writeLog('errors', {
        timestamp: new Date().toISOString(),
        tool: ctx.toolUse.name,
        error: {
          message: ctx.error.message,
          stack: ctx.error.stack,
        },
      });
    });
  }

  private writeLog(category: string, data: unknown): void {
    const filename = path.join(
      this.logDir,
      `${category}-${new Date().toISOString().split('T')[0]}.jsonl`
    );

    fs.appendFileSync(filename, JSON.stringify(data) + '\n', 'utf8');
  }
}

// 使用例
const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);
const logging = new LoggingHooks('./logs');
logging.register(agent);
```

### 応用例2: レート制限・スロットリング

```typescript
class RateLimitHook {
  private callCounts = new Map<string, number[]>();
  private limits: { maxCalls: number; windowMs: number };

  constructor(maxCalls: number = 10, windowMs: number = 60000) {
    this.limits = { maxCalls, windowMs };
  }

  register(agent: HookedAgent): void {
    agent.onHook('tool:before', 'rate-limiter', async (ctx) => {
      const toolName = ctx.toolUse.name;
      const now = Date.now();

      // 古いエントリを削除
      const calls = this.callCounts.get(toolName) || [];
      const validCalls = calls.filter(
        time => now - time < this.limits.windowMs
      );

      if (validCalls.length >= this.limits.maxCalls) {
        throw new Error(
          `Rate limit exceeded for ${toolName}: ` +
          `${this.limits.maxCalls} calls per ${this.limits.windowMs}ms`
        );
      }

      validCalls.push(now);
      this.callCounts.set(toolName, validCalls);
    });
  }
}

// 使用例
const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);
const rateLimit = new RateLimitHook(5, 10000); // 10秒に5回まで
rateLimit.register(agent);
```

### 応用例3: キャッシング

```typescript
import crypto from 'crypto';

class CachingHook {
  private cache = new Map<string, { result: unknown; timestamp: number }>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  register(agent: HookedAgent): void {
    // キャッシュチェック
    agent.onHook(
      'tool:before',
      'cache-checker',
      async (ctx) => {
        const cacheKey = this.getCacheKey(ctx.toolUse);
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.ttl) {
          console.log(`[CACHE] Hit for ${ctx.toolUse.name}`);
          // キャッシュされた結果を使用する仕組みが必要
          // （この例では簡略化）
        }
      },
      { priority: 100 } // 高優先度で実行
    );

    // キャッシュ保存
    agent.onHook('tool:after', 'cache-saver', async (ctx) => {
      const cacheKey = this.getCacheKey(ctx.toolUse);
      this.cache.set(cacheKey, {
        result: ctx.result,
        timestamp: Date.now(),
      });
      console.log(`[CACHE] Saved for ${ctx.toolUse.name}`);
    });
  }

  private getCacheKey(toolUse: Anthropic.ToolUseBlock): string {
    const data = JSON.stringify({
      name: toolUse.name,
      input: toolUse.input,
    });
    return crypto.createHash('md5').update(data).digest('hex');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
      })),
    };
  }
}

// 使用例
const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);
const caching = new CachingHook(60); // 60秒のTTL
caching.register(agent);
```

### 応用例4: バリデーション

```typescript
import Ajv from 'ajv';

class ValidationHook {
  private ajv = new Ajv();
  private schemas = new Map<string, any>();

  addSchema(toolName: string, schema: any): void {
    this.schemas.set(toolName, schema);
  }

  register(agent: HookedAgent): void {
    agent.onHook('tool:before', 'input-validator', async (ctx) => {
      const schema = this.schemas.get(ctx.toolUse.name);
      if (!schema) return;

      const validate = this.ajv.compile(schema);
      const valid = validate(ctx.toolUse.input);

      if (!valid) {
        throw new Error(
          `Validation failed for ${ctx.toolUse.name}: ${
            JSON.stringify(validate.errors)
          }`
        );
      }

      console.log(`[VALIDATION] ✅ ${ctx.toolUse.name} passed`);
    });
  }
}

// 使用例
const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);
const validation = new ValidationHook();

validation.addSchema('get_weather', {
  type: 'object',
  properties: {
    location: { type: 'string', minLength: 1 },
    unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
  },
  required: ['location'],
});

validation.register(agent);
```

### 応用例5: メトリクス収集

```typescript
class MetricsHook {
  private metrics = {
    totalMessages: 0,
    totalTools: 0,
    toolDurations: new Map<string, number[]>(),
    errors: 0,
    startTime: Date.now(),
  };

  register(agent: HookedAgent): void {
    agent.onHook('message:after', 'message-counter', async () => {
      this.metrics.totalMessages++;
    });

    agent.onHook('tool:after', 'tool-metrics', async (ctx) => {
      this.metrics.totalTools++;

      const durations = this.metrics.toolDurations.get(ctx.toolUse.name) || [];
      durations.push(ctx.duration);
      this.metrics.toolDurations.set(ctx.toolUse.name, durations);
    });

    agent.onHook('error:tool', 'error-counter', async () => {
      this.metrics.errors++;
    });
  }

  getReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const toolStats = Array.from(this.metrics.toolDurations.entries()).map(
      ([tool, durations]) => ({
        tool,
        calls: durations.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      })
    );

    return {
      uptime: `${Math.floor(uptime / 1000)}s`,
      totalMessages: this.metrics.totalMessages,
      totalTools: this.metrics.totalTools,
      errors: this.metrics.errors,
      toolStats,
    };
  }
}

// 使用例
const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);
const metrics = new MetricsHook();
metrics.register(agent);

// ... エージェント実行 ...

console.log('\n=== Metrics Report ===');
console.log(JSON.stringify(metrics.getReport(), null, 2));
```

---

## ベストプラクティス

### 1. Hookは軽量に保つ

```typescript
// ❌ 悪い例: 重い処理をHookで実行
agent.onHook('tool:after', 'heavy-processing', async (ctx) => {
  // 大量のデータ処理（メイン処理をブロック）
  await processLargeDataset(ctx.result);
});

// ✅ 良い例: 非同期タスクキューに追加
agent.onHook('tool:after', 'queue-task', async (ctx) => {
  taskQueue.add(() => processLargeDataset(ctx.result));
});
```

### 2. エラーハンドリングを適切に

```typescript
// ✅ 良い例: Hookのエラーがメイン処理に影響しない
async emit<E extends HookEvent>(
  event: E,
  context: HookContext[E]
): Promise<void> {
  for (const hook of this.hooks.get(event) || []) {
    try {
      await hook.handler(context);
    } catch (error) {
      // ログを記録して続行
      console.error(`Hook error [${hook.name}]:`, error);
    }
  }
}
```

### 3. 条件付きHookを活用

```typescript
// 特定の条件でのみHookを実行
agent.onHook(
  'tool:before',
  'expensive-validation',
  async (ctx) => {
    await performExpensiveValidation(ctx);
  },
  {
    condition: (ctx) => ctx.toolUse.name === 'critical_operation',
  }
);
```

### 4. Hookの優先順位を適切に設定

```typescript
// 優先順位の高いHookから実行
agent.onHook('tool:before', 'cache-check', checkCache, { priority: 100 });
agent.onHook('tool:before', 'validation', validate, { priority: 50 });
agent.onHook('tool:before', 'logging', log, { priority: 10 });

// 実行順: cache-check → validation → logging
```

### 5. Hookのテストを書く

```typescript
describe('ValidationHook', () => {
  it('should validate tool input', async () => {
    const hook = new ValidationHook();
    hook.addSchema('test_tool', {
      type: 'object',
      properties: { value: { type: 'number' } },
      required: ['value'],
    });

    const context: HookContext['tool:before'] = {
      toolUse: {
        type: 'tool_use',
        id: '1',
        name: 'test_tool',
        input: { value: 123 },
      },
      toolDefinition: { name: 'test_tool', input_schema: {} },
    };

    // エラーが投げられないことを確認
    await expect(
      hook.handler(context)
    ).resolves.not.toThrow();
  });
});
```

---

## アーキテクチャパターン

### パターン1: Plugin Architecture

```typescript
interface Plugin {
  name: string;
  version: string;
  install: (agent: HookedAgent) => void | Promise<void>;
  uninstall?: (agent: HookedAgent) => void | Promise<void>;
}

class PluginManager {
  private plugins = new Map<string, Plugin>();

  async install(plugin: Plugin, agent: HookedAgent): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} already installed`);
    }

    await plugin.install(agent);
    this.plugins.set(plugin.name, plugin);
    console.log(`✅ Plugin ${plugin.name}@${plugin.version} installed`);
  }

  async uninstall(pluginName: string, agent: HookedAgent): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    if (plugin.uninstall) {
      await plugin.uninstall(agent);
    }

    this.plugins.delete(pluginName);
    console.log(`❌ Plugin ${pluginName} uninstalled`);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

// プラグイン例
const loggingPlugin: Plugin = {
  name: 'logging',
  version: '1.0.0',
  install: (agent) => {
    agent.onHook('message:before', 'log-request', async (ctx) => {
      console.log('[LOG] Request:', ctx.messages);
    });

    agent.onHook('message:after', 'log-response', async (ctx) => {
      console.log('[LOG] Response:', ctx.response.id);
    });
  },
};

// 使用例
const agent = new HookedAgent(process.env.ANTHROPIC_API_KEY!);
const pluginManager = new PluginManager();

await pluginManager.install(loggingPlugin, agent);
```

### パターン2: Event Bus Pattern

```typescript
type EventHandler = (data: any) => void | Promise<void>;

class EventBus {
  private listeners = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);

    // Unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  async emit(event: string, data: any): Promise<void> {
    const handlers = this.listeners.get(event) || [];
    await Promise.all(handlers.map(h => h(data)));
  }
}

// 使用例
const eventBus = new EventBus();

// リスナーを登録
const unsubscribe = eventBus.on('tool:executed', async (data) => {
  console.log('Tool executed:', data);
});

// イベントを発行
await eventBus.emit('tool:executed', { tool: 'get_weather', result: {} });

// リスナーを解除
unsubscribe();
```

### パターン3: Chain of Responsibility

```typescript
interface Handler<T = any> {
  handle(context: T): Promise<boolean>; // true = 処理継続, false = 中断
  setNext(handler: Handler<T>): Handler<T>;
}

abstract class BaseHandler<T = any> implements Handler<T> {
  private nextHandler?: Handler<T>;

  setNext(handler: Handler<T>): Handler<T> {
    this.nextHandler = handler;
    return handler;
  }

  async handle(context: T): Promise<boolean> {
    const shouldContinue = await this.process(context);

    if (shouldContinue && this.nextHandler) {
      return this.nextHandler.handle(context);
    }

    return shouldContinue;
  }

  protected abstract process(context: T): Promise<boolean>;
}

// 使用例
class ValidationHandler extends BaseHandler {
  protected async process(context: any): Promise<boolean> {
    console.log('Validating...');
    return context.isValid;
  }
}

class AuthHandler extends BaseHandler {
  protected async process(context: any): Promise<boolean> {
    console.log('Authenticating...');
    return context.isAuthenticated;
  }
}

class ExecutionHandler extends BaseHandler {
  protected async process(context: any): Promise<boolean> {
    console.log('Executing...');
    return true;
  }
}

// チェーン構築
const validation = new ValidationHandler();
const auth = new AuthHandler();
const execution = new ExecutionHandler();

validation.setNext(auth).setNext(execution);

// 実行
await validation.handle({
  isValid: true,
  isAuthenticated: true,
});
```

---

## まとめ

### Hook統合の主要なポイント

1. **型安全性**: TypeScriptの型システムを活用
2. **非侵入性**: メインロジックを変更せずに拡張
3. **柔軟性**: プライオリティ、条件、有効/無効化
4. **エラー分離**: Hookのエラーがシステムを壊さない
5. **パフォーマンス**: 軽量なHook、非同期処理

### 実装のチェックリスト

- ✅ 型安全なHookシステムを実装
- ✅ エラーハンドリングを適切に実装
- ✅ プライオリティ機能を追加
- ✅ 条件付きHook実行をサポート
- ✅ ロギング・メトリクスHookを実装
- ✅ テストを書く

### 次のステップ

1. 基本的なHookManagerを実装
2. ロギング・メトリクスHookを追加
3. プラグインシステムを構築
4. 本番環境で運用

---

**参考資料**

- [イベント駆動アーキテクチャ](https://martinfowler.com/articles/201701-event-driven.html)
- [Chain of Responsibility Pattern](https://refactoring.guru/design-patterns/chain-of-responsibility)
- [Middleware Pattern](https://expressjs.com/en/guide/using-middleware.html)

---

**最終更新**: 2025-10-25
**バージョン**: 1.0.0
