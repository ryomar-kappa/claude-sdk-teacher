# Agent Query Types ガイド

## 概要

`agent-query-types.ts`は、Anthropic Messages APIへのクエリパラメータを**型安全**かつ**簡単**に構築するためのユーティリティです。

### 主な機能

- **型安全性**: TypeScriptの型システムを活用し、コンパイル時にエラーを検出
- **Fluent API**: メソッドチェーンによる直感的なクエリ構築
- **ヘルパー関数**: よくあるパターンを簡単に実装できるユーティリティ関数
- **再利用性**: ビルダーパターンによる設定の再利用

## インストールと設定

### 前提条件

```bash
npm install @anthropic-ai/sdk dotenv
```

### 環境変数の設定

`.env`ファイルを作成し、APIキーを設定します：

```env
ANTHROPIC_API_KEY=your-api-key-here
```

## 基本的な使い方

### 1. シンプルなクエリ

最も簡単な方法は、`createSimpleQuery()`ヘルパー関数を使用することです。

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createSimpleQuery } from './agent-query-types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// シンプルなクエリを作成
const query = createSimpleQuery('こんにちは、Claude!');

// APIを呼び出し
const response = await client.messages.create(query);
```

### 2. AgentQueryBuilderを使用した詳細設定

より詳細な制御が必要な場合は、`AgentQueryBuilder`クラスを使用します。

```typescript
import { AgentQueryBuilder } from './agent-query-types';

const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(2048)
  .setSystemPrompt('あなたは親切なアシスタントです。')
  .setTemperature(0.7)
  .addUserMessage('TypeScriptについて教えてください')
  .build();

const response = await client.messages.create(query);
```

## 使用例

### 例1: システムプロンプト付きクエリ

```typescript
import { createSystemQuery } from './agent-query-types';

const query = createSystemQuery(
  'あなたは経験豊富なソフトウェアエンジニアです。', // システムプロンプト
  'コードレビューのベストプラクティスを教えてください' // ユーザーメッセージ
);

const response = await client.messages.create(query);
```

### 例2: ツールを使用したクエリ

```typescript
import { AgentQueryBuilder } from './agent-query-types';

// ツール定義
const weatherTool: Anthropic.Tool = {
  name: 'get_weather',
  description: '指定された場所の天気情報を取得します',
  input_schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '場所の名前',
      },
    },
    required: ['location'],
  },
};

// ツールを含むクエリを構築
const query = new AgentQueryBuilder()
  .setSystemPrompt('あなたは天気を教えるアシスタントです。')
  .addUserMessage('東京の天気を教えてください')
  .addTool(weatherTool)
  .build();

const response = await client.messages.create(query);

// ツールが使用されたかチェック
const toolUse = response.content.find(
  (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
);

if (toolUse) {
  console.log('ツール名:', toolUse.name);
  console.log('入力:', toolUse.input);
}
```

### 例3: 会話履歴を保持したクエリ

```typescript
import { AgentQueryBuilder } from './agent-query-types';

// 初回の会話
const query1 = new AgentQueryBuilder()
  .addUserMessage('私の名前は太郎です。')
  .build();

const response1 = await client.messages.create(query1);

// 会話履歴を保持して次のメッセージ
const query2 = new AgentQueryBuilder()
  .addUserMessage('私の名前は太郎です。')
  .addAssistantMessage(response1.content) // 前回の応答を追加
  .addUserMessage('私の名前を覚えていますか?')
  .build();

const response2 = await client.messages.create(query2);
```

### 例4: 詳細なパラメータ設定

```typescript
const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(1024)
  .setTemperature(0.5) // より決定論的な応答
  .setTopP(0.9) // Nucleus sampling
  .setTopK(50) // Top-K sampling
  .setStopSequences(['\n\n---\n\n']) // カスタム停止シーケンス
  .addUserMessage('機械学習について簡潔に説明してください')
  .build();
```

### 例5: ビルダーの再利用

同じ設定を複数のクエリで使い回す場合：

```typescript
// ベースとなるビルダーを作成
const baseBuilder = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(1024)
  .setSystemPrompt('あなたはプログラミング教師です。')
  .setTemperature(0.7);

// クローンして異なるクエリを作成
const query1 = baseBuilder.clone()
  .addUserMessage('Rustの特徴を教えて')
  .build();

const query2 = baseBuilder.clone()
  .addUserMessage('Goの特徴を教えて')
  .build();

// 並列実行
const [response1, response2] = await Promise.all([
  client.messages.create(query1),
  client.messages.create(query2),
]);
```

## API リファレンス

### AgentQueryBuilder

#### コンストラクタ

```typescript
new AgentQueryBuilder(initialQuery?: Partial<AgentQuery>)
```

#### メソッド一覧

| メソッド | 説明 | 戻り値 |
|---------|------|--------|
| `setModel(model: string)` | 使用するモデルを設定 | `this` |
| `setMaxTokens(maxTokens: number)` | 最大トークン数を設定 | `this` |
| `setSystemPrompt(system: string)` | システムプロンプトを設定 | `this` |
| `setMessages(messages: MessageParam[])` | メッセージ履歴を設定（上書き） | `this` |
| `addMessage(role, content)` | メッセージを追加 | `this` |
| `addUserMessage(content: string)` | ユーザーメッセージを追加 | `this` |
| `addAssistantMessage(content)` | アシスタントメッセージを追加 | `this` |
| `setTools(tools: Tool[])` | ツールを設定 | `this` |
| `addTool(tool: Tool)` | ツールを追加 | `this` |
| `setToolChoice(toolChoice: ToolChoice)` | ツール選択方法を設定 | `this` |
| `setTemperature(temperature: number)` | 温度パラメータを設定（0.0-1.0） | `this` |
| `enableStreaming()` | ストリーミングを有効化 | `this` |
| `setTopP(topP: number)` | Top-pサンプリングを設定 | `this` |
| `setTopK(topK: number)` | Top-kサンプリングを設定 | `this` |
| `setStopSequences(sequences: string[])` | 停止シーケンスを設定 | `this` |
| `setThinking(thinking)` | 拡張思考設定 | `this` |
| `setMetadata(metadata)` | メタデータを設定 | `this` |
| `build()` | クエリパラメータを構築 | `MessageCreateParams` |
| `clone()` | ビルダーをクローン | `AgentQueryBuilder` |

### ヘルパー関数

#### createSimpleQuery()

シンプルなクエリを作成します。

```typescript
function createSimpleQuery(
  userMessage: string,
  options?: Partial<AgentQueryOptions>
): MessageCreateParamsNonStreaming
```

**使用例:**

```typescript
const query = createSimpleQuery('こんにちは');
```

#### createToolQuery()

ツール使用クエリを作成します。

```typescript
function createToolQuery(
  userMessage: string,
  tools: Tool[],
  previousMessages?: MessageParam[],
  options?: Partial<AgentQueryOptions>
): MessageCreateParamsNonStreaming
```

**使用例:**

```typescript
const query = createToolQuery(
  '天気を調べて',
  [weatherTool],
  previousMessages
);
```

#### createSystemQuery()

システムプロンプト付きクエリを作成します。

```typescript
function createSystemQuery(
  systemPrompt: string,
  userMessage: string,
  options?: Partial<AgentQueryOptions>
): MessageCreateParamsNonStreaming
```

**使用例:**

```typescript
const query = createSystemQuery(
  'あなたは親切なアシスタントです',
  'こんにちは'
);
```

## 型定義

### AgentQueryBase

必須パラメータの型定義：

```typescript
interface AgentQueryBase {
  model: string;           // 使用するモデル
  maxTokens: number;       // 最大トークン数
  messages: MessageParam[]; // メッセージ履歴
}
```

### AgentQueryOptions

オプションパラメータの型定義：

```typescript
interface AgentQueryOptions {
  system?: string | TextBlockParam[];  // システムプロンプト
  tools?: Tool[];                      // ツール定義
  toolChoice?: ToolChoice;             // ツール選択方法
  temperature?: number;                // 温度（0.0-1.0）
  stream?: boolean;                    // ストリーミング
  topP?: number;                       // Top-p サンプリング
  topK?: number;                       // Top-k サンプリング
  stopSequences?: string[];            // 停止シーケンス
  thinking?: ThinkingConfigParam;      // 拡張思考設定
  metadata?: Metadata;                 // メタデータ
}
```

### AgentQuery

完全なクエリの型定義：

```typescript
type AgentQuery = AgentQueryBase & AgentQueryOptions;
```

## デフォルト設定

```typescript
const DEFAULT_AGENT_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 1.0,
} as const;
```

## パラメータガイド

### model（モデル）

使用するClaudeモデルを指定します。

**推奨モデル:**
- `claude-3-5-sonnet-20241022` - 最新かつ最も高性能
- `claude-3-opus-20240229` - 最高品質（高コスト）
- `claude-3-haiku-20240307` - 高速・低コスト

### maxTokens（最大トークン数）

生成する最大トークン数を指定します。

**推奨値:**
- 短い応答: `1024`
- 標準的な応答: `2048` - `4096`
- 長い応答: `8192` 以上

### temperature（温度）

応答のランダム性を制御します（0.0 - 1.0）。

**推奨値:**
- `0.0 - 0.3`: 決定論的な応答（コード生成、分析など）
- `0.7 - 0.9`: バランスの取れた応答（一般的な会話）
- `0.9 - 1.0`: 創造的な応答（ストーリー生成など）

### topP & topK

サンプリングパラメータです。

**topP (Nucleus Sampling):**
- 累積確率がこの値に達するまでのトークンから選択
- 推奨値: `0.9` - `0.95`

**topK:**
- 上位K個のトークンから選択
- 推奨値: `40` - `50`

## ツールの使用

### ツール定義の例

```typescript
const calculatorTool: Anthropic.Tool = {
  name: 'calculator',
  description: '数学的な計算を実行します',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: '実行する演算',
      },
      a: { type: 'number', description: '1つ目の数値' },
      b: { type: 'number', description: '2つ目の数値' },
    },
    required: ['operation', 'a', 'b'],
  },
};
```

### ツールの実行フロー

1. **ツールを含むクエリを送信**
2. **応答からツール使用をチェック**
3. **ツールを実行**
4. **結果を含む新しいクエリを送信**

```typescript
// 1. ツールを含むクエリ
const query1 = new AgentQueryBuilder()
  .addUserMessage('123 + 456 を計算してください')
  .addTool(calculatorTool)
  .build();

const response1 = await client.messages.create(query1);

// 2. ツール使用をチェック
const toolUse = response1.content.find(
  (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
);

if (toolUse) {
  // 3. ツールを実行
  const input = toolUse.input as { operation: string; a: number; b: number };
  const result = input.a + input.b; // 実際の計算

  // 4. 結果を返す
  const query2 = new AgentQueryBuilder()
    .setMessages([
      { role: 'user', content: '123 + 456 を計算してください' },
      { role: 'assistant', content: response1.content },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ result }),
          },
        ],
      },
    ])
    .addTool(calculatorTool)
    .build();

  const response2 = await client.messages.create(query2);
}
```

## ベストプラクティス

### 1. システムプロンプトを活用する

明確なシステムプロンプトを設定することで、より一貫した応答が得られます。

```typescript
const query = new AgentQueryBuilder()
  .setSystemPrompt(`
    あなたは経験豊富なTypeScriptエンジニアです。
    - コードは常にTypeScriptで記述してください
    - 型安全性を重視してください
    - ベストプラクティスに従ってください
  `)
  .addUserMessage('ユーザー認証機能を実装してください')
  .build();
```

### 2. 会話履歴を保持する

複数ターンの会話では、履歴を保持することが重要です。

```typescript
const messages: Anthropic.MessageParam[] = [];

// 1回目
messages.push({ role: 'user', content: 'こんにちは' });
const response1 = await client.messages.create(
  new AgentQueryBuilder().setMessages(messages).build()
);
messages.push({ role: 'assistant', content: response1.content });

// 2回目（履歴付き）
messages.push({ role: 'user', content: '前回の続きをお願いします' });
const response2 = await client.messages.create(
  new AgentQueryBuilder().setMessages(messages).build()
);
```

### 3. エラーハンドリング

API呼び出しは必ずtry-catchで囲みます。

```typescript
try {
  const query = new AgentQueryBuilder()
    .addUserMessage('こんにちは')
    .build();

  const response = await client.messages.create(query);
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    console.error('APIエラー:', error.status, error.message);
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

### 4. トークン使用量の監視

コストを管理するため、トークン使用量を監視します。

```typescript
const response = await client.messages.create(query);

console.log('使用トークン:');
console.log('- 入力:', response.usage.input_tokens);
console.log('- 出力:', response.usage.output_tokens);
console.log('- 合計:', response.usage.input_tokens + response.usage.output_tokens);
```

### 5. ビルダーの再利用でコードを簡潔に

共通設定はベースビルダーとして定義します。

```typescript
// 共通設定
const baseBuilder = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(2048)
  .setSystemPrompt('あなたは親切なアシスタントです。');

// 各クエリで再利用
const query1 = baseBuilder.clone().addUserMessage('質問1').build();
const query2 = baseBuilder.clone().addUserMessage('質問2').build();
```

## トラブルシューティング

### エラー: "model is required"

`build()`を呼ぶ前に、必ず`setModel()`を呼んでください。

```typescript
// ❌ エラー
const query = new AgentQueryBuilder()
  .addUserMessage('こんにちは')
  .build(); // エラー: model is required

// ✅ 正しい
const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .addUserMessage('こんにちは')
  .build();
```

### エラー: "messages are required"

少なくとも1つのメッセージを追加する必要があります。

```typescript
// ❌ エラー
const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .build(); // エラー: messages are required

// ✅ 正しい
const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .addUserMessage('こんにちは')
  .build();
```

### APIレート制限エラー

リクエストが多すぎる場合、レート制限に達することがあります。

```typescript
// リトライロジックの実装例
async function createMessageWithRetry(query: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.messages.create(query);
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 1000; // エクスポネンシャルバックオフ
        console.log(`レート制限。${waitTime}ms待機中...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

## 実行方法

### サンプルコードの実行

```bash
# TypeScriptをコンパイル
npx tsc

# 例を実行
node dist/agent-query-example.js
```

または、直接実行：

```bash
npx ts-node src/agent-query-example.ts
```

### 個別の例を実行

`agent-query-example.ts`の`main()`関数で、実行したい例のコメントアウトを解除してください：

```typescript
async function main() {
  try {
    await example1_simpleQuery();      // これを実行
    // await example2_builderPattern(); // これはスキップ
    // await example3_systemPrompt();   // これもスキップ
  } catch (error) {
    console.error('エラー:', error);
  }
}
```

## まとめ

`agent-query-types`モジュールを使用することで：

- **型安全性**: コンパイル時にエラーを検出
- **可読性**: Fluent APIによる直感的なコード
- **保守性**: 設定の再利用と一元管理
- **生産性**: ヘルパー関数による迅速な開発

これらのメリットにより、Anthropic APIを使用したアプリケーション開発がより簡単かつ安全になります。

## 参考リンク

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude Models](https://docs.anthropic.com/claude/docs/models-overview)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## ライセンス

このプロジェクトのライセンスに従います。
