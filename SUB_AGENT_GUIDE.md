# Claude SDK サブエージェント実装ガイド

## 目次
1. [サブエージェントとは](#サブエージェントとは)
2. [メリット](#メリット)
3. [アーキテクチャパターン](#アーキテクチャパターン)
4. [実装方法](#実装方法)
5. [実装例](#実装例)
6. [ベストプラクティス](#ベストプラクティス)
7. [応用パターン](#応用パターン)

---

## サブエージェントとは

**サブエージェント**は、特定の役割や専門性を持つAIエージェントのことです。各サブエージェントは独自のシステムプロンプトを持ち、特定のタスクに特化した動作をします。

### 基本概念

- **親エージェント（オーケストレーター）**: タスクを分解し、適切なサブエージェントに委譲する役割
- **サブエージェント（ワーカー）**: 特定の専門タスクを実行する役割
- **独立したコンテキスト**: 各サブエージェントは独自の会話コンテキストを持つ
- **並列実行**: 複数のサブエージェントを同時に実行可能

### 従来のエージェント vs サブエージェント

| 特徴 | 従来のエージェント | サブエージェントパターン |
|------|-------------------|------------------------|
| 役割 | 汎用的 | 専門化された複数の役割 |
| コンテキスト | 単一の会話履歴 | 各エージェントが独立したコンテキスト |
| 並列処理 | 順次実行 | 並列実行が可能 |
| 複雑さ | シンプル | タスク分解により複雑なタスクを処理 |

---

## メリット

### 1. 専門性の向上
各サブエージェントは特定のタスクに最適化されたシステムプロンプトを持つため、より高品質な結果が得られます。

```typescript
// 例: ライター専門のサブエージェント
const writerAgent = {
  name: 'writer',
  systemPrompt: 'あなたは創造的なライターです。魅力的で読みやすいコンテンツを作成します。'
};
```

### 2. コンテキストの分離
各サブエージェントが独立したコンテキストを持つため、メイン会話の文脈を汚染しません。

### 3. 並列実行による高速化
複数のサブエージェントを同時に実行することで、全体の処理時間を大幅に短縮できます。

```typescript
// 3つのサブエージェントを並列実行
const results = await Promise.all([
  writerAgent.execute(task1),
  reviewerAgent.execute(task2),
  analystAgent.execute(task3),
]);
```

### 4. タスクの明確化
複雑なタスクを小さな専門タスクに分解することで、各ステップが明確になります。

### 5. 再利用性
一度定義したサブエージェントは、様々な場面で再利用できます。

---

## アーキテクチャパターン

### パターン1: オーケストレーター・ワーカーパターン

最も一般的なパターン。親エージェントがタスクを分解し、サブエージェント（ワーカー）に委譲します。

```
┌─────────────────────────┐
│  親エージェント          │
│  (オーケストレーター)    │
└───────────┬─────────────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
┌──────┐ ┌──────┐ ┌──────┐
│ Sub1 │ │ Sub2 │ │ Sub3 │
└──────┘ └──────┘ └──────┘
```

### パターン2: パイプラインパターン

サブエージェントを順次実行し、前のエージェントの出力を次のエージェントの入力とします。

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ Sub1 │ -> │ Sub2 │ -> │ Sub3 │ -> │ 結果 │
└──────┘    └──────┘    └──────┘    └──────┘
```

### パターン3: 階層型パターン

サブエージェントがさらに別のサブエージェントを管理する階層構造。

```
        ┌──────────┐
        │  親      │
        └────┬─────┘
             │
      ┌──────┼──────┐
      │      │      │
   ┌──▼─┐ ┌─▼──┐ ┌─▼──┐
   │Sub1│ │Sub2│ │Sub3│
   └──┬─┘ └────┘ └────┘
      │
   ┌──┼──┐
   │  │  │
 ┌─▼┐┌▼─┐┌▼─┐
 │1a││1b││1c│
 └──┘└──┘└──┘
```

---

## 実装方法

### ステップ1: SubAgentクラスの作成

各サブエージェントは独自のシステムプロンプトを持ちます。

```typescript
class SubAgent {
  private client: Anthropic;
  private config: SubAgentConfig;

  constructor(client: Anthropic, config: SubAgentConfig) {
    this.client = client;
    this.config = config;
  }

  async execute(userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: this.config.systemPrompt, // 専門性を定義
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    return textContent?.text || '';
  }
}
```

### ステップ2: オーケストレーターの作成

サブエージェントを管理し、タスクを委譲します。

```typescript
class SubAgentOrchestrator {
  private client: Anthropic;
  private subAgents: Map<string, SubAgent>;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.subAgents = new Map();
  }

  // サブエージェントを登録
  registerSubAgent(config: SubAgentConfig): void {
    const subAgent = new SubAgent(this.client, config);
    this.subAgents.set(config.name, subAgent);
  }

  // 単一サブエージェントに委譲
  async delegateToSubAgent(agentName: string, prompt: string): Promise<string> {
    const subAgent = this.subAgents.get(agentName);
    if (!subAgent) {
      throw new Error(`サブエージェント "${agentName}" が見つかりません`);
    }
    return await subAgent.execute(prompt);
  }

  // 並列実行
  async delegateParallel(tasks: SubAgentTask[]): Promise<SubAgentResult[]> {
    const promises = tasks.map(async (task) => {
      const result = await this.delegateToSubAgent(task.agentName, task.prompt);
      return { agentName: task.agentName, result };
    });
    return await Promise.all(promises);
  }
}
```

### ステップ3: サブエージェントの登録

専門性を持つサブエージェントを登録します。

```typescript
const orchestrator = new SubAgentOrchestrator(process.env.ANTHROPIC_API_KEY!);

// ライターエージェント
orchestrator.registerSubAgent({
  name: 'writer',
  systemPrompt: 'あなたは創造的なライターです。魅力的で読みやすいコンテンツを作成します。',
});

// レビュアーエージェント
orchestrator.registerSubAgent({
  name: 'reviewer',
  systemPrompt: 'あなたは厳格なレビュアーです。コンテンツを批判的に分析し、改善点を指摘します。',
});

// アナリストエージェント
orchestrator.registerSubAgent({
  name: 'analyst',
  systemPrompt: 'あなたはデータアナリストです。情報を分析し、重要なインサイトを抽出します。',
});
```

---

## 実装例

### 例1: 単一サブエージェントへの委譲

```typescript
const result = await orchestrator.delegateToSubAgent(
  'writer',
  '人工知能の未来について、300文字程度のブログ記事を書いてください。'
);
console.log(result);
```

### 例2: 並列実行

複数のサブエージェントを同時に実行し、結果を統合します。

```typescript
const tasks = [
  {
    agentName: 'writer',
    prompt: 'リモートワークの利点について100文字で説明してください。',
  },
  {
    agentName: 'analyst',
    prompt: 'リモートワークの導入率の傾向について分析してください。',
  },
  {
    agentName: 'reviewer',
    prompt: 'リモートワークの課題点を3つ挙げてください。',
  },
];

const results = await orchestrator.delegateParallel(tasks);
results.forEach((result) => {
  console.log(`[${result.agentName}]: ${result.result}`);
});
```

### 例3: 自動オーケストレーション

親エージェントがユーザーのリクエストを分析し、自動的にタスクを分解して委譲します。

```typescript
const result = await orchestrator.orchestrate(
  'クラウドコンピューティングについて詳しく解説し、その内容をレビューして、最後に要約してください。'
);
console.log(result);
```

内部処理:
1. 親エージェントがリクエストを分析
2. 実行計画を作成（どのサブエージェントに何を委譲するか）
3. サブエージェントを並列または順次実行
4. 結果を統合して最終的な回答を生成

---

## ベストプラクティス

### 1. 明確な役割分担

各サブエージェントの責務を明確にし、システムプロンプトで具体的に定義します。

```typescript
// 良い例
systemPrompt: 'あなたはPythonコードレビュアーです。コードの品質、パフォーマンス、セキュリティの観点から分析してください。'

// 悪い例
systemPrompt: 'あなたはアシスタントです。'
```

### 2. 入出力フォーマットの統一

サブエージェント間でデータをやり取りする際は、フォーマットを統一します。

```typescript
// JSON形式で出力を指定
systemPrompt: `あなたはアナリストです。
分析結果を以下のJSON形式で返してください：
{
  "summary": "要約",
  "insights": ["インサイト1", "インサイト2"],
  "recommendation": "推奨事項"
}`;
```

### 3. エラーハンドリング

サブエージェントの失敗に備えて、適切なエラーハンドリングを実装します。

```typescript
try {
  const result = await subAgent.execute(prompt);
  return { success: true, result };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
```

### 4. タイムアウトの設定

長時間実行されるタスクにはタイムアウトを設定します。

```typescript
const timeout = 30000; // 30秒
const result = await Promise.race([
  subAgent.execute(prompt),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeout)
  ),
]);
```

### 5. ログとモニタリング

各サブエージェントの実行状況をログに記録します。

```typescript
console.log(`[${agentName}] タスク開始: ${prompt.substring(0, 50)}...`);
const startTime = Date.now();
const result = await subAgent.execute(prompt);
const duration = Date.now() - startTime;
console.log(`[${agentName}] 完了 (${duration}ms)`);
```

### 6. キャッシングの活用

同じプロンプトを繰り返し実行する場合、Anthropic SDKのプロンプトキャッシング機能を活用します。

```typescript
const response = await this.client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  system: [
    {
      type: 'text',
      text: this.config.systemPrompt,
      cache_control: { type: 'ephemeral' }, // キャッシング有効化
    },
  ],
  messages: [{ role: 'user', content: userPrompt }],
});
```

---

## 応用パターン

### パターンA: 反復改善パターン

サブエージェントが相互にフィードバックを与え合い、結果を改善します。

```typescript
// 1. ライターが初稿を作成
const draft = await orchestrator.delegateToSubAgent('writer', 'ブログ記事を書いて');

// 2. レビュアーが改善点を指摘
const feedback = await orchestrator.delegateToSubAgent('reviewer',
  `以下の記事をレビューしてください：\n${draft}`
);

// 3. ライターが改訂版を作成
const revised = await orchestrator.delegateToSubAgent('writer',
  `以下のフィードバックに基づいて記事を改訂してください：\n${feedback}\n\n元の記事：\n${draft}`
);
```

### パターンB: 投票パターン

複数のサブエージェントが同じタスクを実行し、最良の結果を選択します。

```typescript
// 3つのライターが異なるアプローチで記事を作成
const proposals = await orchestrator.delegateParallel([
  { agentName: 'writer1', prompt: 'フォーマルな記事を書いて' },
  { agentName: 'writer2', prompt: 'カジュアルな記事を書いて' },
  { agentName: 'writer3', prompt: '技術的な記事を書いて' },
]);

// レビュアーが最良の案を選択
const best = await orchestrator.delegateToSubAgent('reviewer',
  `以下の3つの記事案から最良のものを選び、理由を説明してください：\n${JSON.stringify(proposals)}`
);
```

### パターンC: 専門家パネルパターン

複数の専門家エージェントが議論し、合意形成します。

```typescript
const experts = ['security_expert', 'performance_expert', 'ux_expert'];

// 各専門家が意見を述べる
const opinions = await orchestrator.delegateParallel(
  experts.map(expert => ({
    agentName: expert,
    prompt: '新機能の設計について意見をください',
  }))
);

// モデレーターが意見を統合
const consensus = await orchestrator.delegateToSubAgent('moderator',
  `以下の専門家の意見を統合して、最終的な推奨事項を作成してください：\n${JSON.stringify(opinions)}`
);
```

---

## サンプルコード

完全な実装例は `src/sub-agent-example.ts` を参照してください。

### 実行方法

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
echo "ANTHROPIC_API_KEY=your-api-key" > .env

# サンプル実行
npx ts-node src/sub-agent-example.ts
```

### 期待される出力

```
✅ サブエージェント登録: writer
✅ サブエージェント登録: reviewer
✅ サブエージェント登録: analyst
✅ サブエージェント登録: summarizer

📌 例1: 単一サブエージェントへの委譲
🤖 [writer] タスク実行開始
✅ [writer] タスク完了 (350文字)

📌 例2: 複数サブエージェントへの並列委譲
🚀 並列実行開始: 3個のタスク
🤖 [writer] タスク実行開始
🤖 [analyst] タスク実行開始
🤖 [reviewer] タスク実行開始
✨ 並列実行完了: 3個の結果

📌 例3: 自動オーケストレーション
🎯 オーケストレーター起動
📊 実行計画: {...}
✅ 計画確定: 3個のタスク
⚡ 並列実行: はい
✨ オーケストレーション完了
```

---

## まとめ

サブエージェントパターンを使用することで、以下のメリットが得られます：

1. **専門性**: 各エージェントが特定のタスクに最適化
2. **並列性**: 複数のタスクを同時実行して高速化
3. **明確性**: タスクの分解により、各ステップが明確
4. **再利用性**: サブエージェントを様々な場面で再利用
5. **スケーラビリティ**: 新しいサブエージェントを簡単に追加

このパターンは、複雑なAIアプリケーションを構築する際の強力な設計手法です。

---

## 関連ドキュメント

- [TOOLS_CATALOG.md](./TOOLS_CATALOG.md) - ツール使用の基礎
- [CLAUDE_SDK_WORKDIR.md](./CLAUDE_SDK_WORKDIR.md) - サンドボックス化されたエージェント
- [TODO_TOOL_GUIDE.md](./TODO_TOOL_GUIDE.md) - タスク管理ツール
- [Anthropic公式ドキュメント](https://docs.anthropic.com/en/docs/claude-code/sub-agents)

---

## ライセンス

MIT License
