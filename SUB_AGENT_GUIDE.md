# Claude SDK サブエージェント実装ガイド

## 目次
1. [サブエージェントとは](#サブエージェントとは)
2. [メリット](#メリット)
3. [サブエージェントの定義方法](#サブエージェントの定義方法)
4. [AgentDefinition設定](#agentdefinition設定)
5. [実装例](#実装例)
6. [ツール制限](#ツール制限)
7. [SDK統合パターン](#sdk統合パターン)
8. [ベストプラクティス](#ベストプラクティス)
9. [応用パターン](#応用パターン)

---

## サブエージェントとは

**サブエージェント**は、メインエージェントによってオーケストレーションされる、特定の専門性を持つAIエージェントです。Claude Agent SDKでは、コンテキスト管理と並列化のためにサブエージェントを使用します。

### 基本概念

- **メインエージェント（オーケストレーター）**: タスクを分解し、適切なサブエージェントに委譲する役割
- **サブエージェント（ワーカー）**: 特定の専門タスクを実行する役割
- **独立したコンテキスト**: 各サブエージェントは独自の会話コンテキストを持つ
- **並列実行**: 複数のサブエージェントを同時に実行可能
- **自動起動**: SDKが `description` フィールドに基づいて適切なサブエージェントを自動的に選択

---

## メリット

### 1. コンテキスト管理

各サブエージェントは独立したコンテキストを持つため、情報過多を防ぎ、集中的なインタラクションを維持できます。この分離により、専門的なタスクが無関係な詳細でメイン会話を汚染することがありません。

**例**: research-assistant サブエージェントは、数十のファイルやドキュメントページを探索できますが、中間的な検索結果をすべてメイン会話に表示せず、関連する発見のみを返します。

### 2. 並列化

複数のサブエージェントを同時実行することで、複雑なワークフローを劇的に高速化できます。

**例**: コードレビュー中、style-checker、security-scanner、test-coverage サブエージェントを同時に実行し、レビュー時間を数分から数秒に短縮できます。

### 3. 専門的な指示と知識

各サブエージェントは、特定の専門知識、ベストプラクティス、制約を持つカスタマイズされたシステムプロンプトを持つことができます。

**例**: database-migration サブエージェントは、SQLのベストプラクティス、ロールバック戦略、データ整合性チェックに関する詳細な知識を持つことができますが、メインエージェントの指示には不要なノイズとなります。

### 4. ツール制限

サブエージェントは特定のツールに制限でき、意図しないアクションのリスクを軽減できます。

**例**: doc-reviewer サブエージェントは Read と Grep ツールのみにアクセスできるようにし、ドキュメントファイルを分析できても誤って変更しないようにします。

---

## サブエージェントの定義方法

Claude Agent SDKでサブエージェントを定義する方法は2つあります：

### 方法1: プログラマティック定義（推奨）

`query()` 関数の `agents` パラメータを使用してコード内で直接定義します：

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: "認証モジュールのセキュリティ問題をレビューしてください",
  options: {
    agents: {
      'code-reviewer': {
        description: 'エキスパートコードレビュー専門家。品質、セキュリティ、保守性のレビューに使用。',
        prompt: `あなたはセキュリティ、パフォーマンス、ベストプラクティスに精通したコードレビュー専門家です。

コードレビュー時:
- セキュリティの脆弱性を特定
- パフォーマンス問題をチェック
- コーディング標準への準拠を確認
- 具体的な改善提案を行う

徹底的に、しかし簡潔なフィードバックを提供してください。`,
        tools: ['Read', 'Grep', 'Glob'],
        model: 'sonnet'
      },
      'test-runner': {
        description: 'テストスイートを実行・分析。テスト実行とカバレッジ分析に使用。',
        prompt: `あなたはテスト実行の専門家です。テストを実行し、結果を明確に分析します。

焦点:
- テストコマンドの実行
- テスト出力の分析
- 失敗したテストの特定
- 失敗の修正案を提示`,
        tools: ['Bash', 'Read', 'Grep'],
      }
    }
  }
});

for await (const message of result) {
  console.log(message);
}
```

### 方法2: ファイルシステムベース定義（代替）

指定されたディレクトリにマークダウンファイルを配置します：

- **プロジェクトレベル**: `.claude/agents/*.md` - 現在のプロジェクトでのみ利用可能
- **ユーザーレベル**: `~/.claude/agents/*.md` - すべてのプロジェクトで利用可能

各サブエージェントは、YAMLフロントマターを持つマークダウンファイルです：

```markdown
---
name: code-reviewer
description: エキスパートコードレビュー専門家。品質、セキュリティ、保守性のレビューに使用。
tools: Read, Grep, Glob, Bash
---

サブエージェントのシステムプロンプトをここに記述します。
これはサブエージェントの役割、能力、問題解決のアプローチを定義します。
```

**注意**: プログラマティックに定義されたエージェント（`agents` パラメータ経由）は、同じ名前のファイルシステムベースのエージェントよりも優先されます。

---

## AgentDefinition設定

### 設定項目

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `description` | string | **必須** | このエージェントをいつ使用するかの自然言語での説明。SDKがエージェントを自動起動する際に使用されます |
| `prompt` | string | **必須** | エージェントのシステムプロンプト。役割と動作を定義します |
| `tools` | string[] | オプション | 許可されたツール名の配列。省略した場合、すべてのツールを継承します |
| `model` | 'sonnet' \| 'opus' \| 'haiku' \| 'inherit' | オプション | このエージェントのモデルオーバーライド。省略した場合、メインモデルがデフォルトです |

### 設定例

```typescript
const agentConfig = {
  'security-auditor': {
    // 必須: いつこのエージェントを使用するかを明確に記述
    description: 'セキュリティ監査専門家。PROACTIVELY使用してセキュリティ脆弱性をチェック。',

    // 必須: エージェントの専門性と役割を定義
    prompt: `あなたはセキュリティ監査の専門家です。コードとシステムをセキュリティの観点から徹底的に分析します。

重点項目:
- SQL インジェクションのリスク
- XSS (クロスサイトスクリプティング) の脆弱性
- 認証・認可の問題
- 機密データの露出
- 安全でない依存関係

各発見について、リスクレベルと修正方法を提供してください。`,

    // オプション: ツールを制限（読み取り専用）
    tools: ['Read', 'Grep', 'Glob'],

    // オプション: より高性能なモデルを使用
    model: 'opus'
  }
};
```

---

## 実装例

### 例1: 基本的な使用方法

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: "データベース移行スクリプトをレビューしてください",
  options: {
    agents: {
      'db-expert': {
        description: 'データベースとSQL専門家。DB関連タスクに使用。',
        prompt: 'あなたはデータベースとSQLの専門家です。SQLスクリプト、移行、最適化を分析します。',
        tools: ['Read', 'Grep', 'Glob']
      }
    }
  }
});

for await (const message of result) {
  console.log(message);
}
```

### 例2: 複数のサブエージェントを定義

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: "認証システムの完全なレビューを実施してください",
  options: {
    agents: {
      'security-reviewer': {
        description: 'セキュリティコードレビューアー。脆弱性検出に使用。',
        prompt: `あなたは厳格なセキュリティレビューアーです。

重点:
- 認証の脆弱性
- セッション管理の問題
- 暗号化の実装
- アクセス制御`,
        tools: ['Read', 'Grep', 'Glob'],
        model: 'sonnet'
      },
      'performance-analyzer': {
        description: 'パフォーマンス最適化専門家。コード変更がパフォーマンスに影響する可能性がある場合にPROACTIVELYに使用。',
        prompt: `あなたはパフォーマンス最適化の専門家です。

分析項目:
- クエリの効率
- N+1問題
- キャッシング機会
- リソース使用`,
        tools: ['Read', 'Bash', 'Grep', 'Glob']
      },
      'test-coverage': {
        description: 'テストカバレッジ分析専門家。テスト実行とカバレッジ分析に使用。',
        prompt: 'あなたはテストカバレッジの専門家です。テストの完全性とカバレッジを評価します。',
        tools: ['Bash', 'Read', 'Grep']
      }
    }
  }
});

// SDKが自動的に適切なサブエージェントを起動します
for await (const message of result) {
  console.log(message);
}
```

### 例3: 動的なエージェント設定

```typescript
import { query, type AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

function createSecurityAgent(level: 'basic' | 'strict'): AgentDefinition {
  return {
    description: 'セキュリティコードレビューアー',
    prompt: `あなたは${level === 'strict' ? '厳格な' : 'バランスの取れた'}セキュリティレビューアーです...`,
    tools: ['Read', 'Grep', 'Glob'],
    model: level === 'strict' ? 'opus' : 'sonnet'
  };
}

const result = query({
  prompt: "このPRのセキュリティ問題をレビューしてください",
  options: {
    agents: {
      'security-reviewer': createSecurityAgent('strict')
    }
  }
});
```

---

## ツール制限

サブエージェントは `tools` フィールドを使用してツールアクセスを制限できます：

### ツール制限のオプション

1. **フィールドを省略** - エージェントはすべての利用可能なツールを継承（デフォルト）
2. **ツールを指定** - エージェントはリストされたツールのみ使用可能

### 読み取り専用分析エージェントの例

```typescript
const result = query({
  prompt: "このコードベースのアーキテクチャを分析してください",
  options: {
    agents: {
      'code-analyzer': {
        description: '静的コード分析とアーキテクチャレビュー',
        prompt: `あなたはコードアーキテクチャアナリストです。コード構造を分析し、
パターンを特定し、変更を加えずに改善を提案します。`,
        tools: ['Read', 'Grep', 'Glob']  // 書き込みや実行権限なし
      }
    }
  }
});
```

### よくあるツールの組み合わせ

#### 読み取り専用エージェント（分析、レビュー）

```typescript
tools: ['Read', 'Grep', 'Glob']
```

#### テスト実行エージェント

```typescript
tools: ['Bash', 'Read', 'Grep']
```

#### コード修正エージェント

```typescript
tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob']
```

#### フルアクセスエージェント

```typescript
// tools を省略してすべてのツールを継承
// または
tools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob']
```

---

## SDK統合パターン

### パターン1: 自動起動

SDKはタスクのコンテキストに基づいて適切なサブエージェントを自動的に起動します。エージェントの `description` フィールドで、いつ使用されるべきかを明確に示してください：

```typescript
const result = query({
  prompt: "APIレイヤーのデータベースクエリを最適化してください",
  options: {
    agents: {
      'performance-optimizer': {
        description: 'コード変更がパフォーマンスに影響する可能性がある場合にPROACTIVELYに使用。最適化タスクには必須。',
        prompt: 'あなたはパフォーマンス最適化の専門家です...',
        tools: ['Read', 'Edit', 'Bash', 'Grep'],
        model: 'sonnet'
      }
    }
  }
});
```

**重要なポイント**:
- `description` に "PROACTIVELY" や "MUST BE USED" などのキーワードを含めると、SDKがより積極的にエージェントを起動します
- タスクの種類を明確に記述（例: "最適化タスク"、"セキュリティレビュー"、"テスト実行"）

### パターン2: 明示的な起動

ユーザーはプロンプト内で特定のサブエージェントをリクエストできます：

```typescript
const result = query({
  prompt: "code-reviewerエージェントを使用して認証モジュールをチェックしてください",
  options: {
    agents: {
      'code-reviewer': {
        description: 'エキスパートコードレビュー専門家',
        prompt: 'あなたはセキュリティ重視のコードレビューアーです...',
        tools: ['Read', 'Grep', 'Glob']
      }
    }
  }
});
```

### パターン3: 条件付き起動

環境やコンテキストに基づいてエージェントを動的に設定：

```typescript
import { query, type AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

const isProd = process.env.NODE_ENV === 'production';

const agents: Record<string, AgentDefinition> = {
  'code-reviewer': {
    description: 'コードレビュー専門家',
    prompt: 'あなたはコードレビューアーです...',
    tools: ['Read', 'Grep', 'Glob'],
    model: isProd ? 'opus' : 'sonnet'  // 本番環境ではより高性能なモデル
  }
};

// 開発環境でのみデバッグエージェントを追加
if (!isProd) {
  agents['debugger'] = {
    description: 'デバッグ支援専門家',
    prompt: 'あなたはデバッグの専門家です...',
    tools: ['Bash', 'Read', 'Grep']
  };
}

const result = query({
  prompt: "コードをレビューしてください",
  options: { agents }
});
```

---

## ベストプラクティス

### 1. 明確で具体的なdescriptionを書く

`description` はSDKがいつエージェントを起動するかを判断する重要な要素です。

```typescript
// 良い例
description: 'Pythonコードのセキュリティレビュー専門家。認証、暗号化、SQL インジェクション、XSS の脆弱性をチェックする際に使用。'

// 悪い例
description: 'コードレビューをします'
```

### 2. promptで役割と責任を明確に定義

エージェントの専門性、焦点、出力形式を具体的に記述します。

```typescript
// 良い例
prompt: `あなたはTypeScriptセキュリティ監査の専門家です。

分析項目:
1. 型安全性の問題
2. nullチェックの欠如
3. 安全でないanyの使用
4. 外部入力の検証

各問題について:
- 重大度レベル（Critical/High/Medium/Low）
- 場所（ファイル:行番号）
- 説明
- 修正案

JSON形式で結果を返してください。`

// 悪い例
prompt: 'あなたはアシスタントです。コードをレビューしてください。'
```

### 3. 適切なツール制限を設定

最小権限の原則に従い、必要なツールのみを許可します。

```typescript
// 分析専用エージェント
{
  tools: ['Read', 'Grep', 'Glob']  // 読み取りのみ
}

// テスト実行エージェント
{
  tools: ['Bash', 'Read', 'Grep']  // 実行と読み取り
}

// コード修正エージェント
{
  tools: ['Read', 'Edit', 'Write', 'Grep', 'Glob']  // 修正権限あり
}
```

### 4. エラーハンドリング

サブエージェントの実行には適切なエラーハンドリングを実装します。

```typescript
try {
  const result = query({
    prompt: "コードをレビュー",
    options: {
      agents: {
        'reviewer': {
          description: 'レビュー専門家',
          prompt: 'レビューを実施...',
          tools: ['Read', 'Grep']
        }
      }
    }
  });

  for await (const message of result) {
    console.log(message);
  }
} catch (error) {
  console.error('サブエージェント実行エラー:', error);
  // フォールバック処理
}
```

### 5. ログとモニタリング

エージェントの実行状況を追跡します。

```typescript
const startTime = Date.now();

const result = query({
  prompt: "タスクを実行",
  options: {
    agents: {
      'task-agent': {
        description: 'タスク実行専門家',
        prompt: 'タスクを実行...',
        tools: ['Read', 'Bash']
      }
    }
  }
});

for await (const message of result) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

const duration = Date.now() - startTime;
console.log(`実行時間: ${duration}ms`);
```

### 6. モデル選択の最適化

タスクの複雑さに応じて適切なモデルを選択します。

```typescript
const agents = {
  'simple-formatter': {
    description: 'コードフォーマット専門家',
    prompt: 'コードをフォーマット...',
    tools: ['Read', 'Edit'],
    model: 'haiku'  // シンプルなタスクには高速なモデル
  },
  'architecture-reviewer': {
    description: 'アーキテクチャレビュー専門家',
    prompt: '複雑なアーキテクチャを分析...',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'opus'  // 複雑なタスクには高性能なモデル
  }
};
```

---

## 応用パターン

### パターンA: 反復改善パターン

複数のエージェントが協力して結果を改善します。

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: `以下のプロセスで記事を作成してください:
1. writerエージェントで初稿を作成
2. reviewerエージェントでフィードバック
3. writerエージェントで改訂版を作成`,
  options: {
    agents: {
      'writer': {
        description: '創造的なライター。コンテンツ作成に使用。',
        prompt: 'あなたは創造的なライターです。魅力的で読みやすいコンテンツを作成します。',
        tools: ['Read', 'Write']
      },
      'reviewer': {
        description: 'コンテンツレビュアー。品質向上のためのフィードバックを提供。',
        prompt: 'あなたは厳格なレビュアーです。コンテンツを批判的に分析し、具体的な改善点を指摘します。',
        tools: ['Read']
      }
    }
  }
});
```

### パターンB: 専門家パネルパターン

複数の専門家エージェントが異なる観点から分析します。

```typescript
const result = query({
  prompt: "新機能の設計を複数の観点からレビューしてください",
  options: {
    agents: {
      'security-expert': {
        description: 'セキュリティ専門家。セキュリティリスクを評価。',
        prompt: `あなたはセキュリティ専門家です。

評価項目:
- 認証・認可の実装
- データ保護
- セキュリティベストプラクティス`,
        tools: ['Read', 'Grep', 'Glob']
      },
      'performance-expert': {
        description: 'パフォーマンス専門家。パフォーマンスへの影響を評価。',
        prompt: `あなたはパフォーマンス専門家です。

評価項目:
- レスポンスタイム
- リソース使用
- スケーラビリティ`,
        tools: ['Read', 'Grep', 'Glob']
      },
      'ux-expert': {
        description: 'UX専門家。ユーザーエクスペリエンスを評価。',
        prompt: `あなたはUX専門家です。

評価項目:
- ユーザビリティ
- アクセシビリティ
- ユーザーフロー`,
        tools: ['Read']
      }
    }
  }
});
```

### パターンC: パイプラインパターン

タスクを順次処理します。

```typescript
const result = query({
  prompt: `以下の順序で処理してください:
1. data-extractorでデータを抽出
2. analyzerで分析
3. report-generatorでレポート生成`,
  options: {
    agents: {
      'data-extractor': {
        description: 'データ抽出専門家。ソースからデータを取得。',
        prompt: 'あなたはデータ抽出の専門家です。様々なソースからデータを効率的に抽出します。',
        tools: ['Read', 'Grep', 'Bash']
      },
      'analyzer': {
        description: 'データ分析専門家。抽出されたデータを分析。',
        prompt: 'あなたはデータアナリストです。データから重要なインサイトを抽出します。',
        tools: ['Read']
      },
      'report-generator': {
        description: 'レポート生成専門家。分析結果をレポート化。',
        prompt: 'あなたはレポート作成の専門家です。分析結果を分かりやすいレポートにまとめます。',
        tools: ['Write', 'Read']
      }
    }
  }
});
```

### パターンD: 条件分岐パターン

状況に応じて異なるエージェントを使用します。

```typescript
const result = query({
  prompt: "エラーログを分析し、適切なエージェントで対処してください",
  options: {
    agents: {
      'error-classifier': {
        description: 'エラー分類専門家。PROACTIVELY使用してエラーの種類を判定。',
        prompt: `あなたはエラー分類の専門家です。エラーログを分析し、以下のカテゴリに分類します:
- SECURITY: セキュリティ関連
- PERFORMANCE: パフォーマンス関連
- BUG: ロジックバグ
- CONFIG: 設定エラー`,
        tools: ['Read', 'Grep']
      },
      'security-fixer': {
        description: 'セキュリティ問題修正専門家。SECURITYエラーの修正に使用。',
        prompt: 'あなたはセキュリティ問題の修正専門家です...',
        tools: ['Read', 'Edit', 'Grep']
      },
      'performance-fixer': {
        description: 'パフォーマンス問題修正専門家。PERFORMANCEエラーの修正に使用。',
        prompt: 'あなたはパフォーマンス問題の修正専門家です...',
        tools: ['Read', 'Edit', 'Bash']
      },
      'bug-fixer': {
        description: 'バグ修正専門家。BUGエラーの修正に使用。',
        prompt: 'あなたはバグ修正の専門家です...',
        tools: ['Read', 'Edit', 'Write']
      }
    }
  }
});
```

---

## SDKの動作

Claude Agent SDKを使用する際、サブエージェントは以下のように動作します：

1. **プログラマティックエージェントの読み込み**: `options` の `agents` パラメータからエージェントを読み込み
2. **ファイルシステムエージェントの自動検出**: `.claude/agents/` ディレクトリからエージェントを検出（オーバーライドされていない場合）
3. **自動起動**: タスクマッチングとエージェントの `description` に基づいて自動的に起動
4. **専門化されたプロンプトとツール制限の使用**: 各エージェントの設定を適用
5. **独立したコンテキストの維持**: 各サブエージェント起動ごとに独立したコンテキストを保持

**優先順位**: プログラマティックに定義されたエージェント（`agents` パラメータ経由）は、同じ名前のファイルシステムベースのエージェントよりも優先されます。

---

## まとめ

サブエージェントパターンを使用することで、以下のメリットが得られます：

1. **コンテキスト管理**: 独立したコンテキストで情報過多を防止
2. **並列化**: 複数タスクの同時実行で高速化
3. **専門性**: 各エージェントが特定のタスクに最適化
4. **ツール制限**: 最小権限の原則でリスク軽減
5. **自動化**: SDKが適切なエージェントを自動選択
6. **再利用性**: 定義したエージェントを様々な場面で再利用
7. **スケーラビリティ**: 新しいサブエージェントを簡単に追加

Claude Agent SDKのサブエージェント機能は、複雑なAIアプリケーションを構築する際の強力な設計手法です。

---

## 関連ドキュメント

- [TOOLS_CATALOG.md](./TOOLS_CATALOG.md) - ツール使用の基礎
- [CLAUDE_SDK_WORKDIR.md](./CLAUDE_SDK_WORKDIR.md) - サンドボックス化されたエージェント
- [TODO_TOOL_GUIDE.md](./TODO_TOOL_GUIDE.md) - タスク管理ツール
- [Claude Agent SDK公式ドキュメント - Subagents](https://docs.claude.com/en/api/agent-sdk/subagents)

---

## ライセンス

MIT License
