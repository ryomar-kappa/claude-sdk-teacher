import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * ツールを使用したエージェント的な動作の例
 */
interface WeatherInfo {
  location: string;
  temperature: number;
  conditions: string;
}

// 天気情報を取得する（モック）
function getWeather(location: string): WeatherInfo {
  // 実際のAPIではなく、モックデータを返す
  const mockWeather: { [key: string]: WeatherInfo } = {
    '東京': { location: '東京', temperature: 22, conditions: '晴れ' },
    '大阪': { location: '大阪', temperature: 24, conditions: '曇り' },
    '札幌': { location: '札幌', temperature: 15, conditions: '雨' },
  };

  return mockWeather[location] || { location, temperature: 20, conditions: '不明' };
}

/**
 * Tool Useを使用した例
 */
async function toolUseExample() {
  console.log('=== Tool Use Example ===\n');

  const tools: Anthropic.Tool[] = [
    {
      name: 'get_weather',
      description: '指定された場所の現在の天気情報を取得します',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '天気を取得したい場所の名前（例：東京、大阪）',
          },
        },
        required: ['location'],
      },
    },
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: '東京の天気を教えてください',
    },
  ];

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    tools: tools,
    messages: messages,
  });

  console.log('Initial Response:', JSON.stringify(response.content, null, 2));

  // ツールの使用をチェック
  while (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) break;

    console.log('\nTool Used:', toolUse.name);
    console.log('Tool Input:', JSON.stringify(toolUse.input, null, 2));

    // ツールを実行
    let toolResult: unknown;
    if (toolUse.name === 'get_weather') {
      const input = toolUse.input as { location: string };
      toolResult = getWeather(input.location);
    }

    console.log('Tool Result:', JSON.stringify(toolResult, null, 2));

    // アシスタントの応答を履歴に追加
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // ツールの結果を追加
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult),
        },
      ],
    });

    // 次の応答を取得
    response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });

    console.log('\nFinal Response:', JSON.stringify(response.content, null, 2));
  }

  const finalText = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (finalText) {
    console.log('\nFinal Answer:', finalText.text);
  }
  console.log('\n');
}

/**
 * メイン関数
 */
async function main() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('エラー: ANTHROPIC_API_KEYが設定されていません');
      return;
    }

    await toolUseExample();

    console.log('エージェントの例が正常に実行されました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

if (require.main === module) {
  main();
}

export { toolUseExample };
