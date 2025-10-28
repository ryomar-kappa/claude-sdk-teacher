import Anthropic from '@anthropic-ai/sdk';

/**
 * Agentクエリのビルダー型定義
 *
 * この型定義により、Anthropic Messages APIへのクエリパラメータを
 * 型安全かつ簡単に構築することができます。
 */

/**
 * 基本的なクエリパラメータ（必須フィールド含む）
 */
export interface AgentQueryBase {
  /** 使用するモデル（例: 'claude-3-5-sonnet-20241022'） */
  model: string;

  /** 生成する最大トークン数 */
  maxTokens: number;

  /** メッセージ履歴（user/assistantのやり取り） */
  messages: Anthropic.MessageParam[];
}

/**
 * オプションのクエリパラメータ
 */
export interface AgentQueryOptions {
  /** システムプロンプト（エージェントの役割・指示） */
  system?: string | Anthropic.TextBlockParam[];

  /** 使用可能なツール定義 */
  tools?: Anthropic.Tool[];

  /** ツールの選択方法 */
  toolChoice?: Anthropic.ToolChoice;

  /** 温度パラメータ（0.0-1.0、ランダム性の制御） */
  temperature?: number;

  /** ストリーミング有効化 */
  stream?: boolean;

  /** Top-p サンプリングパラメータ */
  topP?: number;

  /** Top-k サンプリングパラメータ */
  topK?: number;

  /** カスタム停止シーケンス */
  stopSequences?: string[];

  /** 拡張思考設定 */
  thinking?: Anthropic.MessageCreateParamsNonStreaming['thinking'];

  /** メタデータ */
  metadata?: Anthropic.MessageCreateParamsNonStreaming['metadata'];
}

/**
 * 完全なAgentクエリパラメータ
 */
export type AgentQuery = AgentQueryBase & AgentQueryOptions;

/**
 * デフォルト設定
 */
export const DEFAULT_AGENT_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 1.0,
} as const;

/**
 * AgentQueryBuilderクラス
 *
 * Fluent APIスタイルでクエリパラメータを構築できるビルダークラス。
 * メソッドチェーンにより、読みやすく型安全なクエリ構築が可能です。
 *
 * @example
 * ```typescript
 * const query = new AgentQueryBuilder()
 *   .setModel('claude-3-5-sonnet-20241022')
 *   .setMaxTokens(2048)
 *   .addMessage('user', 'こんにちは')
 *   .setSystemPrompt('あなたは親切なアシスタントです')
 *   .build();
 * ```
 */
export class AgentQueryBuilder {
  private query: Partial<AgentQuery>;

  constructor(initialQuery?: Partial<AgentQuery>) {
    this.query = {
      model: DEFAULT_AGENT_CONFIG.model,
      maxTokens: DEFAULT_AGENT_CONFIG.maxTokens,
      messages: [],
      ...initialQuery,
    };
  }

  /**
   * モデルを設定
   */
  setModel(model: string): this {
    this.query.model = model;
    return this;
  }

  /**
   * 最大トークン数を設定
   */
  setMaxTokens(maxTokens: number): this {
    this.query.maxTokens = maxTokens;
    return this;
  }

  /**
   * システムプロンプトを設定
   */
  setSystemPrompt(system: string | Anthropic.TextBlockParam[]): this {
    this.query.system = system;
    return this;
  }

  /**
   * メッセージ履歴を設定（既存の履歴を上書き）
   */
  setMessages(messages: Anthropic.MessageParam[]): this {
    this.query.messages = messages;
    return this;
  }

  /**
   * メッセージを追加（既存の履歴に追加）
   */
  addMessage(role: 'user' | 'assistant', content: string | Anthropic.ContentBlock[]): this {
    if (!this.query.messages) {
      this.query.messages = [];
    }
    this.query.messages.push({ role, content });
    return this;
  }

  /**
   * ユーザーメッセージを追加（便利メソッド）
   */
  addUserMessage(content: string): this {
    return this.addMessage('user', content);
  }

  /**
   * アシスタントメッセージを追加（便利メソッド）
   */
  addAssistantMessage(content: string | Anthropic.ContentBlock[]): this {
    return this.addMessage('assistant', content);
  }

  /**
   * ツールを設定
   */
  setTools(tools: Anthropic.Tool[]): this {
    this.query.tools = tools;
    return this;
  }

  /**
   * ツールを追加
   */
  addTool(tool: Anthropic.Tool): this {
    if (!this.query.tools) {
      this.query.tools = [];
    }
    this.query.tools.push(tool);
    return this;
  }

  /**
   * ツールの選択方法を設定
   */
  setToolChoice(toolChoice: Anthropic.ToolChoice): this {
    this.query.toolChoice = toolChoice;
    return this;
  }

  /**
   * 温度パラメータを設定
   */
  setTemperature(temperature: number): this {
    this.query.temperature = temperature;
    return this;
  }

  /**
   * ストリーミングを有効化
   */
  enableStreaming(): this {
    this.query.stream = true;
    return this;
  }

  /**
   * Top-pパラメータを設定
   */
  setTopP(topP: number): this {
    this.query.topP = topP;
    return this;
  }

  /**
   * Top-kパラメータを設定
   */
  setTopK(topK: number): this {
    this.query.topK = topK;
    return this;
  }

  /**
   * 停止シーケンスを設定
   */
  setStopSequences(stopSequences: string[]): this {
    this.query.stopSequences = stopSequences;
    return this;
  }

  /**
   * 拡張思考を設定
   */
  setThinking(thinking: Anthropic.MessageCreateParamsNonStreaming['thinking']): this {
    this.query.thinking = thinking;
    return this;
  }

  /**
   * メタデータを設定
   */
  setMetadata(metadata: Anthropic.MessageCreateParamsNonStreaming['metadata']): this {
    this.query.metadata = metadata;
    return this;
  }

  /**
   * クエリパラメータをビルドして返す
   */
  build(): Anthropic.MessageCreateParamsNonStreaming {
    if (!this.query.model) {
      throw new Error('model is required');
    }
    if (!this.query.maxTokens) {
      throw new Error('maxTokens is required');
    }
    if (!this.query.messages || this.query.messages.length === 0) {
      throw new Error('messages are required');
    }

    // Anthropic SDK形式に変換（キャメルケースからスネークケースへ）
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.query.model,
      max_tokens: this.query.maxTokens,
      messages: this.query.messages,
    };

    if (this.query.system !== undefined) params.system = this.query.system;
    if (this.query.tools !== undefined) params.tools = this.query.tools;
    if (this.query.toolChoice !== undefined) params.tool_choice = this.query.toolChoice;
    if (this.query.temperature !== undefined) params.temperature = this.query.temperature;
    if (this.query.topP !== undefined) params.top_p = this.query.topP;
    if (this.query.topK !== undefined) params.top_k = this.query.topK;
    if (this.query.stopSequences !== undefined) params.stop_sequences = this.query.stopSequences;
    if (this.query.thinking !== undefined) params.thinking = this.query.thinking;
    if (this.query.metadata !== undefined) params.metadata = this.query.metadata;
    if (this.query.stream !== undefined) params.stream = this.query.stream;

    return params;
  }

  /**
   * 現在の設定をクローンして新しいビルダーを作成
   */
  clone(): AgentQueryBuilder {
    return new AgentQueryBuilder({ ...this.query });
  }
}

/**
 * ヘルパー関数: シンプルなクエリを作成
 *
 * @example
 * ```typescript
 * const query = createSimpleQuery('こんにちは、Claude!');
 * const response = await client.messages.create(query);
 * ```
 */
export function createSimpleQuery(
  userMessage: string,
  options?: Partial<AgentQueryOptions>
): Anthropic.MessageCreateParamsNonStreaming {
  return new AgentQueryBuilder()
    .addUserMessage(userMessage)
    .setSystemPrompt(options?.system || '')
    .build();
}

/**
 * ヘルパー関数: ツール使用クエリを作成
 *
 * @example
 * ```typescript
 * const query = createToolQuery('天気を調べて', [weatherTool], messages);
 * const response = await client.messages.create(query);
 * ```
 */
export function createToolQuery(
  userMessage: string,
  tools: Anthropic.Tool[],
  previousMessages?: Anthropic.MessageParam[],
  options?: Partial<AgentQueryOptions>
): Anthropic.MessageCreateParamsNonStreaming {
  const builder = new AgentQueryBuilder();

  if (previousMessages) {
    builder.setMessages(previousMessages);
  }

  return builder
    .addUserMessage(userMessage)
    .setTools(tools)
    .setSystemPrompt(options?.system || '')
    .build();
}

/**
 * ヘルパー関数: システムプロンプト付きクエリを作成
 *
 * @example
 * ```typescript
 * const query = createSystemQuery(
 *   'あなたは親切なアシスタントです',
 *   'こんにちは'
 * );
 * ```
 */
export function createSystemQuery(
  systemPrompt: string,
  userMessage: string,
  options?: Partial<AgentQueryOptions>
): Anthropic.MessageCreateParamsNonStreaming {
  return new AgentQueryBuilder()
    .setSystemPrompt(systemPrompt)
    .addUserMessage(userMessage)
    .build();
}
