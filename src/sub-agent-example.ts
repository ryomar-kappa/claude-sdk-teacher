import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * サブエージェントの設定インターフェース
 */
interface SubAgentConfig {
  name: string;
  systemPrompt: string;
  model?: string;
}

/**
 * サブエージェントのタスク
 */
interface SubAgentTask {
  agentName: string;
  prompt: string;
}

/**
 * サブエージェントの結果
 */
interface SubAgentResult {
  agentName: string;
  result: string;
  error?: string;
}

/**
 * サブエージェントクラス
 *
 * 特定の役割に特化したAIエージェント。
 * カスタムシステムプロンプトにより、専門性を持たせることができる。
 */
class SubAgent {
  private client: Anthropic;
  private config: SubAgentConfig;

  constructor(client: Anthropic, config: SubAgentConfig) {
    this.client = client;
    this.config = {
      model: 'claude-3-5-sonnet-20241022',
      ...config,
    };
  }

  /**
   * タスクを実行
   */
  async execute(userPrompt: string): Promise<string> {
    console.log(`\n🤖 [${this.config.name}] タスク実行開始`);
    console.log(`📝 プロンプト: ${userPrompt.substring(0, 100)}...`);

    try {
      const response = await this.client.messages.create({
        model: this.config.model!,
        max_tokens: 4096,
        system: this.config.systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      const result = textContent?.text || '';
      console.log(`✅ [${this.config.name}] タスク完了 (${result.length}文字)`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [${this.config.name}] エラー: ${errorMessage}`);
      throw error;
    }
  }

  getName(): string {
    return this.config.name;
  }
}

/**
 * サブエージェントオーケストレーター
 *
 * 複数のサブエージェントを管理し、タスクを委譲する親エージェント。
 * タスクを分解し、適切なサブエージェントに割り当て、結果を統合する。
 */
class SubAgentOrchestrator {
  private client: Anthropic;
  private subAgents: Map<string, SubAgent>;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.subAgents = new Map();
  }

  /**
   * サブエージェントを登録
   */
  registerSubAgent(config: SubAgentConfig): void {
    const subAgent = new SubAgent(this.client, config);
    this.subAgents.set(config.name, subAgent);
    console.log(`✅ サブエージェント登録: ${config.name}`);
  }

  /**
   * 単一のサブエージェントにタスクを委譲
   */
  async delegateToSubAgent(agentName: string, prompt: string): Promise<string> {
    const subAgent = this.subAgents.get(agentName);
    if (!subAgent) {
      throw new Error(`サブエージェント "${agentName}" が見つかりません`);
    }

    return await subAgent.execute(prompt);
  }

  /**
   * 複数のサブエージェントに並列でタスクを委譲
   */
  async delegateParallel(tasks: SubAgentTask[]): Promise<SubAgentResult[]> {
    console.log(`\n🚀 並列実行開始: ${tasks.length}個のタスク`);
    console.log('='.repeat(70));

    const promises = tasks.map(async (task) => {
      try {
        const result = await this.delegateToSubAgent(task.agentName, task.prompt);
        return {
          agentName: task.agentName,
          result,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          agentName: task.agentName,
          result: '',
          error: errorMessage,
        };
      }
    });

    const results = await Promise.all(promises);
    console.log('='.repeat(70));
    console.log(`✨ 並列実行完了: ${results.length}個の結果`);

    return results;
  }

  /**
   * オーケストレーターエージェント自身がタスクを分析して実行計画を立てる
   */
  async orchestrate(userRequest: string): Promise<string> {
    console.log('\n🎯 オーケストレーター起動');
    console.log(`📋 ユーザーリクエスト: ${userRequest}`);
    console.log('='.repeat(70));

    // オーケストレーター用のシステムプロンプト
    const orchestratorPrompt = `あなたはタスクオーケストレーターです。
ユーザーのリクエストを分析し、以下のサブエージェントのいずれか、または複数に委譲する実行計画を立ててください。

利用可能なサブエージェント:
${Array.from(this.subAgents.keys()).map(name => `- ${name}`).join('\n')}

実行計画をJSON形式で出力してください：
{
  "plan": "実行計画の説明",
  "tasks": [
    {
      "agentName": "エージェント名",
      "prompt": "サブエージェントへの具体的な指示"
    }
  ],
  "parallel": true/false (並列実行が可能かどうか)
}

JSON以外の説明は不要です。JSONのみを返してください。`;

    // オーケストレーターがタスクを分析
    const planResponse = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: orchestratorPrompt,
      messages: [
        {
          role: 'user',
          content: userRequest,
        },
      ],
    });

    const planText = planResponse.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )?.text || '';

    console.log('\n📊 実行計画:', planText);

    // JSONを抽出（コードブロックがある場合は除去）
    let jsonText = planText.trim();
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const plan = JSON.parse(jsonText);

    console.log(`\n✅ 計画確定: ${plan.tasks.length}個のタスク`);
    console.log(`⚡ 並列実行: ${plan.parallel ? 'はい' : 'いいえ'}`);

    // タスクを実行
    let results: SubAgentResult[];
    if (plan.parallel && plan.tasks.length > 1) {
      results = await this.delegateParallel(plan.tasks);
    } else {
      // 順次実行
      results = [];
      for (const task of plan.tasks) {
        const result = await this.delegateToSubAgent(task.agentName, task.prompt);
        results.push({
          agentName: task.agentName,
          result,
        });
      }
    }

    // 結果を統合
    console.log('\n🔄 結果を統合中...');
    const synthesisPrompt = `以下のサブエージェントの実行結果を統合して、ユーザーのリクエストに対する最終的な回答を作成してください。

元のリクエスト: ${userRequest}

実行結果:
${results.map(r => `
[${r.agentName}]
${r.result}
${r.error ? `エラー: ${r.error}` : ''}
`).join('\n---\n')}

統合された回答を作成してください。`;

    const finalResponse = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: synthesisPrompt,
        },
      ],
    });

    const finalText = finalResponse.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )?.text || '';

    console.log('='.repeat(70));
    console.log('✨ オーケストレーション完了');

    return finalText;
  }

  /**
   * 登録されているサブエージェントの一覧を取得
   */
  listSubAgents(): string[] {
    return Array.from(this.subAgents.keys());
  }
}

/**
 * デモ実行
 */
async function demo() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       Claude SDK - サブエージェントパターンのデモ            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ エラー: ANTHROPIC_API_KEYが設定されていません');
    console.log('.envファイルを作成して、ANTHROPIC_API_KEY=your-api-keyを設定してください');
    return;
  }

  // オーケストレーターを作成
  const orchestrator = new SubAgentOrchestrator(process.env.ANTHROPIC_API_KEY);

  // サブエージェントを登録
  orchestrator.registerSubAgent({
    name: 'writer',
    systemPrompt: `あなたは創造的なライターです。
与えられたトピックについて、魅力的で読みやすいコンテンツを作成します。
具体的な例を含め、読者を引き込む文章を心がけてください。`,
  });

  orchestrator.registerSubAgent({
    name: 'reviewer',
    systemPrompt: `あなたは厳格なレビュアーです。
与えられたコンテンツを批判的に分析し、改善点を指摘します。
文法、論理性、明確さ、説得力の観点から評価してください。`,
  });

  orchestrator.registerSubAgent({
    name: 'analyst',
    systemPrompt: `あなたはデータアナリストです。
与えられた情報を分析し、重要なインサイトや統計を抽出します。
数値的な分析や傾向の発見に焦点を当ててください。`,
  });

  orchestrator.registerSubAgent({
    name: 'summarizer',
    systemPrompt: `あなたは要約の専門家です。
長い文章を簡潔にまとめ、重要なポイントを箇条書きで抽出します。
読者が短時間で内容を理解できるようにしてください。`,
  });

  console.log('\n📋 登録されたサブエージェント:', orchestrator.listSubAgents().join(', '));

  try {
    // 例1: 単一サブエージェントへの委譲
    console.log('\n\n📌 例1: 単一サブエージェントへの委譲\n');
    console.log('─'.repeat(70));
    const result1 = await orchestrator.delegateToSubAgent(
      'writer',
      '人工知能の未来について、300文字程度のブログ記事を書いてください。'
    );
    console.log('\n📄 結果:\n', result1);

    // 例2: 並列実行
    console.log('\n\n📌 例2: 複数サブエージェントへの並列委譲\n');
    console.log('─'.repeat(70));
    const parallelTasks: SubAgentTask[] = [
      {
        agentName: 'writer',
        prompt: 'リモートワークの利点について100文字で説明してください。',
      },
      {
        agentName: 'analyst',
        prompt: 'リモートワークの導入率の傾向について分析してください。',
      },
      {
        agentName: 'reviewer',
        prompt: 'リモートワークの課題点を3つ挙げてください。',
      },
    ];

    const parallelResults = await orchestrator.delegateParallel(parallelTasks);
    parallelResults.forEach((result) => {
      console.log(`\n📄 [${result.agentName}]:`, result.result);
      if (result.error) {
        console.log(`❌ エラー: ${result.error}`);
      }
    });

    // 例3: 自動オーケストレーション
    console.log('\n\n📌 例3: 自動オーケストレーション（タスク分解と委譲）\n');
    console.log('─'.repeat(70));
    const orchestrationResult = await orchestrator.orchestrate(
      'クラウドコンピューティングについて詳しく解説し、その内容をレビューして、最後に要約してください。'
    );
    console.log('\n📄 最終結果:\n', orchestrationResult);

    console.log('\n\n✨ すべてのデモが完了しました！');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  }
}

// メイン実行
if (require.main === module) {
  demo().catch(console.error);
}

export { SubAgent, SubAgentOrchestrator, SubAgentConfig, SubAgentTask, SubAgentResult };
