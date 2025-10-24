# Anthropic SDK Resources Catalog

このドキュメントは、`node_modules/@anthropic-ai/sdk/resources`ディレクトリに含まれるすべてのクラス、インターフェース、型定義のカタログです。

## 目次

1. [Main Resources](#main-resources)
2. [Completions API](#completions-api)
3. [Messages API](#messages-api)
4. [Beta Features](#beta-features)
   - [Beta Core](#beta-core)
   - [Beta Messages](#beta-messages)
   - [Message Batches](#message-batches)
   - [Prompt Caching](#prompt-caching)

---

## Main Resources

### ファイル: `resources/index.d.ts`

このファイルは、Anthropic SDK のすべてのリソースモジュールからの型とクラスを再エクスポートしています。

**エクスポート:**
- Beta関連の型とクラス
- Completions API
- Messages API

---

## Completions API

### ファイル: `resources/completions.d.ts`

レガシーなText Completions APIを提供します。Anthropicは今後Messages APIの使用を推奨しています。

### クラス

#### `Completions`
- **継承:** `APIResource`
- **説明:** テキスト補完を作成するためのレガシーAPI
- **メソッド:**
  - `create(body, options)`: テキスト補完を作成（ストリーミング/非ストリーミング対応）

### インターフェース

#### `Completion`
テキスト補完のレスポンスを表します。

**プロパティ:**
- `id: string` - 一意のオブジェクト識別子
- `completion: string` - 生成された補完テキスト
- `model: Model` - 使用されたモデル
- `stop_reason: string | null` - 停止理由（`"stop_sequence"`, `"max_tokens"`など）
- `type: 'completion'` - オブジェクトタイプ

#### `CompletionCreateParamsBase`
補完作成リクエストのベースパラメータ。

**プロパティ:**
- `max_tokens_to_sample: number` - 生成する最大トークン数
- `model: Model` - 使用するモデル
- `prompt: string` - プロンプトテキスト
- `metadata?: Metadata` - メタデータ
- `stop_sequences?: Array<string>` - 停止シーケンス
- `stream?: boolean` - ストリーミングの有効化
- `temperature?: number` - ランダム性（0.0-1.0）
- `top_k?: number` - トップKサンプリング
- `top_p?: number` - ニュークリアスサンプリング

### 型エイリアス

- `CompletionCreateParams` - ストリーミング/非ストリーミングのユニオン型
- `CompletionCreateParamsNonStreaming` - 非ストリーミングパラメータ
- `CompletionCreateParamsStreaming` - ストリーミングパラメータ

---

## Messages API

### ファイル: `resources/messages.d.ts`

現在推奨されているMessages APIを提供します。構造化されたメッセージを使用してClaudeと対話します。

### クラス

#### `Messages`
- **継承:** `APIResource`
- **説明:** メッセージの作成とストリーミングを管理
- **メソッド:**
  - `create(body, options)`: メッセージを作成（ストリーミング/非ストリーミング対応）
  - `stream(body, options)`: MessageStreamオブジェクトを作成

### インターフェース

#### `Message`
完全なメッセージレスポンスを表します。

**プロパティ:**
- `id: string` - 一意のメッセージID
- `content: Array<ContentBlock>` - コンテンツブロックの配列
- `model: Model` - 使用されたモデル
- `role: 'assistant'` - 役割（常にassistant）
- `stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null` - 停止理由
- `stop_sequence: string | null` - 停止シーケンス
- `type: 'message'` - オブジェクトタイプ
- `usage: Usage` - トークン使用状況

#### `MessageParam`
入力メッセージパラメータ。

**プロパティ:**
- `content: string | Array<ContentBlockParam>` - メッセージコンテンツ
- `role: 'user' | 'assistant'` - ユーザーまたはアシスタント

#### `ContentBlock`
レスポンスコンテンツブロック（TextBlockまたはToolUseBlock）。

#### `TextBlock`
テキストコンテンツブロック。

**プロパティ:**
- `text: string` - テキスト内容
- `type: 'text'` - ブロックタイプ

#### `TextBlockParam`
テキスト入力ブロック。

**プロパティ:**
- `text: string` - テキスト内容
- `type: 'text'` - ブロックタイプ

#### `ImageBlockParam`
画像入力ブロック。

**プロパティ:**
- `source: Source` - 画像ソース（base64エンコード）
- `type: 'image'` - ブロックタイプ

**ネストされた型:**
- `Source`:
  - `data: string` - base64エンコードされた画像データ
  - `media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'` - MIMEタイプ
  - `type: 'base64'` - ソースタイプ

#### `ToolUseBlock`
ツール使用ブロック。

**プロパティ:**
- `id: string` - ツール使用ID
- `input: unknown` - ツール入力
- `name: string` - ツール名
- `type: 'tool_use'` - ブロックタイプ

#### `ToolUseBlockParam`
ツール使用入力ブロック。

**プロパティ:**
- `id: string` - ツール使用ID
- `input: unknown` - ツール入力
- `name: string` - ツール名
- `type: 'tool_use'` - ブロックタイプ

#### `ToolResultBlockParam`
ツール結果ブロック。

**プロパティ:**
- `tool_use_id: string` - 対応するツール使用ID
- `type: 'tool_result'` - ブロックタイプ
- `content?: string | Array<TextBlockParam | ImageBlockParam>` - 結果コンテンツ
- `is_error?: boolean` - エラーフラグ

#### `Tool`
ツール定義。

**プロパティ:**
- `input_schema: InputSchema` - JSONスキーマ
- `name: string` - ツール名
- `description?: string` - ツールの説明

**ネストされた型:**
- `InputSchema`:
  - `type: 'object'` - スキーマタイプ
  - `properties?: unknown | null` - プロパティ定義
  - `[k: string]: unknown` - 追加プロパティ

#### `ToolChoiceAuto`
モデルがツール使用を自動決定。

**プロパティ:**
- `type: 'auto'`
- `disable_parallel_tool_use?: boolean` - 並列ツール使用の無効化

#### `ToolChoiceAny`
モデルが利用可能なツールを使用。

**プロパティ:**
- `type: 'any'`
- `disable_parallel_tool_use?: boolean` - 並列ツール使用の無効化

#### `ToolChoiceTool`
特定のツールを使用。

**プロパティ:**
- `name: string` - ツール名
- `type: 'tool'`
- `disable_parallel_tool_use?: boolean` - 並列ツール使用の無効化

#### `Usage`
トークン使用状況。

**プロパティ:**
- `input_tokens: number` - 入力トークン数
- `output_tokens: number` - 出力トークン数

#### `Metadata`
リクエストメタデータ。

**プロパティ:**
- `user_id?: string | null` - 外部ユーザーID

#### `TextDelta`
ストリーミング中のテキスト差分。

**プロパティ:**
- `text: string` - 差分テキスト
- `type: 'text_delta'`

#### `InputJSONDelta`
ストリーミング中のJSON入力差分。

**プロパティ:**
- `partial_json: string` - 部分JSON
- `type: 'input_json_delta'`

#### `MessageDeltaUsage`
メッセージ差分の使用状況。

**プロパティ:**
- `output_tokens: number` - 累積出力トークン数

#### `RawMessageStartEvent`
メッセージ開始イベント。

**プロパティ:**
- `message: Message` - メッセージオブジェクト
- `type: 'message_start'`

#### `RawMessageDeltaEvent`
メッセージ差分イベント。

**プロパティ:**
- `delta: Delta` - 差分情報
- `type: 'message_delta'`
- `usage: MessageDeltaUsage` - 使用状況

**ネストされた型:**
- `Delta`:
  - `stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null`
  - `stop_sequence: string | null`

#### `RawMessageStopEvent`
メッセージ停止イベント。

**プロパティ:**
- `type: 'message_stop'`

#### `RawContentBlockStartEvent`
コンテンツブロック開始イベント。

**プロパティ:**
- `content_block: TextBlock | ToolUseBlock`
- `index: number` - ブロックインデックス
- `type: 'content_block_start'`

#### `RawContentBlockDeltaEvent`
コンテンツブロック差分イベント。

**プロパティ:**
- `delta: TextDelta | InputJSONDelta`
- `index: number` - ブロックインデックス
- `type: 'content_block_delta'`

#### `RawContentBlockStopEvent`
コンテンツブロック停止イベント。

**プロパティ:**
- `index: number` - ブロックインデックス
- `type: 'content_block_stop'`

#### `MessageCreateParamsBase`
メッセージ作成の基本パラメータ。

**プロパティ:**
- `max_tokens: number` - 最大トークン数
- `messages: Array<MessageParam>` - 入力メッセージ
- `model: Model` - 使用モデル
- `metadata?: Metadata` - メタデータ
- `stop_sequences?: Array<string>` - 停止シーケンス
- `stream?: boolean` - ストリーミング
- `system?: string | Array<TextBlockParam>` - システムプロンプト
- `temperature?: number` - 温度（0.0-1.0）
- `tool_choice?: ToolChoice` - ツール選択戦略
- `tools?: Array<Tool>` - ツール定義
- `top_k?: number` - トップKサンプリング
- `top_p?: number` - ニュークリアスサンプリング

### 型エイリアス

- `Model` - サポートされているモデル名の文字列ユニオン型
  - `'claude-3-5-haiku-latest'`, `'claude-3-5-haiku-20241022'`
  - `'claude-3-5-sonnet-latest'`, `'claude-3-5-sonnet-20241022'`, `'claude-3-5-sonnet-20240620'`
  - `'claude-3-opus-latest'`, `'claude-3-opus-20240229'`
  - `'claude-3-sonnet-20240229'`, `'claude-3-haiku-20240307'`
  - `'claude-2.1'`, `'claude-2.0'`, `'claude-instant-1.2'`
  - カスタム文字列も許可: `(string & {})`

- `ContentBlock` - `TextBlock | ToolUseBlock`
- `ToolChoice` - `ToolChoiceAuto | ToolChoiceAny | ToolChoiceTool`
- `RawMessageStreamEvent` - すべてのストリーミングイベントのユニオン型
- `MessageCreateParams` - `MessageCreateParamsNonStreaming | MessageCreateParamsStreaming`
- `MessageStreamParams` - `MessageCreateParamsBase`と同じ
- `InputJsonDelta` - `InputJSONDelta`のエイリアス
- `ContentBlockDeltaEvent` - `RawContentBlockDeltaEvent`のエイリアス
- `ContentBlockStartEvent` - `RawContentBlockStartEvent`のエイリアス
- `ContentBlockStopEvent` - `RawContentBlockStopEvent`のエイリアス
- `MessageDeltaEvent` - `RawMessageDeltaEvent`のエイリアス
- `MessageStartEvent` - `RawMessageStartEvent`のエイリアス
- `MessageStopEvent` - `RawMessageStopEvent`のエイリアス
- `MessageStreamEvent` - `RawMessageStreamEvent`のエイリアス

---

## Beta Features

### Beta Core

#### ファイル: `resources/beta/beta.d.ts`

Beta機能の中核となるクラスとエラー型を提供します。

### クラス

#### `Beta`
- **継承:** `APIResource`
- **説明:** Beta機能のエントリーポイント
- **プロパティ:**
  - `messages: Messages` - BetaメッセージAPI
  - `promptCaching: PromptCaching` - プロンプトキャッシング機能

### インターフェース

#### エラー型

##### `BetaInvalidRequestError`
無効なリクエストエラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'invalid_request_error'`

##### `BetaAuthenticationError`
認証エラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'authentication_error'`

##### `BetaPermissionError`
権限エラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'permission_error'`

##### `BetaNotFoundError`
リソース未検出エラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'not_found_error'`

##### `BetaRateLimitError`
レート制限エラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'rate_limit_error'`

##### `BetaAPIError`
APIエラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'api_error'`

##### `BetaOverloadedError`
過負荷エラー。

**プロパティ:**
- `message: string` - エラーメッセージ
- `type: 'overloaded_error'`

##### `BetaErrorResponse`
エラーレスポンス。

**プロパティ:**
- `error: BetaError` - エラーオブジェクト
- `type: 'error'`

### 型エイリアス

- `AnthropicBeta` - Betaバージョンの文字列
  - `'message-batches-2024-09-24'`
  - `'prompt-caching-2024-07-31'`
  - `'computer-use-2024-10-22'`
  - `'pdfs-2024-09-25'`
  - `'token-counting-2024-11-01'`
  - カスタム文字列も許可

- `BetaError` - すべてのBetaエラー型のユニオン

---

### Beta Messages

#### ファイル: `resources/beta/messages/messages.d.ts`

Beta版のMessages APIを提供します。追加機能とキャッシュコントロールをサポートします。

### クラス

#### `Messages`
- **継承:** `APIResource`
- **説明:** BetaメッセージAPI
- **プロパティ:**
  - `batches: Batches` - バッチ処理API
- **メソッド:**
  - `create(params, options)`: メッセージを作成
  - `countTokens(params, options)`: トークン数をカウント

### インターフェース

#### `BetaMessage`
Betaメッセージレスポンス。

**プロパティ:**
- `id: string` - メッセージID
- `content: Array<BetaContentBlock>` - コンテンツブロック
- `model: Model` - モデル
- `role: 'assistant'` - 役割
- `stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null`
- `stop_sequence: string | null`
- `type: 'message'`
- `usage: BetaUsage` - 使用状況（キャッシュ情報を含む）

#### `BetaMessageParam`
Beta入力メッセージ。

**プロパティ:**
- `content: string | Array<BetaContentBlockParam>`
- `role: 'user' | 'assistant'`

#### `BetaUsage`
キャッシュ対応の使用状況。

**プロパティ:**
- `cache_creation_input_tokens: number | null` - キャッシュ作成トークン数
- `cache_read_input_tokens: number | null` - キャッシュ読み取りトークン数
- `input_tokens: number` - 入力トークン数
- `output_tokens: number` - 出力トークン数

#### `BetaCacheControlEphemeral`
一時的なキャッシュコントロール。

**プロパティ:**
- `type: 'ephemeral'`

#### `BetaTextBlock`
テキストブロック。

**プロパティ:**
- `text: string`
- `type: 'text'`

#### `BetaTextBlockParam`
キャッシュ対応のテキスト入力ブロック。

**プロパティ:**
- `text: string`
- `type: 'text'`
- `cache_control?: BetaCacheControlEphemeral | null`

#### `BetaImageBlockParam`
キャッシュ対応の画像入力ブロック。

**プロパティ:**
- `source: Source`
- `type: 'image'`
- `cache_control?: BetaCacheControlEphemeral | null`

#### `BetaBase64PDFBlock`
PDF文書ブロック。

**プロパティ:**
- `source: BetaBase64PDFSource`
- `type: 'document'`
- `cache_control?: BetaCacheControlEphemeral | null`

#### `BetaBase64PDFSource`
PDFソース。

**プロパティ:**
- `data: string` - base64エンコードされたPDFデータ
- `media_type: 'application/pdf'`
- `type: 'base64'`

#### `BetaTool`
キャッシュ対応のツール定義。

**プロパティ:**
- `input_schema: InputSchema`
- `name: string`
- `cache_control?: BetaCacheControlEphemeral | null`
- `description?: string`
- `type?: 'custom' | null`

#### `BetaToolComputerUse20241022`
コンピューター使用ツール（2024-10-22版）。

**プロパティ:**
- `display_height_px: number` - ディスプレイ高さ
- `display_width_px: number` - ディスプレイ幅
- `name: 'computer'`
- `type: 'computer_20241022'`
- `cache_control?: BetaCacheControlEphemeral | null`
- `display_number?: number | null` - X11ディスプレイ番号

#### `BetaToolBash20241022`
Bashツール（2024-10-22版）。

**プロパティ:**
- `name: 'bash'`
- `type: 'bash_20241022'`
- `cache_control?: BetaCacheControlEphemeral | null`

#### `BetaToolTextEditor20241022`
テキストエディタツール（2024-10-22版）。

**プロパティ:**
- `name: 'str_replace_editor'`
- `type: 'text_editor_20241022'`
- `cache_control?: BetaCacheControlEphemeral | null`

#### `BetaToolUseBlock`
ツール使用ブロック。

**プロパティ:**
- `id: string`
- `input: unknown`
- `name: string`
- `type: 'tool_use'`

#### `BetaToolUseBlockParam`
キャッシュ対応のツール使用入力ブロック。

**プロパティ:**
- `id: string`
- `input: unknown`
- `name: string`
- `type: 'tool_use'`
- `cache_control?: BetaCacheControlEphemeral | null`

#### `BetaToolResultBlockParam`
キャッシュ対応のツール結果ブロック。

**プロパティ:**
- `tool_use_id: string`
- `type: 'tool_result'`
- `cache_control?: BetaCacheControlEphemeral | null`
- `content?: string | Array<BetaTextBlockParam | BetaImageBlockParam>`
- `is_error?: boolean`

#### `BetaToolChoiceAuto`
自動ツール選択。

**プロパティ:**
- `type: 'auto'`
- `disable_parallel_tool_use?: boolean`

#### `BetaToolChoiceAny`
任意のツール選択。

**プロパティ:**
- `type: 'any'`
- `disable_parallel_tool_use?: boolean`

#### `BetaToolChoiceTool`
特定ツール選択。

**プロパティ:**
- `name: string`
- `type: 'tool'`
- `disable_parallel_tool_use?: boolean`

#### `BetaMetadata`
メタデータ。

**プロパティ:**
- `user_id?: string | null`

#### `BetaMessageTokensCount`
トークン数カウント結果。

**プロパティ:**
- `input_tokens: number` - 合計入力トークン数

#### `BetaInputJSONDelta`
JSON入力差分。

**プロパティ:**
- `partial_json: string`
- `type: 'input_json_delta'`

#### `BetaMessageDeltaUsage`
メッセージ差分の使用状況。

**プロパティ:**
- `output_tokens: number`

#### ストリーミングイベント

- `BetaRawMessageStartEvent`
- `BetaRawMessageDeltaEvent`
- `BetaRawMessageStopEvent`
- `BetaRawContentBlockStartEvent`
- `BetaRawContentBlockDeltaEvent`
- `BetaRawContentBlockStopEvent`

#### `MessageCreateParamsBase`
Beta版メッセージ作成パラメータ。

**主要プロパティ:**
- `max_tokens: number`
- `messages: Array<BetaMessageParam>`
- `model: Model`
- `metadata?: BetaMetadata`
- `stop_sequences?: Array<string>`
- `stream?: boolean`
- `system?: string | Array<BetaTextBlockParam>`
- `temperature?: number`
- `tool_choice?: BetaToolChoice`
- `tools?: Array<BetaToolUnion>`
- `top_k?: number`
- `top_p?: number`
- `betas?: Array<AnthropicBeta>` - Betaバージョン指定

#### `MessageCountTokensParams`
トークンカウントパラメータ。

**プロパティ:**
- `messages: Array<BetaMessageParam>`
- `model: Model`
- `system?: string | Array<BetaTextBlockParam>`
- `tool_choice?: BetaToolChoice`
- `tools?: Array<BetaTool | BetaToolComputerUse20241022 | BetaToolBash20241022 | BetaToolTextEditor20241022>`
- `betas?: Array<AnthropicBeta>`

### 型エイリアス

- `BetaContentBlock` - `BetaTextBlock | BetaToolUseBlock`
- `BetaContentBlockParam` - すべてのコンテンツブロックパラメータのユニオン
- `BetaToolUnion` - すべてのツールタイプのユニオン
- `BetaToolChoice` - すべてのツール選択戦略のユニオン
- `BetaRawMessageStreamEvent` - すべてのストリーミングイベントのユニオン
- `MessageCreateParams` - `MessageCreateParamsNonStreaming | MessageCreateParamsStreaming`

---

### Message Batches

#### ファイル: `resources/beta/messages/batches.d.ts`

メッセージのバッチ処理機能を提供します。複数のメッセージリクエストを一度に処理できます。

### クラス

#### `Batches`
- **継承:** `APIResource`
- **説明:** メッセージバッチAPI
- **メソッド:**
  - `create(params, options)`: バッチを作成
  - `retrieve(messageBatchId, params?, options?)`: バッチを取得
  - `list(params?, options?)`: バッチをリスト表示
  - `cancel(messageBatchId, params?, options?)`: バッチをキャンセル
  - `results(messageBatchId, params?, options?)`: バッチ結果をストリーム

#### `BetaMessageBatchesPage`
- **継承:** `Page<BetaMessageBatch>`
- **説明:** ページネーション対応のバッチリスト

### インターフェース

#### `BetaMessageBatch`
メッセージバッチ。

**プロパティ:**
- `id: string` - バッチID
- `archived_at: string | null` - アーカイブ日時（RFC 3339）
- `cancel_initiated_at: string | null` - キャンセル開始日時
- `created_at: string` - 作成日時
- `ended_at: string | null` - 処理終了日時
- `expires_at: string` - 有効期限（作成から24時間）
- `processing_status: 'in_progress' | 'canceling' | 'ended'` - 処理ステータス
- `request_counts: BetaMessageBatchRequestCounts` - リクエスト数の集計
- `results_url: string | null` - 結果ファイルのURL（.jsonl形式）
- `type: 'message_batch'`

#### `BetaMessageBatchRequestCounts`
バッチ内のリクエスト数集計。

**プロパティ:**
- `canceled: number` - キャンセルされたリクエスト数
- `errored: number` - エラーが発生したリクエスト数
- `expired: number` - 期限切れのリクエスト数
- `processing: number` - 処理中のリクエスト数
- `succeeded: number` - 成功したリクエスト数

#### `BetaMessageBatchIndividualResponse`
個別のバッチリクエストレスポンス。

**プロパティ:**
- `custom_id: string` - 開発者提供のカスタムID
- `result: BetaMessageBatchResult` - 処理結果

#### `BetaMessageBatchSucceededResult`
成功した結果。

**プロパティ:**
- `message: BetaMessage` - 生成されたメッセージ
- `type: 'succeeded'`

#### `BetaMessageBatchErroredResult`
エラー結果。

**プロパティ:**
- `error: BetaErrorResponse` - エラー情報
- `type: 'errored'`

#### `BetaMessageBatchCanceledResult`
キャンセル結果。

**プロパティ:**
- `type: 'canceled'`

#### `BetaMessageBatchExpiredResult`
期限切れ結果。

**プロパティ:**
- `type: 'expired'`

#### `BatchCreateParams`
バッチ作成パラメータ。

**プロパティ:**
- `requests: Array<Request>` - リクエストの配列
- `betas?: Array<AnthropicBeta>` - Betaバージョン

**ネストされた型:**
- `Request`:
  - `custom_id: string` - カスタムID（バッチ内で一意）
  - `params: Omit<MessageCreateParamsNonStreaming, 'betas'>` - メッセージ作成パラメータ

#### `BatchRetrieveParams`, `BatchListParams`, `BatchCancelParams`, `BatchResultsParams`
各操作のパラメータ。

**共通プロパティ:**
- `betas?: Array<AnthropicBeta>` - Betaバージョン

### 型エイリアス

- `BetaMessageBatchResult` - すべてのバッチ結果タイプのユニオン

---

### Prompt Caching

#### ファイル: `resources/beta/prompt-caching/`

プロンプトキャッシング機能を提供します。頻繁に使用されるプロンプトをキャッシュしてコストとレイテンシを削減します。

### クラス

#### `PromptCaching`
- **継承:** `APIResource`
- **説明:** プロンプトキャッシングAPI
- **プロパティ:**
  - `messages: Messages` - キャッシング対応メッセージAPI

#### `Messages`
- **継承:** `APIResource`
- **説明:** キャッシング対応メッセージAPI
- **メソッド:**
  - `create(params, options)`: キャッシング対応メッセージ作成
  - `stream(body, options)`: PromptCachingBetaMessageStreamを作成

### インターフェース

#### `PromptCachingBetaMessage`
キャッシング対応メッセージレスポンス。

**プロパティ:**
- `id: string`
- `content: Array<ContentBlock>`
- `model: Model`
- `role: 'assistant'`
- `stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null`
- `stop_sequence: string | null`
- `type: 'message'`
- `usage: PromptCachingBetaUsage` - キャッシュ使用状況

#### `PromptCachingBetaUsage`
キャッシング対応使用状況。

**プロパティ:**
- `cache_creation_input_tokens: number | null` - キャッシュ作成トークン
- `cache_read_input_tokens: number | null` - キャッシュ読み取りトークン
- `input_tokens: number` - 入力トークン
- `output_tokens: number` - 出力トークン

#### `PromptCachingBetaCacheControlEphemeral`
一時キャッシュコントロール。

**プロパティ:**
- `type: 'ephemeral'`

#### `PromptCachingBetaTextBlockParam`
キャッシュ対応テキストブロック。

**プロパティ:**
- `text: string`
- `type: 'text'`
- `cache_control?: PromptCachingBetaCacheControlEphemeral | null`

#### `PromptCachingBetaImageBlockParam`
キャッシュ対応画像ブロック。

**プロパティ:**
- `source: Source`
- `type: 'image'`
- `cache_control?: PromptCachingBetaCacheControlEphemeral | null`

#### `PromptCachingBetaTool`
キャッシュ対応ツール。

**プロパティ:**
- `input_schema: InputSchema`
- `name: string`
- `cache_control?: PromptCachingBetaCacheControlEphemeral | null`
- `description?: string`

#### `PromptCachingBetaMessageParam`
キャッシング対応入力メッセージ。

**プロパティ:**
- `content: string | Array<PromptCachingBetaTextBlockParam | PromptCachingBetaImageBlockParam | PromptCachingBetaToolUseBlockParam | PromptCachingBetaToolResultBlockParam>`
- `role: 'user' | 'assistant'`

#### `PromptCachingBetaToolUseBlockParam`
キャッシュ対応ツール使用ブロック。

**プロパティ:**
- `id: string`
- `input: unknown`
- `name: string`
- `type: 'tool_use'`
- `cache_control?: PromptCachingBetaCacheControlEphemeral | null`

#### `PromptCachingBetaToolResultBlockParam`
キャッシュ対応ツール結果ブロック。

**プロパティ:**
- `tool_use_id: string`
- `type: 'tool_result'`
- `cache_control?: PromptCachingBetaCacheControlEphemeral | null`
- `content?: string | Array<PromptCachingBetaTextBlockParam | PromptCachingBetaImageBlockParam>`
- `is_error?: boolean`

#### ストリーミングイベント

#### `RawPromptCachingBetaMessageStartEvent`
メッセージ開始イベント。

**プロパティ:**
- `message: PromptCachingBetaMessage`
- `type: 'message_start'`

#### `MessageCreateParamsBase`
キャッシング対応メッセージ作成パラメータ。

**主要プロパティ:**
- `max_tokens: number`
- `messages: Array<PromptCachingBetaMessageParam>`
- `model: Model`
- `metadata?: Metadata`
- `stop_sequences?: Array<string>`
- `stream?: boolean`
- `system?: string | Array<PromptCachingBetaTextBlockParam>` - キャッシュ可能
- `temperature?: number`
- `tool_choice?: ToolChoice`
- `tools?: Array<PromptCachingBetaTool>` - キャッシュ可能
- `top_k?: number`
- `top_p?: number`
- `betas?: Array<AnthropicBeta>`

### 型エイリアス

- `RawPromptCachingBetaMessageStreamEvent` - キャッシング対応ストリーミングイベントのユニオン
- `MessageCreateParams` - `MessageCreateParamsNonStreaming | MessageCreateParamsStreaming`
- `MessageStreamParams` - `MessageCreateParamsBase`と同じ

---

## Top Level

### ファイル: `resources/top-level.d.ts`

このファイルは空で、プレースホルダーとして存在します。

---

## 使用例

### 基本的なメッセージ作成

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude!' }
  ],
});

console.log(message.content);
```

### ストリーミング

```typescript
const stream = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Tell me a story.' }
  ],
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    console.log(event.delta.text);
  }
}
```

### ツール使用

```typescript
const message = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather in a location',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA'
          }
        },
        required: ['location']
      }
    }
  ],
  messages: [
    { role: 'user', content: 'What is the weather in Tokyo?' }
  ],
});
```

### プロンプトキャッシング

```typescript
const message = await client.beta.promptCaching.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: 'Long system prompt...',
      cache_control: { type: 'ephemeral' }
    }
  ],
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  betas: ['prompt-caching-2024-07-31'],
});

console.log(message.usage.cache_read_input_tokens);
```

### バッチ処理

```typescript
const batch = await client.beta.messages.batches.create({
  requests: [
    {
      custom_id: 'request-1',
      params: {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: 'Hello!' }
        ]
      }
    },
    {
      custom_id: 'request-2',
      params: {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: 'Goodbye!' }
        ]
      }
    }
  ],
  betas: ['message-batches-2024-09-24'],
});

// バッチ処理の完了を待つ
const completedBatch = await client.beta.messages.batches.retrieve(batch.id);

// 結果を取得
const results = await client.beta.messages.batches.results(batch.id);
for await (const result of results) {
  console.log(result.custom_id, result.result);
}
```

### トークンカウント

```typescript
const count = await client.beta.messages.countTokens({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
  betas: ['token-counting-2024-11-01'],
});

console.log(`Total tokens: ${count.input_tokens}`);
```

---

## まとめ

このカタログは、Anthropic SDK の `resources` ディレクトリに含まれるすべての主要な型定義を網羅しています。

### 主要な機能領域:

1. **Messages API** - 推奨される現代的なAPI
2. **Completions API** - レガシーAPI（非推奨）
3. **Beta Features**:
   - プロンプトキャッシング - コストとレイテンシを削減
   - メッセージバッチ - 複数のリクエストを効率的に処理
   - コンピューター使用ツール - Claude が画面を操作
   - PDFサポート - PDF文書の処理
   - トークンカウント - 事前にトークン数を確認

### キーポイント:

- すべてのAPI は TypeScript の型安全性をサポート
- ストリーミングと非ストリーミングモードの両方をサポート
- ツール使用により Claude の機能を拡張可能
- キャッシュコントロールでパフォーマンス最適化
- バッチ処理で大量のリクエストを効率的に処理

---

**生成日:** 2025-10-24
**SDK バージョン:** @anthropic-ai/sdk (latest)
