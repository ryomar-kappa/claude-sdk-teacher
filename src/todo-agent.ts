import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import { TodoManager, TodoList } from './todo-manager';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Todoツールの定義
export const todoWriteTool: Anthropic.Tool = {
  name: 'todo_write',
  description: `タスクリストを作成または更新します。

使用タイミング:
- 複雑なタスクを複数のステップに分解する時
- 作業の進捗状況を追跡する時
- タスクの状態を更新する時（pending → in_progress → completed）

重要なルール:
- 常に1つのタスクのみを"in_progress"状態にする
- タスクを完了したらすぐに"completed"にする
- 新しいタスクを始める前に、現在のタスクを完了させる
- contentは命令形、activeFormは進行形で記述する`,
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

// Todoツールを実行
export function executeTodoWrite(input: TodoList, manager: TodoManager): string {
  try {
    manager.update(input.todos);
    const stats = manager.getStats();
    return `✅ タスクリストを更新しました。進捗: ${stats.completed}/${stats.total} (${stats.progress}%)`;
  } catch (error) {
    return `❌ エラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
  }
}

// エージェント実行
export async function runAgentWithTodos(userRequest: string) {
  const manager = new TodoManager();

  console.log('🤖 エージェント起動\n');
  console.log(`📝 リクエスト: ${userRequest}\n`);

  const systemPrompt = `あなたは有能なアシスタントです。
複雑なタスクを受け取ったら、必ずtodo_writeツールを使用して：
1. タスクを小さなステップに分解する
2. 各ステップの進捗を追跡する
3. 完了したらすぐにステータスを更新する

ルール:
- 1つのタスクのみを"in_progress"にする
- タスクを完了したらすぐに"completed"にする
- 新しいタスクを始める前に現在のタスクを完了させる`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: userRequest
    }
  ];

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    tools: [todoWriteTool],
    messages
  });

  // ツール使用のループ
  let iterations = 0;
  const maxIterations = 30;

  while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++;

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    // アシスタントの応答を追加
    messages.push({ role: 'assistant', content: response.content });

    // テキスト部分があれば表示
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    if (textBlock) {
      console.log(`💬 ${textBlock.text}\n`);
    }

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
      system: systemPrompt,
      tools: [todoWriteTool],
      messages
    });
  }

  // 最終的なテキスト応答を表示
  const finalText = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (finalText) {
    console.log('\n🎉 エージェントの最終応答:');
    console.log(finalText.text);
  }

  console.log(`\n✨ 完了（${iterations}回のツール使用）\n`);

  // 最終的なTodo状態を表示
  manager.display();

  return manager;
}

// メイン実行
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('エラー: ANTHROPIC_API_KEYが設定されていません');
    console.log('.envファイルを作成して、ANTHROPIC_API_KEY=your-api-keyを設定してください');
    return;
  }

  // コマンドライン引数からリクエストを取得
  const userRequest =
    process.argv.slice(2).join(' ') ||
    'Webアプリケーションを作成してください。Express.jsでサーバーを立て、HTMLフロントエンドを作成し、簡単なAPIエンドポイントを実装してください。';

  try {
    await runAgentWithTodos(userRequest);
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

export { TodoManager };
