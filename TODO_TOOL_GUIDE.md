# TodoWriteツール - 完全実装ガイド

このドキュメントでは、Claude Agent SDKを使用してタスク管理ツール（TodoWrite）を実装する方法を詳しく説明します。

## 目次

1. [概要](#概要)
2. [ツールの仕様](#ツールの仕様)
3. [完全な実装例](#完全な実装例)
4. [使用例](#使用例)
5. [拡張機能](#拡張機能)
6. [ベストプラクティス](#ベストプラクティス)

---

## 概要

TodoWriteツールは、AIエージェントがタスクを管理できるようにするためのツールです。このツールにより：

- タスクの作成、更新、完了管理
- タスクの進行状況の可視化
- 複数タスクの並行管理
- タスクの状態遷移の追跡

が可能になります。

### 主な用途

- **複雑なタスクの分解**: 大きなタスクを小さなステップに分割
- **進捗管理**: AIが自分の作業を追跡
- **ユーザーへの可視化**: 何が進行中かをユーザーに伝える
- **タスクの優先順位付け**: どのタスクから始めるべきか管理

---

## ツールの仕様

### 1. ツール定義

```typescript
const todoWriteTool: Anthropic.Tool = {
  name: 'todo_write',
  description: `タスクリストを作成または更新します。

このツールは以下の場合に使用してください：
- 複雑なタスクを複数のステップに分解する時
- 作業の進捗状況を追跡する時
- タスクの状態を更新する時（pending → in_progress → completed）
- タスクが不要になった場合に削除する時

重要なルール：
- 常に1つのタスクのみを"in_progress"状態にする
- タスクを完了したらすぐに"completed"にする
- 新しいタスクを始める前に、現在のタスクを完了させる`,
  input_schema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: '更新されたタスクリスト全体',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'タスクの内容（命令形で記述。例: "ファイルを読み込む"）',
              minLength: 1
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: `タスクの状態:
                - pending: 未開始
                - in_progress: 実行中（常に1つのみ）
                - completed: 完了`
            },
            activeForm: {
              type: 'string',
              description: 'タスクの進行形（例: "ファイルを読み込んでいます"）',
              minLength: 1
            }
          },
          required: ['content', 'status', 'activeForm']
        }
      }
    },
    required: ['todos']
  }
};
```

### 2. データ構造

```typescript
interface Todo {
  content: string;        // 命令形のタスク説明
  status: TodoStatus;     // タスクの状態
  activeForm: string;     // 進行形のタスク説明
}

type TodoStatus = 'pending' | 'in_progress' | 'completed';

interface TodoList {
  todos: Todo[];
}
```

### 3. 状態遷移

```
pending → in_progress → completed
   ↓           ↓
  削除        削除
```

---

## 完全な実装例

### 実装 1: シンプルなTodoマネージャー

```typescript
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Todoの型定義
interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

interface TodoList {
  todos: Todo[];
}

// Todo状態の管理クラス
class TodoManager {
  private todos: Todo[] = [];
  private todoFile: string;

  constructor(todoFile: string = '.todos.json') {
    this.todoFile = todoFile;
    this.load();
  }

  // ファイルからTodoを読み込む
  private load(): void {
    try {
      if (fs.existsSync(this.todoFile)) {
        const data = fs.readFileSync(this.todoFile, 'utf8');
        const parsed = JSON.parse(data) as TodoList;
        this.todos = parsed.todos;
      }
    } catch (error) {
      console.error('Todoの読み込みに失敗:', error);
      this.todos = [];
    }
  }

  // ファイルにTodoを保存
  private save(): void {
    try {
      const data: TodoList = { todos: this.todos };
      fs.writeFileSync(this.todoFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Todoの保存に失敗:', error);
    }
  }

  // Todoリストを更新
  update(todos: Todo[]): void {
    // バリデーション: in_progressは1つのみ
    const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
    if (inProgressCount > 1) {
      throw new Error('複数のタスクを同時に"in_progress"にすることはできません');
    }

    this.todos = todos;
    this.save();
    this.display();
  }

  // Todoリストを取得
  getAll(): Todo[] {
    return [...this.todos];
  }

  // Todoリストを表示
  display(): void {
    console.log('\n=== 📋 タスクリスト ===\n');

    const pending = this.todos.filter(t => t.status === 'pending');
    const inProgress = this.todos.filter(t => t.status === 'in_progress');
    const completed = this.todos.filter(t => t.status === 'completed');

    if (inProgress.length > 0) {
      console.log('🔵 実行中:');
      inProgress.forEach(todo => {
        console.log(`  ⏳ ${todo.activeForm}`);
      });
      console.log();
    }

    if (pending.length > 0) {
      console.log('⚪ 未開始:');
      pending.forEach(todo => {
        console.log(`  ⭕ ${todo.content}`);
      });
      console.log();
    }

    if (completed.length > 0) {
      console.log('🟢 完了:');
      completed.forEach(todo => {
        console.log(`  ✅ ${todo.content}`);
      });
      console.log();
    }

    // 進捗率を計算
    const total = this.todos.length;
    if (total > 0) {
      const completedCount = completed.length;
      const progress = Math.round((completedCount / total) * 100);
      console.log(`📊 進捗: ${completedCount}/${total} (${progress}%)\n`);
    }
  }

  // 統計情報を取得
  getStats(): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    progress: number;
  } {
    const total = this.todos.length;
    const pending = this.todos.filter(t => t.status === 'pending').length;
    const inProgress = this.todos.filter(t => t.status === 'in_progress').length;
    const completed = this.todos.filter(t => t.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, inProgress, completed, progress };
  }
}

// Todoツールの実装
function executeTodoWrite(input: TodoList, manager: TodoManager): string {
  try {
    manager.update(input.todos);
    const stats = manager.getStats();
    return `✅ タスクリストを更新しました。進捗: ${stats.completed}/${stats.total} (${stats.progress}%)`;
  } catch (error) {
    return `❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
  }
}

// ツール定義
const todoWriteTool: Anthropic.Tool = {
  name: 'todo_write',
  description: `タスクリストを作成または更新します。

使用タイミング:
- 複雑なタスクを複数のステップに分解する時
- 作業の進捗状況を追跡する時
- タスクの状態を更新する時

ルール:
- 1つのタスクのみを"in_progress"にする
- タスクを完了したらすぐに"completed"にする
- contentは命令形、activeFormは進行形で記述`,
  input_schema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: '更新されたタスクリスト全体',
        items: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'タスクの内容（命令形）',
              minLength: 1
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'タスクの状態'
            },
            activeForm: {
              type: 'string',
              description: 'タスクの進行形',
              minLength: 1
            }
          },
          required: ['content', 'status', 'activeForm']
        }
      }
    },
    required: ['todos']
  }
};

// メイン実行関数
async function runAgentWithTodos() {
  const manager = new TodoManager();

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: 'プロジェクトのセットアップをお願いします。package.jsonを作成し、依存関係をインストールして、READMEを作成してください。'
    }
  ];

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools: [todoWriteTool],
    messages
  });

  console.log('🤖 エージェント起動\n');

  // ツール使用のループ
  let iterations = 0;
  const maxIterations = 20;

  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++;

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    // アシスタントの応答を追加
    messages.push({ role: 'assistant', content: response.content });

    // 各ツールを実行
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      if (toolUse.name === 'todo_write') {
        const input = toolUse.input as TodoList;
        const result = executeTodoWrite(input, manager);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result
        });
      }
    }

    // ツール結果を追加
    messages.push({
      role: 'user',
      content: toolResults
    });

    // 次の応答を取得
    response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools: [todoWriteTool],
      messages
    });
  }

  // 最終的なテキスト応答を表示
  const finalText = response.content.find(
    block => block.type === 'text'
  );

  if (finalText && finalText.type === 'text') {
    console.log('\n🤖 エージェントの応答:');
    console.log(finalText.text);
  }

  console.log(`\n✨ 完了（${iterations}回のツール使用）\n`);

  // 最終的なTodo状態を表示
  manager.display();
}

// 実行
if (require.main === module) {
  runAgentWithTodos().catch(console.error);
}

export { TodoManager, todoWriteTool, executeTodoWrite };
```

### 実装 2: Web UI付きTodoマネージャー

```typescript
import express from 'express';
import { TodoManager } from './todo-manager';

const app = express();
const manager = new TodoManager();

app.use(express.json());
app.use(express.static('public'));

// Todoリストを取得
app.get('/api/todos', (req, res) => {
  res.json({ todos: manager.getAll() });
});

// Todoリストを更新
app.post('/api/todos', (req, res) => {
  try {
    const { todos } = req.body;
    manager.update(todos);
    res.json({
      success: true,
      stats: manager.getStats()
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    });
  }
});

// 統計情報を取得
app.get('/api/stats', (req, res) => {
  res.json(manager.getStats());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Todo Manager Server running on http://localhost:${PORT}`);
});
```

---

## 使用例

### 例1: 基本的な使用

```typescript
const manager = new TodoManager();

// 初期タスクを設定
manager.update([
  {
    content: 'プロジェクトをセットアップする',
    status: 'in_progress',
    activeForm: 'プロジェクトをセットアップしています'
  },
  {
    content: 'コードを実装する',
    status: 'pending',
    activeForm: 'コードを実装しています'
  },
  {
    content: 'テストを実行する',
    status: 'pending',
    activeForm: 'テストを実行しています'
  }
]);

// タスクを完了
manager.update([
  {
    content: 'プロジェクトをセットアップする',
    status: 'completed',
    activeForm: 'プロジェクトをセットアップしています'
  },
  {
    content: 'コードを実装する',
    status: 'in_progress',
    activeForm: 'コードを実装しています'
  },
  {
    content: 'テストを実行する',
    status: 'pending',
    activeForm: 'テストを実行しています'
  }
]);
```

### 例2: 動的なタスク追加

```typescript
const currentTodos = manager.getAll();

// 新しいタスクを追加
const newTodos = [
  ...currentTodos,
  {
    content: 'ドキュメントを更新する',
    status: 'pending',
    activeForm: 'ドキュメントを更新しています'
  }
];

manager.update(newTodos);
```

### 例3: エージェントとの統合

```typescript
async function agentWithTodoTracking(userRequest: string) {
  const manager = new TodoManager();

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: userRequest
    }
  ];

  // システムプロンプトでTodo使用を促す
  const systemPrompt = `あなたは有能なアシスタントです。
複雑なタスクを受け取ったら、必ずtodo_writeツールを使用して：
1. タスクを小さなステップに分解する
2. 各ステップの進捗を追跡する
3. 完了したらすぐにステータスを更新する

ルール:
- 1つのタスクのみを"in_progress"にする
- タスクを完了したらすぐに"completed"にする
- 新しいタスクを始める前に現在のタスクを完了させる`;

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    tools: [todoWriteTool],
    messages
  });

  while (response.stop_reason === 'tool_use') {
    // ツール処理ロジック（上記参照）
    // ...
  }

  return manager;
}
```

---

## 拡張機能

### 1. 優先順位の追加

```typescript
interface TodoWithPriority extends Todo {
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

const todoWriteToolWithPriority: Anthropic.Tool = {
  name: 'todo_write',
  description: 'タスクリストを優先順位付きで管理します',
  input_schema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed']
            },
            activeForm: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'タスクの優先順位'
            },
            dueDate: {
              type: 'string',
              description: '期限（ISO 8601形式）',
              format: 'date-time'
            }
          },
          required: ['content', 'status', 'activeForm']
        }
      }
    },
    required: ['todos']
  }
};
```

### 2. サブタスクのサポート

```typescript
interface TodoWithSubtasks extends Todo {
  subtasks?: Todo[];
  parentId?: string;
}
```

### 3. タスクの依存関係

```typescript
interface TodoWithDependencies extends Todo {
  dependsOn?: string[];  // 依存するタスクのID
  blockedBy?: string[];  // ブロックされているタスク
}
```

### 4. タスクの見積もり時間

```typescript
interface TodoWithEstimate extends Todo {
  estimatedMinutes?: number;
  actualMinutes?: number;
  startedAt?: string;
  completedAt?: string;
}
```

### 5. タスクのカテゴリー

```typescript
interface TodoWithCategory extends Todo {
  category: 'development' | 'testing' | 'documentation' | 'deployment';
  tags?: string[];
}
```

---

## ベストプラクティス

### 1. タスクの粒度

```typescript
// ❌ 悪い例: タスクが大きすぎる
{
  content: 'アプリケーションを完成させる',
  status: 'in_progress',
  activeForm: 'アプリケーションを完成させています'
}

// ✅ 良い例: 適切な粒度
{
  content: 'ユーザー認証機能を実装する',
  status: 'in_progress',
  activeForm: 'ユーザー認証機能を実装しています'
}
```

### 2. 明確な説明

```typescript
// ❌ 悪い例: 曖昧な説明
{
  content: 'ファイルを処理する',
  status: 'pending',
  activeForm: 'ファイルを処理しています'
}

// ✅ 良い例: 具体的な説明
{
  content: 'CSVファイルをパースしてデータベースに保存する',
  status: 'pending',
  activeForm: 'CSVファイルをパースしてデータベースに保存しています'
}
```

### 3. 状態管理のパターン

```typescript
// タスクを開始する前のパターン
function startNextTask(todos: Todo[], taskIndex: number): Todo[] {
  return todos.map((todo, index) => {
    if (index === taskIndex) {
      return { ...todo, status: 'in_progress' as const };
    } else if (todo.status === 'in_progress') {
      // 既存のin_progressタスクをpendingに戻す（エラー回避）
      return { ...todo, status: 'pending' as const };
    }
    return todo;
  });
}

// タスクを完了して次に進むパターン
function completeAndMoveNext(todos: Todo[]): Todo[] {
  const inProgressIndex = todos.findIndex(t => t.status === 'in_progress');
  if (inProgressIndex === -1) return todos;

  const newTodos = [...todos];
  newTodos[inProgressIndex] = {
    ...newTodos[inProgressIndex],
    status: 'completed'
  };

  // 次のpendingタスクを見つけてin_progressにする
  const nextPendingIndex = newTodos.findIndex(t => t.status === 'pending');
  if (nextPendingIndex !== -1) {
    newTodos[nextPendingIndex] = {
      ...newTodos[nextPendingIndex],
      status: 'in_progress'
    };
  }

  return newTodos;
}
```

### 4. エラーハンドリング

```typescript
class TodoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoValidationError';
  }
}

function validateTodos(todos: Todo[]): void {
  // 空チェック
  if (todos.length === 0) {
    throw new TodoValidationError('タスクリストが空です');
  }

  // in_progressの数をチェック
  const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
  if (inProgressCount > 1) {
    throw new TodoValidationError(
      `in_progressタスクは1つのみ許可されています（現在: ${inProgressCount}個）`
    );
  }

  // 必須フィールドのチェック
  todos.forEach((todo, index) => {
    if (!todo.content || todo.content.trim() === '') {
      throw new TodoValidationError(`タスク${index + 1}: contentが空です`);
    }
    if (!todo.activeForm || todo.activeForm.trim() === '') {
      throw new TodoValidationError(`タスク${index + 1}: activeFormが空です`);
    }
    if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
      throw new TodoValidationError(
        `タスク${index + 1}: 無効なstatus "${todo.status}"`
      );
    }
  });
}
```

### 5. パフォーマンス最適化

```typescript
// 大量のタスクを扱う場合の最適化
class OptimizedTodoManager extends TodoManager {
  private statusIndex: Map<string, Todo[]> = new Map();

  update(todos: Todo[]): void {
    super.update(todos);
    this.rebuildIndex();
  }

  private rebuildIndex(): void {
    this.statusIndex.clear();
    this.statusIndex.set('pending', []);
    this.statusIndex.set('in_progress', []);
    this.statusIndex.set('completed', []);

    for (const todo of this.getAll()) {
      this.statusIndex.get(todo.status)?.push(todo);
    }
  }

  getByStatus(status: TodoStatus): Todo[] {
    return this.statusIndex.get(status) || [];
  }

  getInProgress(): Todo | null {
    const inProgress = this.statusIndex.get('in_progress') || [];
    return inProgress[0] || null;
  }
}
```

---

## まとめ

### 主要なポイント

1. **状態管理**: 常に1つのタスクのみがin_progress
2. **即時更新**: タスクを完了したらすぐにcompletedに
3. **明確な記述**: contentは命令形、activeFormは進行形
4. **適切な粒度**: タスクは小さく、具体的に
5. **バリデーション**: 入力を常に検証

### 実装のチェックリスト

- ✅ ツール定義が適切なJSON Schemaを使用している
- ✅ バリデーションロジックが実装されている
- ✅ 状態遷移が正しく管理されている
- ✅ エラーハンドリングが実装されている
- ✅ ユーザーへの進捗表示が実装されている
- ✅ 永続化（ファイル保存）が実装されている

### 次のステップ

1. 基本的なTodoManagerを実装
2. エージェントとの統合をテスト
3. Web UIを追加（オプション）
4. 拡張機能を追加（優先順位、期限など）
5. 本番環境にデプロイ

---

**参考資料**

- [Claude Tool Use Documentation](https://docs.anthropic.com/claude/docs/tool-use)
- [JSON Schema Reference](https://json-schema.org/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**最終更新**: 2025-10-22
**バージョン**: 1.0.0
