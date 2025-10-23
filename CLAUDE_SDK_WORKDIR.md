# Claude SDKで実行ディレクトリと違うディレクトリで作業させる方法

Claude Agent SDKを使用する際に、エージェントを特定のディレクトリで作業させる実装方法を解説します。

## 目次

1. [概要](#概要)
2. [基本的な実装方法](#基本的な実装方法)
3. [サンドボックス化された安全な実装](#サンドボックス化された安全な実装)
4. [使用例](#使用例)
5. [ベストプラクティス](#ベストプラクティス)

---

## 概要

### 問題

デフォルトでは、Node.jsのファイル操作は `process.cwd()` を基準に実行されます。しかし、Claude Agentに以下のような要件がある場合があります：

- ✅ 特定の作業ディレクトリでのみファイル操作を許可したい
- ✅ 実行ディレクトリとは異なる場所で作業させたい
- ✅ セキュリティのため、作業ディレクトリ外へのアクセスを防ぎたい
- ✅ 複数のエージェントを異なるディレクトリで動かしたい

### 解決方法

`SandboxedFileSystem` クラスを使って、固定された作業ディレクトリ内でのみ動作するファイル操作システムを実装します。

---

## 基本的な実装方法

### ステップ1: ファイルシステムクラスの作成

```typescript
import * as path from 'path';
import * as fs from 'fs';

class SandboxedFileSystem {
  private workDir: string;

  constructor(workDir: string) {
    // 絶対パスに解決
    this.workDir = path.isAbsolute(workDir)
      ? workDir
      : path.resolve(process.cwd(), workDir);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
    }
  }

  private resolvePath(relativePath: string): string {
    return path.resolve(this.workDir, relativePath);
  }

  readFile(relativePath: string): string {
    const fullPath = this.resolvePath(relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  writeFile(relativePath: string, content: string): void {
    const fullPath = this.resolvePath(relativePath);
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}
```

### ステップ2: Claudeツールの定義

```typescript
import Anthropic from '@anthropic-ai/sdk';

const tools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: '指定されたファイルを読み込みます',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '作業ディレクトリからの相対パス',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'ファイルに内容を書き込みます',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '作業ディレクトリからの相対パス',
        },
        content: {
          type: 'string',
          description: '書き込む内容',
        },
      },
      required: ['path', 'content'],
    },
  },
];
```

### ステップ3: ツール実行関数

```typescript
const fileSystem = new SandboxedFileSystem('/tmp/agent-workspace');

function executeTool(toolName: string, input: any): any {
  switch (toolName) {
    case 'read_file':
      const content = fileSystem.readFile(input.path);
      return { success: true, content };

    case 'write_file':
      fileSystem.writeFile(input.path, input.content);
      return { success: true };

    default:
      return { success: false, error: 'Unknown tool' };
  }
}
```

### ステップ4: エージェント実行

```typescript
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runAgent(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools: tools,
    messages,
  });

  // ツール使用ループ
  while (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) break;

    // ツールを実行
    const result = executeTool(toolUse.name, toolUse.input);

    // 結果を履歴に追加
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        },
      ],
    });

    // 次の応答を取得
    response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools: tools,
      messages,
    });
  }

  return response;
}
```

---

## サンドボックス化された安全な実装

セキュリティを強化した実装では、以下のチェックを追加します：

### セキュリティチェック機能

```typescript
class SandboxedFileSystem {
  private workDir: string;
  private allowedExtensions: string[];

  constructor(workDir: string, allowedExtensions: string[] = ['.txt', '.json', '.md']) {
    this.workDir = path.resolve(workDir);
    this.allowedExtensions = allowedExtensions;
  }

  // パストラバーサル攻撃を防ぐ
  private isPathSafe(filePath: string): boolean {
    const absolutePath = this.resolvePath(filePath);
    const normalizedPath = path.normalize(absolutePath);
    const normalizedWorkDir = path.normalize(this.workDir);
    return normalizedPath.startsWith(normalizedWorkDir);
  }

  // 許可された拡張子のみを許可
  private isExtensionAllowed(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  readFile(relativePath: string): { success: boolean; content?: string; error?: string } {
    const fullPath = this.resolvePath(relativePath);

    if (!this.isPathSafe(fullPath)) {
      return {
        success: false,
        error: 'パスが作業ディレクトリ外を指しています',
      };
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'ファイルが存在しません' };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return { success: true, content };
  }

  writeFile(relativePath: string, content: string): { success: boolean; error?: string } {
    const fullPath = this.resolvePath(relativePath);

    if (!this.isPathSafe(fullPath)) {
      return {
        success: false,
        error: 'パスが作業ディレクトリ外を指しています',
      };
    }

    if (!this.isExtensionAllowed(fullPath)) {
      return {
        success: false,
        error: `許可されていない拡張子: ${path.extname(relativePath)}`,
      };
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    return { success: true };
  }
}
```

---

## 使用例

### 例1: 基本的な使用

```typescript
import { SandboxedClaudeAgent } from './sandboxed-agent';

const agent = new SandboxedClaudeAgent(
  process.env.ANTHROPIC_API_KEY!,
  '/tmp/my-workspace'  // ← ここで作業ディレクトリを指定
);

const result = await agent.run(
  'hello.txt というファイルを作成して、「Hello, World!」と書き込んでください。'
);

console.log(result);
```

### 例2: 環境変数で作業ディレクトリを指定

```bash
# .env ファイル
CLAUDE_WORK_DIR=/home/user/agent-workspace
ANTHROPIC_API_KEY=your-api-key
```

```typescript
import * as dotenv from 'dotenv';

dotenv.config();

const workDir = process.env.CLAUDE_WORK_DIR || '/tmp/claude-workspace';
const agent = new SandboxedClaudeAgent(
  process.env.ANTHROPIC_API_KEY!,
  workDir
);
```

### 例3: 複数のエージェントを異なるディレクトリで実行

```typescript
// エージェント1: /tmp/workspace-a で作業
const agent1 = new SandboxedClaudeAgent(
  apiKey,
  '/tmp/workspace-a'
);

// エージェント2: /tmp/workspace-b で作業
const agent2 = new SandboxedClaudeAgent(
  apiKey,
  '/tmp/workspace-b'
);

// 並列実行
await Promise.all([
  agent1.run('data.txt を作成してください'),
  agent2.run('report.txt を作成してください'),
]);
```

### 例4: プロジェクトルートの特定ディレクトリで作業

```typescript
import * as path from 'path';

// 現在のスクリプトから見たプロジェクトルート
const projectRoot = path.resolve(__dirname, '..');
const workDir = path.join(projectRoot, 'agent-data');

const agent = new SandboxedClaudeAgent(apiKey, workDir);
```

---

## ベストプラクティス

### 1. ✅ 常に絶対パスを使用

```typescript
// ✅ 良い例
const workDir = path.resolve('/tmp/workspace');

// ⚠️ 避けるべき
const workDir = './workspace';  // process.cwd() に依存
```

### 2. ✅ セキュリティチェックを実装

```typescript
// パストラバーサル攻撃を防ぐ
if (!isPathSafe(filePath)) {
  throw new Error('不正なパス');
}

// 許可された拡張子のみを許可
const allowedExtensions = ['.txt', '.json', '.md', '.csv'];
```

### 3. ✅ エラーハンドリング

```typescript
try {
  const result = fileSystem.readFile('data.txt');
  if (!result.success) {
    console.error('エラー:', result.error);
  }
} catch (error) {
  console.error('予期しないエラー:', error);
}
```

### 4. ✅ ログ出力

```typescript
console.log('作業ディレクトリ:', fileSystem.getWorkDir());
console.log('ファイル読み込み:', filePath);
```

### 5. ✅ ディレクトリの自動作成

```typescript
if (!fs.existsSync(workDir)) {
  fs.mkdirSync(workDir, { recursive: true });
}
```

### 6. ⚠️ 避けるべきパターン

```typescript
// ❌ process.chdir() を使う（プロセス全体に影響）
process.chdir('/tmp/workspace');
const data = fs.readFileSync('data.txt');  // 危険

// ✅ 代わりに固定ディレクトリクラスを使う
const fs = new SandboxedFileSystem('/tmp/workspace');
const data = fs.readFile('data.txt');
```

---

## 実装例の実行

### デモを実行

```bash
# デフォルトの作業ディレクトリ (/tmp/claude-workspace) で実行
npm run demo:sandboxed

# カスタム作業ディレクトリで実行
CLAUDE_WORK_DIR=/home/user/my-workspace npm run demo:sandboxed

# 作業ディレクトリの内容を確認
ls -la /tmp/claude-workspace
```

### コマンドライン引数で指定

```bash
# package.json
{
  "scripts": {
    "agent": "ts-node src/sandboxed-agent.ts"
  }
}

# 実行
npm run agent
```

---

## まとめ

### Claude SDKで固定ディレクトリで作業させる方法

| 方法 | メリット | デメリット |
|------|---------|-----------|
| **SandboxedFileSystemクラス** | ✅ 安全<br>✅ 柔軟<br>✅ テスト可能 | 実装が必要 |
| 環境変数 | ✅ 設定の外部化<br>✅ 簡単 | ドキュメント必須 |
| process.chdir() | ✅ シンプル | ❌ プロセス全体に影響<br>❌ 非推奨 |

### 推奨アプローチ

1. **`SandboxedFileSystem`クラス**を実装（最も安全）
2. 環境変数で作業ディレクトリを設定可能にする
3. セキュリティチェック（パストラバーサル、拡張子制限）を追加
4. エラーハンドリングとログ出力を実装

### サンプルコード

完全な実装は `src/sandboxed-agent.ts` を参照してください。

```bash
# サンプルを実行
npm run demo:sandboxed
```

---

**関連ドキュメント:**
- [WORKING_DIRECTORY_GUIDE.md](./WORKING_DIRECTORY_GUIDE.md) - Node.jsの作業ディレクトリ完全ガイド
- [TOOLS_CATALOG.md](./TOOLS_CATALOG.md) - Claudeツールカタログ
