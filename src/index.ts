import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// Claude APIクライアントの初期化
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * シンプルなClaude APIの使用例
 */
async function simpleExample() {
  console.log('=== Simple Claude API Example ===\n');

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'こんにちは！あなたの名前を教えてください。',
      },
    ],
  });

  console.log('Response:', message.content[0].type === 'text' ? message.content[0].text : '');
  console.log('\n');
}

/**
 * 会話の履歴を保持する例
 */
async function conversationExample() {
  console.log('=== Conversation Example ===\n');

  const conversationHistory: Anthropic.MessageParam[] = [];

  // 最初のメッセージ
  conversationHistory.push({
    role: 'user',
    content: '私の名前は太郎です。覚えておいてください。',
  });

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: conversationHistory,
  });

  const firstResponse = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('Assistant:', firstResponse);

  conversationHistory.push({
    role: 'assistant',
    content: firstResponse,
  });

  // 2番目のメッセージ（名前を覚えているか確認）
  conversationHistory.push({
    role: 'user',
    content: '私の名前は何ですか？',
  });

  response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: conversationHistory,
  });

  const secondResponse = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('Assistant:', secondResponse);
  console.log('\n');
}

/**
 * システムプロンプトの使用例
 */
async function systemPromptExample() {
  console.log('=== System Prompt Example ===\n');

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    system: 'あなたは親切な日本語教師です。常に丁寧語で話してください。',
    messages: [
      {
        role: 'user',
        content: '「食べる」の活用形を教えて',
      },
    ],
  });

  console.log('Response:', message.content[0].type === 'text' ? message.content[0].text : '');
  console.log('\n');
}

/**
 * メイン関数
 */
async function main() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('エラー: ANTHROPIC_API_KEYが設定されていません');
      console.log('.envファイルを作成して、ANTHROPIC_API_KEY=your-api-keyを設定してください');
      return;
    }

    await simpleExample();
    await conversationExample();
    await systemPromptExample();

    console.log('すべての例が正常に実行されました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// スクリプトとして実行された場合のみmain()を呼び出す
if (require.main === module) {
  main();
}

export { simpleExample, conversationExample, systemPromptExample };
