# Input Schema 完全ガイド

## input_schemaとは？

`input_schema`は、Claude Agent SDKでツールの**入力パラメータの形式を定義するJSONスキーマ**です。

### 役割

1. **モデルへの指示**: Claudeにツールがどんな入力を期待しているかを伝える
2. **型定義**: パラメータの型、必須/任意、制約条件を定義
3. **バリデーション**: 入力が正しい形式かをチェックする基準
4. **ドキュメント**: 各パラメータの説明を含める

---

## 基本構造

```typescript
const tool: Anthropic.Tool = {
  name: 'tool_name',
  description: 'ツールの説明',
  input_schema: {
    type: 'object',           // 常に 'object'
    properties: {             // パラメータの定義
      param1: {
        type: 'string',
        description: 'パラメータの説明'
      }
    },
    required: ['param1']      // 必須パラメータのリスト
  }
};
```

---

## データ型

### 1. string（文字列）

```typescript
{
  type: 'string',
  description: 'ユーザー名',
  minLength: 3,              // 最小長
  maxLength: 20,             // 最大長
  pattern: '^[a-zA-Z0-9]+$', // 正規表現パターン
  enum: ['小', '中', '大']    // 許可される値のリスト
}
```

**使用例:**
```typescript
// ユーザー名
{
  type: 'string',
  description: 'ユーザー名（3-20文字、英数字のみ）',
  minLength: 3,
  maxLength: 20,
  pattern: '^[a-zA-Z0-9_]+$'
}

// 列挙型
{
  type: 'string',
  description: 'サイズを選択',
  enum: ['small', 'medium', 'large'],
  default: 'medium'
}
```

### 2. number（数値）

```typescript
{
  type: 'number',
  description: '年齢',
  minimum: 0,              // 最小値
  maximum: 120,            // 最大値
  multipleOf: 1,           // 倍数（整数の場合は1）
  exclusiveMinimum: 0,     // 排他的最小値（0より大きい）
  exclusiveMaximum: 100    // 排他的最大値（100未満）
}
```

**使用例:**
```typescript
// 年齢
{
  type: 'number',
  description: 'ユーザーの年齢',
  minimum: 0,
  maximum: 150
}

// 価格
{
  type: 'number',
  description: '商品価格（円）',
  minimum: 0,
  multipleOf: 1  // 整数のみ
}

// パーセンテージ
{
  type: 'number',
  description: '割引率（%）',
  minimum: 0,
  maximum: 100
}
```

### 3. integer（整数）

```typescript
{
  type: 'integer',
  description: 'ページ番号',
  minimum: 1,
  default: 1
}
```

### 4. boolean（真偽値）

```typescript
{
  type: 'boolean',
  description: 'メール通知を有効にする',
  default: true
}
```

### 5. array（配列）

```typescript
{
  type: 'array',
  description: 'タグのリスト',
  items: {                    // 配列要素の型
    type: 'string'
  },
  minItems: 1,               // 最小要素数
  maxItems: 10,              // 最大要素数
  uniqueItems: true          // 重複を許可しない
}
```

**使用例:**
```typescript
// 文字列の配列
{
  type: 'array',
  description: 'タグのリスト',
  items: {
    type: 'string',
    minLength: 1,
    maxLength: 20
  },
  minItems: 1,
  maxItems: 5
}

// オブジェクトの配列
{
  type: 'array',
  description: 'ユーザーのリスト',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  }
}
```

### 6. object（オブジェクト）

```typescript
{
  type: 'object',
  description: '住所情報',
  properties: {
    street: { type: 'string' },
    city: { type: 'string' },
    zipCode: { type: 'string' }
  },
  required: ['city'],
  additionalProperties: false  // 定義外のプロパティを許可しない
}
```

---

## 実践例

### 例1: シンプルな天気取得ツール

```typescript
const weatherTool: Anthropic.Tool = {
  name: 'get_weather',
  description: '指定された場所の天気情報を取得します',
  input_schema: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: '都市名（例: 東京、大阪、札幌）'
      },
      unit: {
        type: 'string',
        description: '温度の単位',
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    required: ['location']  // locationは必須、unitは任意
  }
};
```

**使用時:**
```json
// モデルが生成する入力
{
  "location": "東京",
  "unit": "celsius"
}
```

### 例2: ユーザー作成ツール

```typescript
const createUserTool: Anthropic.Tool = {
  name: 'create_user',
  description: '新しいユーザーアカウントを作成します',
  input_schema: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: 'ユーザー名（3-20文字、英数字とアンダースコア）',
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$'
      },
      email: {
        type: 'string',
        description: 'メールアドレス',
        format: 'email'  // メール形式
      },
      age: {
        type: 'integer',
        description: '年齢（13歳以上）',
        minimum: 13,
        maximum: 120
      },
      role: {
        type: 'string',
        description: 'ユーザーの役割',
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
      },
      notifications: {
        type: 'boolean',
        description: 'メール通知を受け取る',
        default: true
      }
    },
    required: ['username', 'email']
  }
};
```

### 例3: データベースクエリツール

```typescript
const queryDatabaseTool: Anthropic.Tool = {
  name: 'query_database',
  description: 'データベースからデータを取得します',
  input_schema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'テーブル名',
        enum: ['users', 'products', 'orders']
      },
      columns: {
        type: 'array',
        description: '取得するカラムのリスト',
        items: {
          type: 'string'
        },
        minItems: 1
      },
      filters: {
        type: 'object',
        description: 'フィルター条件（キー: カラム名、値: 検索値）',
        additionalProperties: true  // 任意のプロパティを許可
      },
      limit: {
        type: 'integer',
        description: '取得する最大行数',
        minimum: 1,
        maximum: 1000,
        default: 10
      },
      offset: {
        type: 'integer',
        description: 'スキップする行数（ページネーション用）',
        minimum: 0,
        default: 0
      }
    },
    required: ['table', 'columns']
  }
};
```

**使用時:**
```json
{
  "table": "users",
  "columns": ["id", "name", "email"],
  "filters": {
    "age": 25,
    "city": "東京"
  },
  "limit": 20,
  "offset": 0
}
```

### 例4: ファイル操作ツール

```typescript
const writeFileTool: Anthropic.Tool = {
  name: 'write_file',
  description: 'ファイルに内容を書き込みます',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'ファイルパス（例: /path/to/file.txt）',
        minLength: 1
      },
      content: {
        type: 'string',
        description: '書き込む内容'
      },
      encoding: {
        type: 'string',
        description: 'ファイルのエンコーディング',
        enum: ['utf8', 'ascii', 'base64'],
        default: 'utf8'
      },
      mode: {
        type: 'string',
        description: '書き込みモード',
        enum: ['write', 'append'],
        default: 'write'
      },
      createDirectories: {
        type: 'boolean',
        description: '親ディレクトリが存在しない場合、作成する',
        default: false
      }
    },
    required: ['path', 'content']
  }
};
```

### 例5: 複雑なネストされたスキーマ

```typescript
const createOrderTool: Anthropic.Tool = {
  name: 'create_order',
  description: '新しい注文を作成します',
  input_schema: {
    type: 'object',
    properties: {
      customer: {
        type: 'object',
        description: '顧客情報',
        properties: {
          id: {
            type: 'string',
            description: '顧客ID'
          },
          name: {
            type: 'string',
            description: '顧客名'
          }
        },
        required: ['id']
      },
      items: {
        type: 'array',
        description: '注文アイテム',
        items: {
          type: 'object',
          properties: {
            productId: {
              type: 'string',
              description: '商品ID'
            },
            quantity: {
              type: 'integer',
              description: '数量',
              minimum: 1
            },
            price: {
              type: 'number',
              description: '単価',
              minimum: 0
            }
          },
          required: ['productId', 'quantity', 'price']
        },
        minItems: 1
      },
      shippingAddress: {
        type: 'object',
        description: '配送先住所',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: {
            type: 'string',
            pattern: '^\\d{3}-\\d{4}$'  // 郵便番号形式
          }
        },
        required: ['street', 'city', 'zipCode']
      },
      paymentMethod: {
        type: 'string',
        description: '支払い方法',
        enum: ['credit_card', 'bank_transfer', 'cash_on_delivery']
      }
    },
    required: ['customer', 'items', 'shippingAddress', 'paymentMethod']
  }
};
```

---

## 高度な機能

### 1. oneOf（いずれか1つ）

```typescript
{
  type: 'object',
  properties: {
    data: {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: { const: 'text' },
            text: { type: 'string' }
          },
          required: ['type', 'text']
        },
        {
          type: 'object',
          properties: {
            type: { const: 'image' },
            url: { type: 'string', format: 'uri' }
          },
          required: ['type', 'url']
        }
      ]
    }
  },
  required: ['data']
}
```

### 2. anyOf（いずれか）

```typescript
{
  type: 'object',
  properties: {
    contact: {
      anyOf: [
        { type: 'string', format: 'email' },
        { type: 'string', pattern: '^\\d{3}-\\d{4}-\\d{4}$' }
      ],
      description: 'メールアドレスまたは電話番号'
    }
  }
}
```

### 3. allOf（すべて）

```typescript
{
  allOf: [
    {
      type: 'object',
      properties: {
        name: { type: 'string' }
      }
    },
    {
      type: 'object',
      properties: {
        age: { type: 'number' }
      }
    }
  ]
}
```

### 4. 条件付きスキーマ

```typescript
{
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['file', 'url']
    },
    value: {
      type: 'string'
    }
  },
  if: {
    properties: { type: { const: 'url' } }
  },
  then: {
    properties: {
      value: { type: 'string', format: 'uri' }
    }
  },
  else: {
    properties: {
      value: { type: 'string', minLength: 1 }
    }
  }
}
```

---

## よくある使用パターン

### パターン1: 日時の指定

```typescript
{
  datetime: {
    type: 'string',
    description: '日時（ISO 8601形式）',
    format: 'date-time',
    // 例: "2024-01-15T10:30:00Z"
  }
}
```

### パターン2: URL

```typescript
{
  url: {
    type: 'string',
    description: 'ウェブサイトのURL',
    format: 'uri',
    pattern: '^https?://'
  }
}
```

### パターン3: JSONデータ

```typescript
{
  metadata: {
    type: 'object',
    description: 'メタデータ（任意のJSON）',
    additionalProperties: true
  }
}
```

### パターン4: ファイルパス

```typescript
{
  filePath: {
    type: 'string',
    description: 'ファイルパス',
    pattern: '^(/[^/]+)+/?$'  // Unix形式
  }
}
```

---

## ベストプラクティス

### 1. 詳細な説明を書く

```typescript
// ❌ 悪い例
{
  location: {
    type: 'string'
  }
}

// ✅ 良い例
{
  location: {
    type: 'string',
    description: '都市名を指定してください。日本の主要都市（例: 東京、大阪、名古屋）またはアルファベット（例: Tokyo, Osaka）で入力可能です。'
  }
}
```

### 2. 適切なバリデーションを設定

```typescript
// ✅ 良い例
{
  email: {
    type: 'string',
    description: 'メールアドレス',
    format: 'email',
    minLength: 5,
    maxLength: 100
  },
  age: {
    type: 'integer',
    description: '年齢',
    minimum: 0,
    maximum: 150
  }
}
```

### 3. デフォルト値を提供

```typescript
{
  pageSize: {
    type: 'integer',
    description: '1ページあたりの件数',
    minimum: 1,
    maximum: 100,
    default: 10  // デフォルト値
  }
}
```

### 4. enumを使って選択肢を明確にする

```typescript
{
  sortOrder: {
    type: 'string',
    description: '並び順',
    enum: ['asc', 'desc'],
    default: 'asc'
  }
}
```

---

## トラブルシューティング

### 問題1: モデルが正しい入力を生成しない

**原因**: 説明が不十分
**解決策**: `description`を詳しく書く

```typescript
{
  query: {
    type: 'string',
    description: `検索クエリを指定してください。
    - キーワード検索: "apple iphone"
    - フレーズ検索: "\"iPhone 15 Pro\""
    - 除外: "apple -macbook"

    複数のキーワードはスペースで区切ります。`
  }
}
```

### 問題2: バリデーションエラーが多発

**原因**: 制約が厳しすぎる
**解決策**: 制約を緩める、またはより良いガイダンスを提供

```typescript
// ❌ 厳しすぎる
{
  username: {
    type: 'string',
    pattern: '^[a-z]{5,8}$'  // 小文字5-8文字のみ
  }
}

// ✅ 適切
{
  username: {
    type: 'string',
    description: 'ユーザー名（3-20文字、英数字とアンダースコア使用可）',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z0-9_]+$'
  }
}
```

---

## まとめ

### input_schemaの重要ポイント

1. ✅ **型を明確に**: stringとnumberの違いなど
2. ✅ **説明を詳しく**: モデルが理解できるように
3. ✅ **バリデーションを適切に**: 厳しすぎず、緩すぎず
4. ✅ **デフォルト値を設定**: 任意パラメータには推奨値を
5. ✅ **enumで選択肢を限定**: 可能な値が決まっている場合
6. ✅ **例を含める**: description内に使用例を記載

### チェックリスト

- [ ] すべてのプロパティに`description`がある
- [ ] 必須パラメータが`required`に含まれている
- [ ] 数値には適切な`minimum`/`maximum`がある
- [ ] 文字列には適切な`minLength`/`maxLength`がある
- [ ] 列挙型には`enum`を使用している
- [ ] デフォルト値が設定されている（任意パラメータ）
- [ ] ネストしたオブジェクトも適切に定義されている

---

**参考資料**
- [JSON Schema公式ドキュメント](https://json-schema.org/)
- [Claude Tool Use Documentation](https://docs.anthropic.com/claude/docs/tool-use)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)

**最終更新**: 2025-10-22
