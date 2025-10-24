# @anthropic-ai/sdk ディレクトリ構造

## 概要

このドキュメントは、`node_modules/@anthropic-ai/sdk` ディレクトリの構造と各ディレクトリの内容をまとめたものです。

## パッケージ情報

- **パッケージ名**: @anthropic-ai/sdk
- **バージョン**: 0.32.1
- **説明**: Anthropic REST APIのための公式TypeScriptライブラリ
- **ライセンス**: MIT
- **リポジトリ**: github:anthropics/anthropic-sdk-typescript

## ルートディレクトリ

ルートディレクトリには以下の主要ファイルが含まれています：

### ドキュメント・設定ファイル
- `README.md` - パッケージの使用方法とAPI説明
- `CHANGELOG.md` - バージョン履歴と変更内容
- `LICENSE` - MITライセンス
- `package.json` - パッケージ設定とメタデータ

### コアモジュール
各モジュールには `.js` (CommonJS)、`.mjs` (ESM)、`.d.ts` (TypeScript定義)、および対応するソースマップファイルが含まれています：

- `index.*` - パッケージのメインエントリーポイント
- `core.*` - コア機能（APIクライアント基本実装）
- `error.*` - エラーハンドリング（APIError、認証エラーなど）
- `resource.*` - リソース基底クラス
- `pagination.*` - ページネーション機能
- `streaming.*` - ストリーミングレスポンス処理
- `uploads.*` - ファイルアップロード機能
- `version.*` - バージョン情報

## ディレクトリ構造の詳細

### 1. `_shims/` ディレクトリ

**目的**: 複数のランタイム環境（Node.js、Deno、Bun、ブラウザ、エッジランタイム）への対応

**主な内容**:
- `README.md` - shimsの仕組みと動作説明
- `registry.ts/.js/.mjs` - シム登録システム
- `MultipartBody.*` - マルチパートフォームデータ処理
- `index.*` - シムのエントリーポイント

**ランタイム固有ファイル**:
- `node-runtime.*` - Node.js用ランタイムシム
- `web-runtime.*` - Web/ブラウザ用ランタイムシム
- `bun-runtime.*` - Bun用ランタイムシム
- `node-types.*` - Node.js型定義
- `web-types.*` - Web型定義
- `manual-types.*` - 手動型オーバーライド

**`_shims/auto/` サブディレクトリ**:
- `runtime.*` - 自動ランタイム検出（デフォルト: Web）
- `runtime-node.*` - Node.js自動選択版
- `runtime-bun.*` - Bun自動選択版
- `types.*` - 自動型選択
- `types-node.*` - Node.js型自動選択

**技術的特徴**:
- Conditional exportsを使用した自動環境検出
- `node-fetch`（Node.js）またはグローバル`fetch`（その他）の切り替え
- CommonJSとESMの両対応

### 2. `_vendor/` ディレクトリ

**目的**: 外部依存関係をベンダリング（パッケージ内に同梱）

**`_vendor/partial-json-parser/` サブディレクトリ**:
- `README.md` - オリジナルはnpmパッケージから移植
- `parser.*` - 部分的なJSON解析機能（ストリーミング中の不完全なJSONを解析）

**用途**: ストリーミングAPIレスポンスで不完全なJSONを段階的にパースするために使用

### 3. `internal/` ディレクトリ

**目的**: 内部実装の詳細（外部使用非推奨）

**`internal/decoders/` サブディレクトリ**:
- `line.*` - 行単位のストリームデコーダー
- `jsonl.*` - JSON Lines形式デコーダー（改行区切りJSON）

**用途**: Server-Sent Events (SSE)やストリーミングレスポンスの処理

### 4. `lib/` ディレクトリ

**目的**: ヘルパーライブラリとユーティリティクラス

**主要ファイル**:
- `MessageStream.*` - メッセージストリーム処理クラス
  - イベントハンドラー（`.on('text', ...)`など）
  - ストリーミングメッセージの蓄積と管理
  - `finalMessage()`で最終メッセージを取得

- `PromptCachingBetaMessageStream.*` - プロンプトキャッシング機能付きメッセージストリーム（ベータ版）

**用途**: `client.messages.stream()`で使用される便利なストリーミングヘルパー

### 5. `resources/` ディレクトリ

**目的**: APIリソースとエンドポイントの実装

**ルートレベル**:
- `index.*` - リソースモジュールのエクスポート
- `messages.*` - Messages API実装（メインAPI）
- `completions.*` - Completions API実装（レガシー）
- `top-level.*` - トップレベルリソース定義

**`resources/beta/` サブディレクトリ** - ベータ版機能:
- `beta.*` - ベータAPI基底クラス
- `index.*` - ベータリソースのエクスポート

**`resources/beta/messages/` サブディレクトリ**:
- `messages.*` - ベータ版Messages API
- `batches.*` - Message Batches API（バッチ処理）
  - `batches.create()` - バッチリクエストの作成
  - `batches.results()` - バッチ結果の取得
- `index.*` - エクスポート管理

**`resources/beta/prompt-caching/` サブディレクトリ**:
- `prompt-caching.*` - プロンプトキャッシング基底
- `messages.*` - キャッシング機能付きメッセージAPI
- `index.*` - エクスポート管理

**用途**:
- `client.messages.create()` - 標準メッセージAPI
- `client.beta.messages.batches` - バッチ処理API
- `client.completions` - レガシーCompletions API

### 6. `shims/` ディレクトリ

**目的**: ユーザーがランタイムを手動選択するためのエントリーポイント

**主要ファイル**:
- `node.*` - Node.jsシムを強制適用
  - インポート例: `import '@anthropic-ai/sdk/shims/node'`
- `web.*` - Webシムを強制適用
  - インポート例: `import '@anthropic-ai/sdk/shims/web'`

**使用シナリオ**:
- TypeScriptの`moduleResolution: "node"`使用時の型エラー回避
- グローバル`fetch`の明示的使用（Next.js、`--experimental-fetch`など）
- 正しい`Response`型を取得したい場合

### 7. `src/` ディレクトリ

**目的**: TypeScriptソースコード（開発・参照用）

**構造**: コンパイル済みファイルとほぼ同じ構造で、TypeScriptファイル（`.ts`）を含む

**主要ファイル**:
- `index.ts` - パッケージのメインソース
- `core.ts` - コアAPI実装
- `error.ts` - エラークラス定義
- `streaming.ts` - ストリーミング実装
- `pagination.ts` - ページネーション実装
- `uploads.ts` - アップロード機能
- `resource.ts` - リソース基底クラス
- `version.ts` - バージョン定義
- `tsconfig.json` - TypeScript設定

**サブディレクトリ**:
- `src/_shims/` - shimのソースコード
- `src/_vendor/` - ベンダリングされたライブラリのソース
- `src/internal/` - 内部デコーダーのソース
- `src/lib/` - ライブラリヘルパーのソース
- `src/resources/` - APIリソースのソース
- `src/shims/` - 手動shimエントリーポイントのソース

**注意**: 通常の使用では、コンパイル済みの`.js`/`.mjs`ファイルが使用され、`src/`は参照目的のみ

### 8. `node_modules/` ディレクトリ

**目的**: パッケージの依存関係

**主な内容**:
- `@types/node/` - Node.js型定義（TypeScript用）
- `undici-types/` - undiciの型定義（Node.js fetch実装）

**主要依存パッケージ（package.jsonより）**:
- `@types/node` - Node.js型定義
- `node-fetch` - Node.js用fetchポリフィル
- `abort-controller` - AbortController実装
- `agentkeepalive` - HTTPコネクション永続化
- `form-data-encoder` - フォームデータエンコーディング
- `formdata-node` - FormData実装

## ファイル形式の説明

SDKは以下の形式でファイルを提供しています：

- **`.js`** - CommonJS形式（`require`用）
- **`.mjs`** - ESモジュール形式（`import`用）
- **`.d.ts`** - TypeScript型定義ファイル
- **`.d.mts`** - ESモジュール用TypeScript型定義
- **`.map`** - ソースマップファイル（デバッグ用）
- **`.ts`** - TypeScriptソースコード（`src/`内）

## 主要な技術的特徴

### マルチランタイム対応
- Node.js 18 LTS以降
- Deno v1.28.0以降
- Bun 1.0以降
- Cloudflare Workers
- Vercel Edge Runtime
- Webブラウザ（`dangerouslyAllowBrowser: true`で有効化）

### モジュールシステム対応
- CommonJS（CJS）- `.js`ファイル
- ECMAScript Modules（ESM）- `.mjs`ファイル
- TypeScript - `.d.ts`型定義

### Conditional Exports
`package.json`でランタイムごとに適切なファイルを自動選択：
- `node` - Node.js用ファイル
- `bun` - Bun用ファイル
- `browser`/`worker`/`workerd` - ブラウザ/エッジランタイム用
- `deno` - Deno用
- デフォルト - Web標準

## 使用例とディレクトリの関係

1. **基本的なメッセージAPI呼び出し**
   ```typescript
   import Anthropic from '@anthropic-ai/sdk';
   const client = new Anthropic();
   const message = await client.messages.create({...});
   ```
   - 使用ディレクトリ: `index.*`, `resources/messages.*`, `core.*`

2. **ストリーミング**
   ```typescript
   const stream = client.messages.stream({...});
   ```
   - 使用ディレクトリ: `lib/MessageStream.*`, `streaming.*`, `internal/decoders/`

3. **バッチ処理**
   ```typescript
   await client.beta.messages.batches.create({...});
   ```
   - 使用ディレクトリ: `resources/beta/messages/batches.*`

4. **環境の手動選択**
   ```typescript
   import '@anthropic-ai/sdk/shims/node';
   import Anthropic from '@anthropic-ai/sdk';
   ```
   - 使用ディレクトリ: `shims/node.*`, `_shims/`

## まとめ

`@anthropic-ai/sdk`パッケージは、以下のように構造化されています：

- **コア機能**: ルートディレクトリのモジュール群
- **環境対応**: `_shims/`と`shims/`で複数ランタイムをサポート
- **API実装**: `resources/`にエンドポイント実装
- **ユーティリティ**: `lib/`にストリーミングヘルパー
- **内部機能**: `internal/`にデコーダー
- **ベンダリング**: `_vendor/`に外部ライブラリ
- **開発用**: `src/`にTypeScriptソースコード

この構造により、TypeScript/JavaScriptのあらゆるランタイム環境で、統一されたインターフェースでAnthropic APIを利用できます。
