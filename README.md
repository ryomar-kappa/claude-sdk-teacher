# Claude Agent SDK 教材プロジェクト

Claude Agent SDKを使用したTypeScript実装例と包括的なツールカタログを提供するプロジェクトです。

## 📚 プロジェクト構成

```
claude-sdk-teacher/
├── src/
│   ├── index.ts           # Claude APIの基本例
│   ├── agent-example.ts   # Tool Useの実装例
│   ├── todo-manager.ts    # Todoマネージャー実装
│   ├── todo-agent.ts      # Todoツール統合エージェント
│   └── workdir-example.ts # 作業ディレクトリ制御の実装例
├── TOOLS_CATALOG.md           # ツールカタログ（813行）
├── TODO_TOOL_GUIDE.md         # TodoWriteツール完全ガイド
├── WORKING_DIRECTORY_GUIDE.md # 作業ディレクトリ完全ガイド
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 クイックスタート

### 1. セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd claude-sdk-teacher

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してANTHROPIC_API_KEYを設定
```

### 2. 基本例を実行

```bash
# シンプルな会話例
npm run dev

# ツール使用例（天気取得）
npx ts-node src/agent-example.ts

# Todoツール付きエージェント
npx ts-node src/todo-agent.ts "Webアプリケーションを作成してください"

# 作業ディレクトリ制御のデモ
npm run demo:workdir
```

## 📖 ドキュメント

### [TOOLS_CATALOG.md](./TOOLS_CATALOG.md)
Claude Agent SDKで利用可能なツールの完全なリファレンス

**内容:**
- ツールの型定義（Tool, ToolChoice, ToolUseBlock, ToolResultBlockParam）
- 8つの実装例（天気、DB、計算、ファイル、Web検索、日時、JSON、連携）
- ベストプラクティスとパターン

### [TODO_TOOL_GUIDE.md](./TODO_TOOL_GUIDE.md)
TodoWriteツールの完全実装ガイド

**内容:**
- ツール仕様と詳細説明
- 完全な実装コード
- 使用例とパターン
- 拡張機能（優先順位、サブタスク、依存関係）
- ベストプラクティス

### [WORKING_DIRECTORY_GUIDE.md](./WORKING_DIRECTORY_GUIDE.md)
Node.js/ts-nodeの作業ディレクトリ制御完全ガイド

**内容:**
- Node.jsの作業ディレクトリの仕組み（process.cwd(), __dirname, etc.）
- ts-nodeでの作業ディレクトリ制御方法（--cwd, --cwdMode, TS_NODE_CWD）
- 固定ディレクトリで作業させる方法（FixedDirectoryWorkerクラス）
- ベストプラクティスと実装パターン
- Claude Agent SDKでの活用例

## 🔧 実装例

### 1. 基本的なClaude API使用

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'こんにちは！' }],
});

console.log(message.content);
```

### 2. Tool Use（ツール使用）

```typescript
const tools: Anthropic.Tool[] = [{
  name: 'get_weather',
  description: '天気情報を取得します',
  input_schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: '場所' }
    },
    required: ['location']
  }
}];

const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: tools,
  messages: [{ role: 'user', content: '東京の天気は？' }]
});
```

### 3. Todoツール付きエージェント

```typescript
import { runAgentWithTodos } from './src/todo-agent';

// エージェントを実行
const manager = await runAgentWithTodos(
  'Reactアプリケーションをセットアップして、基本的なコンポーネントを作成してください'
);

// タスクの進捗を確認
const stats = manager.getStats();
console.log(`進捗: ${stats.completed}/${stats.total}`);
```

## 🎯 主な機能

### 1. Claude APIの基本機能
- ✅ シンプルなメッセージ送信
- ✅ 会話履歴の管理
- ✅ システムプロンプトの使用
- ✅ ストリーミングレスポンス

### 2. Tool Use（Function Calling）
- ✅ ツール定義とスキーマ
- ✅ ツール実行ループ
- ✅ エラーハンドリング
- ✅ 並列ツール実行

### 3. タスク管理（TodoWrite）
- ✅ タスクの作成・更新・完了
- ✅ 進捗状況の可視化
- ✅ 状態管理とバリデーション
- ✅ ファイル永続化

## 📦 依存関係

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^20.11.19",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2"
  }
}
```

## 🛠️ 開発

### TypeScriptをビルド

```bash
npm run build
```

### ビルド済みファイルを実行

```bash
npm start
```

### 開発モードで実行

```bash
npm run dev
```

## 📝 コード例

### シンプルな会話

`src/index.ts` には以下の例が含まれています：

1. **simpleExample()**: 基本的なメッセージ送信
2. **conversationExample()**: 会話履歴の保持
3. **systemPromptExample()**: システムプロンプトの使用

### ツール使用

`src/agent-example.ts` には以下が実装されています：

- 天気情報取得ツールの定義
- ツール実行ループの実装
- ツール結果の処理

### Todoツール統合

`src/todo-agent.ts` には以下が実装されています：

- TodoWriteツールの定義
- タスク管理機能
- エージェントとの統合
- 進捗表示

## 🔍 ツールカタログ

### 実装済みツール例

1. **get_weather** - 天気情報取得
2. **query_database** - データベースクエリ
3. **calculate** - 計算処理
4. **read_file / write_file** - ファイル操作
5. **web_search** - Web検索
6. **get_datetime_info** - 日時操作
7. **json_parse / json_query** - JSON操作
8. **todo_write** - タスク管理

詳細は [TOOLS_CATALOG.md](./TOOLS_CATALOG.md) を参照してください。

## 🎓 学習リソース

### 公式ドキュメント

- [Claude API Documentation](https://docs.anthropic.com/claude/reference/)
- [Tool Use Guide](https://docs.anthropic.com/claude/docs/tool-use)
- [Messages API](https://docs.anthropic.com/claude/reference/messages)

### このプロジェクトのドキュメント

- [TOOLS_CATALOG.md](./TOOLS_CATALOG.md) - ツールカタログ
- [TODO_TOOL_GUIDE.md](./TODO_TOOL_GUIDE.md) - Todoツールガイド

## 💡 使用例

### カスタムツールを作成

```typescript
const myTool: Anthropic.Tool = {
  name: 'my_custom_tool',
  description: 'カスタムツールの説明',
  input_schema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'パラメータの説明'
      }
    },
    required: ['param1']
  }
};

// ツールを実装
function executeMyTool(input: { param1: string }): unknown {
  // ツールのロジック
  return { result: `処理完了: ${input.param1}` };
}
```

### エージェントループの実装

```typescript
let response = await client.messages.create({ /*...*/ });

while (response.stop_reason === 'tool_use') {
  // ツールを実行
  const toolUse = response.content.find(
    block => block.type === 'tool_use'
  );

  const result = executeMyTool(toolUse.input);

  // 結果を返して次の応答を取得
  response = await client.messages.create({ /*...*/ });
}
```

## 🤝 貢献

プルリクエストを歓迎します！

## 📄 ライセンス

MIT

## 🔗 リンク

- [Anthropic公式サイト](https://www.anthropic.com/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [TypeScript SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript)

---

**最終更新**: 2025-10-22
**SDK バージョン**: @anthropic-ai/sdk v0.32.1
