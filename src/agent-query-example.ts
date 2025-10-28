import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import {
  AgentQueryBuilder,
  createSimpleQuery,
  createToolQuery,
  createSystemQuery,
} from './agent-query-types';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * 例1: シンプルなクエリの作成
 */
async function example1_simpleQuery() {
  console.log('\n=== 例1: シンプルなクエリ ===\n');

  // ヘルパー関数を使用した簡単な方法
  const query = createSimpleQuery('TypeScriptについて簡単に説明してください。');

  const response = await client.messages.create(query);
  const text = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('応答:', text);
}

/**
 * 例2: AgentQueryBuilderを使用したクエリ構築
 */
async function example2_builderPattern() {
  console.log('\n=== 例2: ビルダーパターン ===\n');

  // Fluent APIスタイルでクエリを構築
  const query = new AgentQueryBuilder()
    .setModel('claude-3-5-sonnet-20241022')
    .setMaxTokens(2048)
    .setSystemPrompt('あなたは親切で丁寧な日本語アシスタントです。')
    .setTemperature(0.7)
    .addUserMessage('Pythonの主な特徴を3つ教えてください。')
    .build();

  const response = await client.messages.create(query);
  const text = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('応答:', text);
}

/**
 * 例3: システムプロンプト付きクエリ
 */
async function example3_systemPrompt() {
  console.log('\n=== 例3: システムプロンプト ===\n');

  const systemPrompt = `あなたは経験豊富なソフトウェアエンジニアです。
コードレビューの際は、以下の観点から評価してください：
1. コードの可読性
2. パフォーマンス
3. セキュリティ
4. ベストプラクティスへの準拠`;

  const query = createSystemQuery(
    systemPrompt,
    '以下のコードをレビューしてください：\n```python\npassword = "admin123"\n```'
  );

  const response = await client.messages.create(query);
  const text = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('応答:', text);
}

/**
 * 例4: ツール使用クエリ
 */
async function example4_toolUse() {
  console.log('\n=== 例4: ツール使用 ===\n');

  // ツール定義
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
        a: {
          type: 'number',
          description: '1つ目の数値',
        },
        b: {
          type: 'number',
          description: '2つ目の数値',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  };

  // ツール使用クエリを作成
  const query = new AgentQueryBuilder()
    .setSystemPrompt('あなたは計算を手伝うアシスタントです。')
    .addUserMessage('123 + 456 を計算してください')
    .addTool(calculatorTool)
    .build();

  const response = await client.messages.create(query);

  console.log('応答:', JSON.stringify(response.content, null, 2));

  // ツールが使用された場合
  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (toolUse) {
    console.log('\nツール使用検出:');
    console.log('- ツール名:', toolUse.name);
    console.log('- 入力:', JSON.stringify(toolUse.input, null, 2));

    // ツールを実行（モック）
    const input = toolUse.input as { operation: string; a: number; b: number };
    let result = 0;
    switch (input.operation) {
      case 'add':
        result = input.a + input.b;
        break;
      case 'subtract':
        result = input.a - input.b;
        break;
      case 'multiply':
        result = input.a * input.b;
        break;
      case 'divide':
        result = input.a / input.b;
        break;
    }

    console.log('- 計算結果:', result);

    // ツール結果を返す
    const followUpQuery = new AgentQueryBuilder()
      .setMessages([
        { role: 'user', content: '123 + 456 を計算してください' },
        { role: 'assistant', content: response.content },
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

    const finalResponse = await client.messages.create(followUpQuery);
    const finalText = finalResponse.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )?.text;

    console.log('\n最終応答:', finalText);
  }
}

/**
 * 例5: 会話履歴を持つクエリ
 */
async function example5_conversationHistory() {
  console.log('\n=== 例5: 会話履歴 ===\n');

  // 初回のクエリ
  const query1 = new AgentQueryBuilder()
    .setSystemPrompt('あなたは親切なアシスタントです。')
    .addUserMessage('私の名前は太郎です。')
    .build();

  const response1 = await client.messages.create(query1);
  const text1 = response1.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('応答1:', text1);

  // 会話履歴を保持して次のクエリ
  const query2 = new AgentQueryBuilder()
    .setSystemPrompt('あなたは親切なアシスタントです。')
    .addUserMessage('私の名前は太郎です。')
    .addAssistantMessage(response1.content)
    .addUserMessage('私の名前を覚えていますか？')
    .build();

  const response2 = await client.messages.create(query2);
  const text2 = response2.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('応答2:', text2);
}

/**
 * 例6: 詳細設定を使用したクエリ
 */
async function example6_advancedSettings() {
  console.log('\n=== 例6: 詳細設定 ===\n');

  const query = new AgentQueryBuilder()
    .setModel('claude-3-5-sonnet-20241022')
    .setMaxTokens(1024)
    .setTemperature(0.5) // より決定論的な応答
    .setTopP(0.9) // サンプリング設定
    .setTopK(50) // サンプリング設定
    .setStopSequences(['\n\n---\n\n']) // カスタム停止シーケンス
    .setSystemPrompt('あなたは簡潔に答えるアシスタントです。')
    .addUserMessage('機械学習とは何ですか？100文字以内で説明してください。')
    .build();

  const response = await client.messages.create(query);
  const text = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('応答:', text);
  console.log('\n使用トークン数:');
  console.log('- 入力:', response.usage.input_tokens);
  console.log('- 出力:', response.usage.output_tokens);
}

/**
 * 例7: ビルダーのクローンと再利用
 */
async function example7_builderReuse() {
  console.log('\n=== 例7: ビルダーの再利用 ===\n');

  // 共通設定を持つベースビルダーを作成
  const baseBuilder = new AgentQueryBuilder()
    .setModel('claude-3-5-sonnet-20241022')
    .setMaxTokens(1024)
    .setSystemPrompt('あなたはプログラミングの先生です。')
    .setTemperature(0.7);

  // ベースビルダーをクローンして異なるクエリを作成
  const query1 = baseBuilder.clone().addUserMessage('Rustの特徴を教えて').build();

  const query2 = baseBuilder.clone().addUserMessage('Goの特徴を教えて').build();

  const [response1, response2] = await Promise.all([
    client.messages.create(query1),
    client.messages.create(query2),
  ]);

  const text1 = response1.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  const text2 = response2.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  )?.text;

  console.log('Rustについて:', text1?.substring(0, 200) + '...');
  console.log('\nGoについて:', text2?.substring(0, 200) + '...');
}

/**
 * メイン関数
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       Agent Query Types - 使用例デモ                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n❌ エラー: ANTHROPIC_API_KEYが設定されていません');
    console.log('.envファイルを作成して、ANTHROPIC_API_KEY=your-api-keyを設定してください\n');
    return;
  }

  try {
    // どの例を実行するか選択（コメントアウトして調整）
    await example1_simpleQuery();
    // await example2_builderPattern();
    // await example3_systemPrompt();
    // await example4_toolUse();
    // await example5_conversationHistory();
    // await example6_advancedSettings();
    // await example7_builderReuse();

    console.log('\n✅ すべての例が正常に実行されました！');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    if (error instanceof Error) {
      console.error('詳細:', error.message);
    }
  }
}

if (require.main === module) {
  main();
}

export {
  example1_simpleQuery,
  example2_builderPattern,
  example3_systemPrompt,
  example4_toolUse,
  example5_conversationHistory,
  example6_advancedSettings,
  example7_builderReuse,
};
