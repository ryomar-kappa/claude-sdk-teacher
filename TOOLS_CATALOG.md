# Claude Agent SDK - Tools Catalog

このドキュメントは、Anthropic Claude SDKで利用可能なツール（Tool Use / Function Calling）の完全なカタログです。

## 目次

1. [ツールの概要](#ツールの概要)
2. [ツールの定義方法](#ツールの定義方法)
3. [ツールの型定義](#ツールの型定義)
4. [実装例集](#実装例集)
5. [ベストプラクティス](#ベストプラクティス)

---

## ツールの概要

Claude SDKのツール機能（Tool Use）は、AIモデルが外部関数やAPIを呼び出せるようにする機能です。これにより、AIは：

- リアルタイムデータの取得（天気、株価など）
- データベースへのクエリ実行
- 外部APIとの連携
- 計算や処理の実行
- ファイル操作

などを実行できるようになります。

### 主要な特徴

- **型安全**: TypeScriptの型定義により、コンパイル時にエラーを検出
- **JSON Schema**: 各ツールの入力はJSON Schemaで定義
- **並列実行**: 複数のツールを同時に実行可能（設定により制御可能）
- **ストリーミング対応**: ストリーミングAPIでもツールを利用可能

---

## ツールの定義方法

### 基本構造

```typescript
interface Tool {
  name: string;                    // ツール名（必須）
  description?: string;            // ツールの説明（強く推奨）
  input_schema: Tool.InputSchema;  // 入力スキーマ（必須）
}
```

### InputSchemaの定義

```typescript
interface InputSchema {
  type: 'object';                  // 常に 'object' を指定
  properties?: unknown | null;     // プロパティの定義
  required?: string[];             // 必須フィールドのリスト
  [k: string]: unknown;            // 追加のJSON Schemaプロパティ
}
```

---

## ツールの型定義

### 1. Tool - ツール定義

モデルに提供するツールの完全な定義です。

```typescript
const tool: Anthropic.Tool = {
  name: 'get_weather',
  description: '指定された場所の現在の天気情報を取得します',
  input_schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '天気を取得したい場所の名前'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: '温度の単位'
      }
    },
    required: ['location']
  }
};
```

### 2. ToolChoice - ツールの使用方法

モデルがツールをどのように使用するかを制御します。

#### a) ToolChoiceAuto（自動選択）

```typescript
const toolChoice: Anthropic.ToolChoiceAuto = {
  type: 'auto',
  disable_parallel_tool_use: false  // 並列実行を許可
};
```

- モデルが自動的にツールを使うか判断
- `disable_parallel_tool_use`: 並列実行の制御

#### b) ToolChoiceAny（いずれかのツールを使用）

```typescript
const toolChoice: Anthropic.ToolChoiceAny = {
  type: 'any',
  disable_parallel_tool_use: false
};
```

- モデルは必ずいずれかのツールを使用
- テキスト応答のみは返さない

#### c) ToolChoiceTool（特定のツールを指定）

```typescript
const toolChoice: Anthropic.ToolChoiceTool = {
  type: 'tool',
  name: 'get_weather',
  disable_parallel_tool_use: true
};
```

- 指定したツールを必ず使用
- 構造化出力の生成に有用

### 3. ToolUseBlock - モデルからのツール使用リクエスト

モデルがツールを使用する際に返されるブロックです。

```typescript
interface ToolUseBlock {
  type: 'tool_use';
  id: string;      // ツール使用の一意なID
  name: string;    // 使用するツール名
  input: unknown;  // ツールへの入力パラメータ
}
```

### 4. ToolResultBlockParam - ツール実行結果

ツールの実行結果をモデルに返す際に使用します。

```typescript
interface ToolResultBlockParam {
  type: 'tool_result';
  tool_use_id: string;                                      // ToolUseBlockのIDと対応
  content?: string | Array<TextBlockParam | ImageBlockParam>; // 結果の内容
  is_error?: boolean;                                         // エラーかどうか
}
```

---

## 実装例集

### 例1: 天気情報取得ツール

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ツール定義
const weatherTool: Anthropic.Tool = {
  name: 'get_weather',
  description: '指定された場所の現在の天気情報を取得します',
  input_schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '都市名（例: 東京、大阪）'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: '温度の単位',
        default: 'celsius'
      }
    },
    required: ['location']
  }
};

// ツール実装
function getWeather(location: string, unit: string = 'celsius') {
  // 実際のAPIコールの代わりにモックデータ
  return {
    location,
    temperature: unit === 'celsius' ? 22 : 72,
    conditions: '晴れ',
    humidity: 60,
    unit
  };
}

// 使用例
async function main() {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: '東京の天気を教えてください' }
  ];

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    tools: [weatherTool],
    messages
  });

  // ツール使用を処理
  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolUse && toolUse.name === 'get_weather') {
      const input = toolUse.input as { location: string; unit?: string };
      const result = getWeather(input.location, input.unit);

      // 結果を返して会話を続ける
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        }]
      });

      const finalResponse = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        tools: [weatherTool],
        messages
      });

      console.log(finalResponse.content);
    }
  }
}
```

### 例2: データベースクエリツール

```typescript
const databaseQueryTool: Anthropic.Tool = {
  name: 'query_database',
  description: 'SQLクエリを実行してデータベースから情報を取得します',
  input_schema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'クエリ対象のテーブル名',
        enum: ['users', 'products', 'orders']
      },
      columns: {
        type: 'array',
        items: { type: 'string' },
        description: '取得するカラムのリスト'
      },
      filters: {
        type: 'object',
        description: 'フィルター条件（キー: カラム名、値: 検索値）',
        additionalProperties: true
      },
      limit: {
        type: 'number',
        description: '取得する最大行数',
        default: 10,
        minimum: 1,
        maximum: 100
      }
    },
    required: ['table', 'columns']
  }
};

function queryDatabase(params: {
  table: string;
  columns: string[];
  filters?: Record<string, unknown>;
  limit?: number;
}) {
  // 実際のデータベースクエリの代わりにモックデータ
  console.log('Querying:', params);
  return [
    { id: 1, name: 'Product A', price: 1000 },
    { id: 2, name: 'Product B', price: 2000 }
  ];
}
```

### 例3: 計算ツール

```typescript
const calculatorTool: Anthropic.Tool = {
  name: 'calculate',
  description: '数式を評価して計算結果を返します。加減乗除、べき乗などをサポート',
  input_schema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: '計算する数式（例: "2 + 2", "10 * 5", "pow(2, 8)"）'
      }
    },
    required: ['expression']
  }
};

function calculate(expression: string): number {
  // 安全な評価のため、許可された演算子のみ使用
  try {
    // 注意: 本番環境では適切なサニタイゼーションが必要
    return eval(expression);
  } catch (error) {
    throw new Error(`計算エラー: ${error}`);
  }
}
```

### 例4: ファイル操作ツール

```typescript
const fileReadTool: Anthropic.Tool = {
  name: 'read_file',
  description: 'ファイルの内容を読み込みます',
  input_schema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '読み込むファイルのパス'
      },
      encoding: {
        type: 'string',
        enum: ['utf8', 'ascii', 'base64'],
        description: 'ファイルのエンコーディング',
        default: 'utf8'
      }
    },
    required: ['file_path']
  }
};

const fileWriteTool: Anthropic.Tool = {
  name: 'write_file',
  description: 'ファイルに内容を書き込みます',
  input_schema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '書き込むファイルのパス'
      },
      content: {
        type: 'string',
        description: '書き込む内容'
      },
      mode: {
        type: 'string',
        enum: ['write', 'append'],
        description: '書き込みモード',
        default: 'write'
      }
    },
    required: ['file_path', 'content']
  }
};
```

### 例5: Web検索ツール

```typescript
const webSearchTool: Anthropic.Tool = {
  name: 'web_search',
  description: 'インターネット上で情報を検索します',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '検索クエリ'
      },
      num_results: {
        type: 'number',
        description: '取得する検索結果の数',
        default: 5,
        minimum: 1,
        maximum: 10
      },
      search_type: {
        type: 'string',
        enum: ['web', 'news', 'images'],
        description: '検索タイプ',
        default: 'web'
      }
    },
    required: ['query']
  }
};
```

### 例6: 日時操作ツール

```typescript
const dateTimeTool: Anthropic.Tool = {
  name: 'get_datetime_info',
  description: '現在の日時情報や日時計算を行います',
  input_schema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['current', 'add', 'subtract', 'format'],
        description: '実行する操作'
      },
      timezone: {
        type: 'string',
        description: 'タイムゾーン（例: Asia/Tokyo, America/New_York）',
        default: 'UTC'
      },
      format: {
        type: 'string',
        description: '出力フォーマット（ISO8601など）',
        default: 'ISO8601'
      },
      days: {
        type: 'number',
        description: '加算/減算する日数'
      }
    },
    required: ['operation']
  }
};
```

### 例7: JSON操作ツール

```typescript
const jsonToolkit: Anthropic.Tool[] = [
  {
    name: 'json_parse',
    description: 'JSON文字列をパースしてオブジェクトに変換します',
    input_schema: {
      type: 'object',
      properties: {
        json_string: {
          type: 'string',
          description: 'パースするJSON文字列'
        }
      },
      required: ['json_string']
    }
  },
  {
    name: 'json_query',
    description: 'JSONPath形式でJSONデータをクエリします',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'クエリ対象のJSONデータ'
        },
        path: {
          type: 'string',
          description: 'JSONPathクエリ（例: $.users[0].name）'
        }
      },
      required: ['data', 'path']
    }
  }
];
```

### 例8: 複数ツールの連携

```typescript
async function multiToolExample() {
  const tools: Anthropic.Tool[] = [
    weatherTool,
    calculatorTool,
    dateTimeTool
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: '東京の気温が20度以上なら、華氏に変換してください。また、3日後の日付も教えてください。'
    }
  ];

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    tools,
    messages
  });

  // ツール使用が完了するまでループ
  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    messages.push({ role: 'assistant', content: response.content });

    // 各ツール呼び出しを実行
    for (const toolUse of toolUses) {
      let result: unknown;

      if (toolUse.name === 'get_weather') {
        const input = toolUse.input as { location: string };
        result = getWeather(input.location);
      } else if (toolUse.name === 'calculate') {
        const input = toolUse.input as { expression: string };
        result = calculate(input.expression);
      } else if (toolUse.name === 'get_datetime_info') {
        const input = toolUse.input as { operation: string; days?: number };
        result = getDateTimeInfo(input);
      }

      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result)
        }]
      });
    }

    response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      tools,
      messages
    });
  }

  return response;
}
```

---

## ベストプラクティス

### 1. ツール定義のベストプラクティス

#### a) 詳細な説明を提供

```typescript
// 良い例
const tool: Anthropic.Tool = {
  name: 'send_email',
  description: `メールを送信します。
    - 複数の受信者をサポート
    - HTMLメールと平文メールの両方に対応
    - 添付ファイルはサポートしていません
    - 送信失敗時は自動的に再試行されます`,
  input_schema: {
    type: 'object',
    properties: {
      to: {
        type: 'array',
        items: { type: 'string' },
        description: '受信者のメールアドレスのリスト（各アドレスは有効な形式である必要があります）'
      },
      subject: {
        type: 'string',
        description: 'メールの件名（最大200文字）',
        maxLength: 200
      },
      body: {
        type: 'string',
        description: 'メール本文'
      },
      is_html: {
        type: 'boolean',
        description: 'trueの場合、本文をHTMLとして扱います',
        default: false
      }
    },
    required: ['to', 'subject', 'body']
  }
};
```

#### b) 型とバリデーションを適切に設定

```typescript
const tool: Anthropic.Tool = {
  name: 'create_user',
  description: '新しいユーザーを作成します',
  input_schema: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$',
        description: 'ユーザー名（3-20文字、英数字とアンダースコアのみ）'
      },
      email: {
        type: 'string',
        format: 'email',
        description: '有効なメールアドレス'
      },
      age: {
        type: 'number',
        minimum: 13,
        maximum: 120,
        description: 'ユーザーの年齢（13歳以上）'
      },
      role: {
        type: 'string',
        enum: ['user', 'admin', 'moderator'],
        description: 'ユーザーの役割'
      }
    },
    required: ['username', 'email']
  }
};
```

### 2. エラーハンドリング

```typescript
async function executeToolWithErrorHandling(
  toolUse: Anthropic.ToolUseBlock
): Promise<Anthropic.ToolResultBlockParam> {
  try {
    const result = await executeTool(toolUse);
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: JSON.stringify(result)
    };
  } catch (error) {
    return {
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      is_error: true
    };
  }
}
```

### 3. ツールの再利用可能性

```typescript
// ツールのファクトリー関数
function createCRUDTools(resourceName: string, resourceSchema: object): Anthropic.Tool[] {
  return [
    {
      name: `create_${resourceName}`,
      description: `新しい${resourceName}を作成します`,
      input_schema: {
        type: 'object',
        properties: resourceSchema,
        required: Object.keys(resourceSchema)
      }
    },
    {
      name: `read_${resourceName}`,
      description: `${resourceName}を取得します`,
      input_schema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: `${resourceName}のID`
          }
        },
        required: ['id']
      }
    },
    {
      name: `update_${resourceName}`,
      description: `${resourceName}を更新します`,
      input_schema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: `${resourceName}のID`
          },
          updates: {
            type: 'object',
            properties: resourceSchema,
            description: '更新する内容'
          }
        },
        required: ['id', 'updates']
      }
    },
    {
      name: `delete_${resourceName}`,
      description: `${resourceName}を削除します`,
      input_schema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: `${resourceName}のID`
          }
        },
        required: ['id']
      }
    }
  ];
}

// 使用例
const userTools = createCRUDTools('user', {
  name: { type: 'string' },
  email: { type: 'string', format: 'email' },
  age: { type: 'number' }
});
```

### 4. 並列実行の制御

```typescript
// 並列実行を許可（デフォルト）
const parallelResponse = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: [weatherTool, calculatorTool],
  tool_choice: { type: 'auto', disable_parallel_tool_use: false },
  messages
});

// 1つずつ実行
const sequentialResponse = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: [weatherTool, calculatorTool],
  tool_choice: { type: 'auto', disable_parallel_tool_use: true },
  messages
});
```

### 5. 型安全なツール実装

```typescript
// 型定義
interface WeatherInput {
  location: string;
  unit?: 'celsius' | 'fahrenheit';
}

interface WeatherOutput {
  location: string;
  temperature: number;
  conditions: string;
  unit: string;
}

// 型付きツール実装
function getWeatherTyped(input: WeatherInput): WeatherOutput {
  return {
    location: input.location,
    temperature: 22,
    conditions: '晴れ',
    unit: input.unit || 'celsius'
  };
}

// 型アサーション付き使用
if (toolUse.name === 'get_weather') {
  const input = toolUse.input as WeatherInput;
  const result: WeatherOutput = getWeatherTyped(input);
  // ...
}
```

---

## まとめ

このカタログでは、Claude Agent SDKで利用可能なツールの定義方法と実装パターンを網羅しました。

### 主要なポイント

1. **ツール定義は詳細に**: description と JSON Schema を詳しく記述
2. **型安全性を確保**: TypeScriptの型を活用
3. **エラーハンドリング**: 必ず適切なエラー処理を実装
4. **再利用性**: 共通パターンは関数化
5. **並列実行**: 用途に応じて制御

### 参考リンク

- [公式ドキュメント - Tool Use](https://docs.anthropic.com/en/docs/tool-use)
- [公式ドキュメント - Messages API](https://docs.anthropic.com/claude/reference/)
- [JSON Schema 公式サイト](https://json-schema.org/)

---

**最終更新**: 2025-10-22
**SDK バージョン**: @anthropic-ai/sdk v0.32.1
