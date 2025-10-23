# Node.js 作業ディレクトリ完全ガイド

Node.jsプロセスの作業ディレクトリ（Working Directory / Current Working Directory）の仕組みと、特定の固定ディレクトリで作業させる方法を詳しく解説します。

## 目次

1. [作業ディレクトリとは](#作業ディレクトリとは)
2. [Node.jsでの作業ディレクトリの特定方法](#nodejsでの作業ディレクトリの特定方法)
3. [ts-nodeでの作業ディレクトリ制御](#ts-nodeでの作業ディレクトリ制御)
4. [固定ディレクトリで作業させる方法](#固定ディレクトリで作業させる方法)
5. [ベストプラクティス](#ベストプラクティス)
6. [実装例](#実装例)

---

## 作業ディレクトリとは

**作業ディレクトリ（Current Working Directory, CWD）** は、プロセスが相対パスを解決する際の基準となるディレクトリです。

### 重要な概念

```
/home/user/
  └── projects/
      └── my-app/
          ├── src/
          │   └── index.ts
          ├── data/
          │   └── config.json
          └── package.json
```

上記の構造で、`/home/user/projects/my-app` から `node src/index.ts` を実行した場合：

- **作業ディレクトリ**: `/home/user/projects/my-app`
- **相対パス `./data/config.json`** は `/home/user/projects/my-app/data/config.json` に解決される
- **`__dirname`**: `/home/user/projects/my-app/src`（スクリプトの場所）

---

## Node.jsでの作業ディレクトリの特定方法

### 1. `process.cwd()`

プロセスの現在の作業ディレクトリを返します。

```typescript
console.log(process.cwd());
// 出力例: /home/user/projects/my-app
```

#### 特徴
- プロセスが起動された場所を返す
- `process.chdir()` で動的に変更可能
- **注意**: プロセス全体に影響する

### 2. `__dirname`

現在実行中のスクリプトファイルがあるディレクトリの絶対パスです。

```typescript
console.log(__dirname);
// 出力例: /home/user/projects/my-app/src
```

#### 特徴
- スクリプトファイルの場所を返す
- 変更不可能（定数）
- **推奨**: スクリプトからの相対パスを解決する際に使用

### 3. `require.main?.path`

最初に実行されたメインモジュールのディレクトリパスです。

```typescript
console.log(require.main?.path);
// 出力例: /home/user/projects/my-app/src
```

#### 特徴
- エントリーポイントのスクリプトの場所
- `node src/index.ts` で実行した場合は `src` ディレクトリ

### 4. 環境変数

環境変数からディレクトリ情報を取得できます。

```typescript
console.log(process.env.PWD);    // 現在の作業ディレクトリ
console.log(process.env.OLDPWD); // 直前の作業ディレクトリ
```

---

## ts-nodeでの作業ディレクトリ制御

`ts-node` は TypeScript を直接実行するためのツールで、作業ディレクトリを制御する複数の方法を提供します。

### 方法1: `--cwd` オプション

特定のディレクトリを作業ディレクトリとして指定します。

```bash
ts-node --cwd /path/to/directory src/index.ts
```

#### 動作
- `process.cwd()` が指定されたディレクトリを返す
- 相対パスの解決がそのディレクトリを基準になる

#### tsconfig.json での設定

```json
{
  "ts-node": {
    "cwd": "/path/to/directory"
  }
}
```

### 方法2: `--cwdMode` オプション

設定ファイルの検索を、スクリプトの場所ではなく現在のディレクトリから開始します。

```bash
ts-node --cwdMode src/index.ts
# または短縮版
ts-node -c src/index.ts
# または専用コマンド
ts-node-cwd src/index.ts
```

#### 使用シーン
- モノレポ構成
- サブディレクトリからスクリプトを実行する場合

### 方法3: 環境変数 `TS_NODE_CWD`

環境変数で作業ディレクトリを指定します。

```bash
TS_NODE_CWD=/path/to/directory ts-node src/index.ts

# または .env ファイルで設定
# .env
TS_NODE_CWD=/home/user/projects/my-app
```

#### 利点
- 設定ファイルを変更せずに制御可能
- CI/CD パイプラインでの利用に便利

---

## 固定ディレクトリで作業させる方法

### 推奨方法: カスタムクラスで管理

`process.cwd()` に依存せず、常に同じディレクトリを参照する方法です。

```typescript
import * as path from 'path';
import * as fs from 'fs';

class FixedDirectoryWorker {
  private workDir: string;

  constructor(workDir: string) {
    // 絶対パスに解決
    this.workDir = path.isAbsolute(workDir)
      ? workDir
      : path.resolve(process.cwd(), workDir);
  }

  resolvePath(relativePath: string): string {
    return path.resolve(this.workDir, relativePath);
  }

  readFile(relativePath: string): string {
    const fullPath = this.resolvePath(relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  }

  writeFile(relativePath: string, content: string): void {
    const fullPath = this.resolvePath(relativePath);
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}

// 使用例
const worker = new FixedDirectoryWorker('/home/user/projects/my-app');
const config = worker.readFile('data/config.json');
```

#### 利点
- ✅ `process.cwd()` の変更に影響されない
- ✅ 複数の作業ディレクトリを同時に扱える
- ✅ テストしやすい
- ✅ 予測可能な動作

### 代替方法1: `process.chdir()` で変更

プロセスの作業ディレクトリを変更します。

```typescript
const targetDir = '/path/to/target/directory';
process.chdir(targetDir);

console.log(process.cwd()); // /path/to/target/directory

// この後の相対パス解決は targetDir を基準になる
const data = fs.readFileSync('./config.json', 'utf-8');
```

#### 注意点
- ❌ プロセス全体に影響する
- ❌ 元のディレクトリに戻す必要がある場合がある
- ❌ マルチスレッド環境では問題が発生する可能性

```typescript
// 元のディレクトリを保存して戻す例
const originalCwd = process.cwd();
try {
  process.chdir('/path/to/target');
  // 処理...
} finally {
  process.chdir(originalCwd);
}
```

### 代替方法2: 絶対パスを使用

常に絶対パスで指定することで、作業ディレクトリに依存しない実装にします。

```typescript
import * as path from 'path';

// プロジェクトルートを基準にする
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'data', 'config.json');

const config = fs.readFileSync(CONFIG_PATH, 'utf-8');
```

#### 利点
- ✅ シンプル
- ✅ 作業ディレクトリに依存しない
- ✅ 明示的

---

## ベストプラクティス

### 1. `__dirname` を基準にする

スクリプトからの相対パスは `__dirname` を使って解決します。

```typescript
import * as path from 'path';

// ✅ 良い例
const configPath = path.resolve(__dirname, '../config.json');

// ❌ 悪い例（process.cwd()に依存）
const configPath = './config.json';
```

### 2. 設定で作業ディレクトリを指定

アプリケーションの設定ファイルで作業ディレクトリを管理します。

```typescript
// config.ts
export const config = {
  workDir: process.env.WORK_DIR || path.resolve(__dirname, '..'),
  dataDir: process.env.DATA_DIR || path.resolve(__dirname, '../data'),
};

// 使用側
import { config } from './config';
const dataPath = path.join(config.dataDir, 'users.json');
```

### 3. 環境変数で柔軟に制御

環境ごとに異なるディレクトリを使用する場合は環境変数を活用します。

```bash
# 開発環境
WORK_DIR=/home/user/dev/my-app npm run dev

# 本番環境
WORK_DIR=/var/app/my-app npm start
```

### 4. ドキュメント化

作業ディレクトリの前提条件を明記します。

```typescript
/**
 * データファイルを読み込みます
 *
 * @param relativePath - 作業ディレクトリからの相対パス
 * @returns ファイルの内容
 *
 * @remarks
 * この関数は process.cwd() を作業ディレクトリとして使用します。
 * 環境変数 WORK_DIR で作業ディレクトリを指定できます。
 */
function loadData(relativePath: string): string {
  const workDir = process.env.WORK_DIR || process.cwd();
  const fullPath = path.resolve(workDir, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}
```

### 5. テストでのモック

テストでは固定のディレクトリを使用します。

```typescript
import { FixedDirectoryWorker } from './workdir-example';

describe('FixedDirectoryWorker', () => {
  let worker: FixedDirectoryWorker;
  const testDir = '/tmp/test-workdir';

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    worker = new FixedDirectoryWorker(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('ファイルの書き込みと読み込み', () => {
    worker.writeFile('test.txt', 'Hello');
    const content = worker.readFile('test.txt');
    expect(content).toBe('Hello');
  });
});
```

---

## 実装例

### 例1: プロジェクトルート基準の処理

```typescript
import * as path from 'path';
import * as fs from 'fs';

// プロジェクトルートを特定
const PROJECT_ROOT = path.resolve(__dirname, '..');

// プロジェクトルート基準でパスを解決
function resolveFromRoot(...paths: string[]): string {
  return path.join(PROJECT_ROOT, ...paths);
}

// 使用例
const packageJson = JSON.parse(
  fs.readFileSync(resolveFromRoot('package.json'), 'utf-8')
);

console.log('プロジェクト名:', packageJson.name);
```

### 例2: 環境変数を使った柔軟な設定

```typescript
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env ファイルを読み込み
dotenv.config();

// 作業ディレクトリを環境変数から取得（デフォルトはプロセスの cwd）
const WORK_DIR = process.env.WORK_DIR || process.cwd();

console.log('作業ディレクトリ:', WORK_DIR);

// 作業ディレクトリ基準でパスを解決
function resolvePath(...paths: string[]): string {
  return path.resolve(WORK_DIR, ...paths);
}

// 使用例
const configPath = resolvePath('config', 'settings.json');
```

### 例3: Claude Agent SDKでの使用

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FixedDirectoryWorker } from './workdir-example';
import * as path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 固定作業ディレクトリを設定
const workDir = process.env.AGENT_WORK_DIR || '/tmp/agent-workspace';
const worker = new FixedDirectoryWorker(workDir);

// ファイル操作ツールの定義
const fileTools: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: '指定されたファイルを読み込みます',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '作業ディレクトリからの相対パス',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'ファイルに内容を書き込みます',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '作業ディレクトリからの相対パス',
        },
        content: {
          type: 'string',
          description: '書き込む内容',
        },
      },
      required: ['path', 'content'],
    },
  },
];

// ツール実行関数
function executeTool(toolName: string, input: any): any {
  switch (toolName) {
    case 'read_file':
      return { content: worker.readFile(input.path) };
    case 'write_file':
      worker.writeFile(input.path, input.content);
      return { success: true };
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// エージェント実行
async function runAgent(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  let response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools: fileTools,
    messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) break;

    console.log(`🔧 ツール実行: ${toolUse.name}`);
    console.log(`📝 入力:`, toolUse.input);

    const result = executeTool(toolUse.name, toolUse.input);
    console.log(`✅ 結果:`, result);

    messages.push({
      role: 'assistant',
      content: response.content,
    });

    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        },
      ],
    });

    response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools: fileTools,
      messages,
    });
  }

  return response;
}

// 使用例
console.log('作業ディレクトリ:', worker.getWorkDir());
runAgent('data.txt に "Hello, World!" と書き込んでください')
  .then(response => {
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    console.log('エージェントの応答:', textBlock?.text);
  })
  .catch(console.error);
```

---

## コマンドライン実行例

### 基本実行

```bash
# デフォルトの作業ディレクトリで実行
npx ts-node src/workdir-example.ts

# 特定のディレクトリで実行
npx ts-node --cwd /path/to/directory src/workdir-example.ts

# cwdMode で実行
npx ts-node --cwdMode src/workdir-example.ts
npx ts-node-cwd src/workdir-example.ts
```

### 環境変数を使用

```bash
# TS_NODE_CWD を使用
TS_NODE_CWD=/path/to/directory npx ts-node src/workdir-example.ts

# カスタム環境変数を使用
WORK_DIR=/path/to/directory npx ts-node src/workdir-example.ts

# .env ファイルから読み込み
echo "WORK_DIR=/home/user/my-workspace" > .env
npx ts-node src/workdir-example.ts
```

### package.json でスクリプト化

```json
{
  "scripts": {
    "demo": "ts-node src/workdir-example.ts",
    "demo:custom": "ts-node --cwd /tmp/workspace src/workdir-example.ts",
    "demo:env": "WORK_DIR=/tmp/workspace ts-node src/workdir-example.ts"
  }
}
```

実行:

```bash
npm run demo
npm run demo:custom
npm run demo:env
```

---

## まとめ

### 作業ディレクトリの特定方法

1. **`process.cwd()`** - プロセスの現在の作業ディレクトリ（動的に変更可能）
2. **`__dirname`** - スクリプトファイルの場所（固定）
3. **`require.main?.path`** - メインモジュールの場所
4. **環境変数** - `PWD`, `TS_NODE_CWD`, カスタム変数

### 固定ディレクトリで作業させる方法（推奨順）

1. ✅ **カスタムクラス** (`FixedDirectoryWorker`) - 最も安全で柔軟
2. ⚠️ **絶対パス** (`path.resolve(__dirname, '..')`) - シンプルだが柔軟性に欠ける
3. ⚠️ **環境変数** - 設定が外部化されるが、ドキュメント化が重要
4. ❌ **`process.chdir()`** - プロセス全体に影響するため非推奨

### ts-node での制御方法

- `--cwd <directory>` オプション
- `--cwdMode` / `-c` オプション
- `TS_NODE_CWD` 環境変数
- `tsconfig.json` の `ts-node.cwd` 設定

---

**実装例**: `src/workdir-example.ts` に完全な実装があります。

```bash
# デモを実行
npm run demo:workdir
```
