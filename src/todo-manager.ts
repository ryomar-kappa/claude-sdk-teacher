import * as fs from 'fs';
import * as path from 'path';

// Todoの型定義
export interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface TodoList {
  todos: Todo[];
}

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

// カスタムエラー
export class TodoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TodoValidationError';
  }
}

// Todo状態の管理クラス
export class TodoManager {
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

  // バリデーション
  private validate(todos: Todo[]): void {
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

  // Todoリストを更新
  update(todos: Todo[]): void {
    this.validate(todos);
    this.todos = todos;
    this.save();
    this.display();
  }

  // Todoリストを取得
  getAll(): Todo[] {
    return [...this.todos];
  }

  // ステータス別に取得
  getByStatus(status: TodoStatus): Todo[] {
    return this.todos.filter(t => t.status === status);
  }

  // 実行中のタスクを取得
  getInProgress(): Todo | null {
    return this.todos.find(t => t.status === 'in_progress') || null;
  }

  // Todoリストを表示
  display(): void {
    console.log('\n=== 📋 タスクリスト ===\n');

    const pending = this.getByStatus('pending');
    const inProgress = this.getByStatus('in_progress');
    const completed = this.getByStatus('completed');

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
    const stats = this.getStats();
    if (stats.total > 0) {
      console.log(`📊 進捗: ${stats.completed}/${stats.total} (${stats.progress}%)\n`);
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
    const pending = this.getByStatus('pending').length;
    const inProgress = this.getByStatus('in_progress').length;
    const completed = this.getByStatus('completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, inProgress, completed, progress };
  }

  // タスクをクリア
  clear(): void {
    this.todos = [];
    this.save();
  }
}
