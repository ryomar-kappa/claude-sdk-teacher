# Agent Query Types - クイックスタート

## 概要

Anthropic Messages APIのクエリパラメータを**型安全**かつ**簡単**に構築するためのTypeScriptユーティリティです。

## クイックスタート

### インストール

```bash
npm install @anthropic-ai/sdk dotenv
```

### 基本的な使い方

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentQueryBuilder } from './agent-query-types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fluent APIでクエリを構築
const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(2048)
  .setSystemPrompt('あなたは親切なアシスタントです。')
  .addUserMessage('こんにちは、Claude!')
  .build();

// APIを呼び出し
const response = await client.messages.create(query);
```

## 主な機能

### 1. ヘルパー関数

```typescript
import { createSimpleQuery } from './agent-query-types';

// 1行でクエリを作成
const query = createSimpleQuery('こんにちは');
const response = await client.messages.create(query);
```

### 2. ビルダーパターン

```typescript
const query = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(1024)
  .setTemperature(0.7)
  .addUserMessage('TypeScriptについて教えて')
  .build();
```

### 3. ツールの使用

```typescript
const weatherTool: Anthropic.Tool = {
  name: 'get_weather',
  description: '天気情報を取得',
  input_schema: {
    type: 'object',
    properties: {
      location: { type: 'string' }
    },
    required: ['location']
  }
};

const query = new AgentQueryBuilder()
  .addUserMessage('東京の天気は?')
  .addTool(weatherTool)
  .build();
```

### 4. 会話履歴

```typescript
const query = new AgentQueryBuilder()
  .addUserMessage('私の名前は太郎です')
  .addAssistantMessage('こんにちは、太郎さん!')
  .addUserMessage('私の名前を覚えてる?')
  .build();
```

### 5. ビルダーの再利用

```typescript
// ベース設定を定義
const baseBuilder = new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .setMaxTokens(2048)
  .setSystemPrompt('あなたはプログラミング教師です');

// 複数のクエリで再利用
const query1 = baseBuilder.clone().addUserMessage('Rustとは?').build();
const query2 = baseBuilder.clone().addUserMessage('Goとは?').build();
```

## サンプルコードの実行

```bash
# TypeScriptをコンパイル
npx tsc

# サンプルを実行
node dist/agent-query-example.js

# または直接実行
npx ts-node src/agent-query-example.ts
```

## ファイル構成

```
src/
├── agent-query-types.ts      # 型定義とビルダークラス
├── agent-query-example.ts    # 7つの使用例
└── ...

docs/
├── agent-query-guide-ja.md   # 詳細ガイド（日本語）
└── agent-query-readme-ja.md  # このファイル
```

## 使用例一覧

`agent-query-example.ts` には以下の例が含まれています：

1. **example1_simpleQuery** - シンプルなクエリ
2. **example2_builderPattern** - ビルダーパターン
3. **example3_systemPrompt** - システムプロンプト
4. **example4_toolUse** - ツールの使用
5. **example5_conversationHistory** - 会話履歴
6. **example6_advancedSettings** - 詳細設定
7. **example7_builderReuse** - ビルダーの再利用

## API リファレンス（抜粋）

### AgentQueryBuilder メソッド

| メソッド | 説明 |
|---------|------|
| `setModel(model)` | モデルを設定 |
| `setMaxTokens(maxTokens)` | 最大トークン数を設定 |
| `setSystemPrompt(system)` | システムプロンプトを設定 |
| `addUserMessage(content)` | ユーザーメッセージを追加 |
| `addAssistantMessage(content)` | アシスタントメッセージを追加 |
| `addTool(tool)` | ツールを追加 |
| `setTemperature(temp)` | 温度を設定 (0.0-1.0) |
| `build()` | クエリを構築 |
| `clone()` | ビルダーをクローン |

### ヘルパー関数

- `createSimpleQuery(message)` - シンプルなクエリ
- `createToolQuery(message, tools)` - ツール使用クエリ
- `createSystemQuery(system, message)` - システムプロンプト付き

## パラメータ推奨値

### Model（モデル）
- `claude-3-5-sonnet-20241022` - 推奨（最新・高性能）
- `claude-3-opus-20240229` - 最高品質
- `claude-3-haiku-20240307` - 高速・低コスト

### MaxTokens（最大トークン数）
- 短い応答: `1024`
- 標準: `2048 - 4096`
- 長い応答: `8192+`

### Temperature（温度）
- 決定論的: `0.0 - 0.3` （コード生成、分析）
- バランス: `0.7 - 0.9` （一般会話）
- 創造的: `0.9 - 1.0` （ストーリー生成）

## トラブルシューティング

### エラー: "model is required"

```typescript
// ❌ エラー
new AgentQueryBuilder().build();

// ✅ 正しい
new AgentQueryBuilder()
  .setModel('claude-3-5-sonnet-20241022')
  .build();
```

### エラー: "messages are required"

```typescript
// ❌ エラー
new AgentQueryBuilder().setModel('...').build();

// ✅ 正しい
new AgentQueryBuilder()
  .setModel('...')
  .addUserMessage('こんにちは')
  .build();
```

## 詳細ドキュメント

詳しい使い方は [agent-query-guide-ja.md](./agent-query-guide-ja.md) を参照してください。

- API完全リファレンス
- ツール使用の詳細
- ベストプラクティス
- エラーハンドリング
- より多くの例

## ライセンス

このプロジェクトのライセンスに従います。
