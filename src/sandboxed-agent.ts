import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

/**
 * サンドボックス化されたファイルシステムワーカー
 *
 * 指定されたディレクトリ内でのみファイル操作を許可し、
 * 外部へのアクセスを防ぐ安全なファイル操作クラス
 */
class SandboxedFileSystem {
  private workDir: string;
  private allowedExtensions: string[];

  /**
   * @param workDir - 作業ディレクトリ（絶対パスまたは相対パス）
   * @param allowedExtensions - 許可するファイル拡張子（デフォルト: .txt, .json, .md）
   */
  constructor(
    workDir: string,
    allowedExtensions: string[] = ['.txt', '.json', '.md', '.csv']
  ) {
    // 絶対パスに解決
    this.workDir = path.isAbsolute(workDir)
      ? workDir
      : path.resolve(process.cwd(), workDir);

    this.allowedExtensions = allowedExtensions;

    // 作業ディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
      console.log(`✅ 作業ディレクトリを作成: ${this.workDir}`);
    }

    console.log(`🔒 サンドボックス作業ディレクトリ: ${this.workDir}`);
    console.log(`📝 許可された拡張子: ${allowedExtensions.join(', ')}`);
  }

  /**
   * パスが作業ディレクトリ内にあるかチェック
   */
  private isPathSafe(filePath: string): boolean {
    const absolutePath = this.resolvePath(filePath);
    const normalizedPath = path.normalize(absolutePath);
    const normalizedWorkDir = path.normalize(this.workDir);

    // パストラバーサル攻撃を防ぐ
    return normalizedPath.startsWith(normalizedWorkDir);
  }

  /**
   * ファイル拡張子が許可されているかチェック
   */
  private isExtensionAllowed(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  /**
   * 相対パスを作業ディレクトリ基準の絶対パスに解決
   */
  private resolvePath(relativePath: string): string {
    return path.resolve(this.workDir, relativePath);
  }

  /**
   * ファイルを読み込む
   */
  readFile(relativePath: string): { success: boolean; content?: string; error?: string } {
    try {
      const fullPath = this.resolvePath(relativePath);

      // セキュリティチェック
      if (!this.isPathSafe(fullPath)) {
        return {
          success: false,
          error: `⛔ セキュリティエラー: パスが作業ディレクトリ外を指しています: ${relativePath}`,
        };
      }

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `❌ ファイルが存在しません: ${relativePath}`,
        };
      }

      if (!fs.statSync(fullPath).isFile()) {
        return {
          success: false,
          error: `❌ ファイルではありません: ${relativePath}`,
        };
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      console.log(`📖 読み込み成功: ${relativePath} (${content.length}文字)`);

      return { success: true, content };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 読み込みエラー: ${relativePath} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * ファイルに書き込む
   */
  writeFile(
    relativePath: string,
    content: string
  ): { success: boolean; error?: string } {
    try {
      const fullPath = this.resolvePath(relativePath);

      // セキュリティチェック
      if (!this.isPathSafe(fullPath)) {
        return {
          success: false,
          error: `⛔ セキュリティエラー: パスが作業ディレクトリ外を指しています: ${relativePath}`,
        };
      }

      if (!this.isExtensionAllowed(fullPath)) {
        return {
          success: false,
          error: `⛔ 許可されていない拡張子です: ${path.extname(relativePath)}`,
        };
      }

      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✍️  書き込み成功: ${relativePath} (${content.length}文字)`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 書き込みエラー: ${relativePath} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   */
  listFiles(relativePath: string = '.'): { success: boolean; files?: string[]; error?: string } {
    try {
      const fullPath = this.resolvePath(relativePath);

      // セキュリティチェック
      if (!this.isPathSafe(fullPath)) {
        return {
          success: false,
          error: `⛔ セキュリティエラー: パスが作業ディレクトリ外を指しています: ${relativePath}`,
        };
      }

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `❌ ディレクトリが存在しません: ${relativePath}`,
        };
      }

      if (!fs.statSync(fullPath).isDirectory()) {
        return {
          success: false,
          error: `❌ ディレクトリではありません: ${relativePath}`,
        };
      }

      const files = fs.readdirSync(fullPath);
      console.log(`📂 一覧取得成功: ${relativePath} (${files.length}個)`);

      return { success: true, files };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 一覧取得エラー: ${relativePath} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * ファイルを削除
   */
  deleteFile(relativePath: string): { success: boolean; error?: string } {
    try {
      const fullPath = this.resolvePath(relativePath);

      // セキュリティチェック
      if (!this.isPathSafe(fullPath)) {
        return {
          success: false,
          error: `⛔ セキュリティエラー: パスが作業ディレクトリ外を指しています: ${relativePath}`,
        };
      }

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `❌ ファイルが存在しません: ${relativePath}`,
        };
      }

      fs.unlinkSync(fullPath);
      console.log(`🗑️  削除成功: ${relativePath}`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 削除エラー: ${relativePath} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 作業ディレクトリのパスを取得
   */
  getWorkDir(): string {
    return this.workDir;
  }
}

/**
 * サンドボックス化されたClaude Agent
 *
 * 指定されたディレクトリ内でのみファイル操作を行うエージェント
 */
class SandboxedClaudeAgent {
  private client: Anthropic;
  private fileSystem: SandboxedFileSystem;
  private tools: Anthropic.Tool[];

  constructor(apiKey: string, workDir: string) {
    this.client = new Anthropic({ apiKey });
    this.fileSystem = new SandboxedFileSystem(workDir);

    // ファイル操作ツールを定義
    this.tools = [
      {
        name: 'read_file',
        description: '指定されたファイルの内容を読み込みます。作業ディレクトリ内のファイルのみアクセス可能です。',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '作業ディレクトリからの相対パス（例: data.txt, folder/file.json）',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'ファイルに内容を書き込みます。作業ディレクトリ内のファイルのみ作成可能です。',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '作業ディレクトリからの相対パス（例: output.txt, results/data.json）',
            },
            content: {
              type: 'string',
              description: '書き込む内容',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_files',
        description: 'ディレクトリ内のファイルとフォルダの一覧を取得します。',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '作業ディレクトリからの相対パス（省略時はルート）',
              default: '.',
            },
          },
        },
      },
      {
        name: 'delete_file',
        description: 'ファイルを削除します。作業ディレクトリ内のファイルのみ削除可能です。',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '削除するファイルの相対パス',
            },
          },
          required: ['path'],
        },
      },
    ];
  }

  /**
   * ツールを実行
   */
  private executeTool(toolName: string, input: any): any {
    console.log(`\n🔧 ツール実行: ${toolName}`);
    console.log(`📝 入力:`, JSON.stringify(input, null, 2));

    let result: any;

    switch (toolName) {
      case 'read_file':
        result = this.fileSystem.readFile(input.path);
        break;
      case 'write_file':
        result = this.fileSystem.writeFile(input.path, input.content);
        break;
      case 'list_files':
        result = this.fileSystem.listFiles(input.path || '.');
        break;
      case 'delete_file':
        result = this.fileSystem.deleteFile(input.path);
        break;
      default:
        result = { success: false, error: `未知のツール: ${toolName}` };
    }

    console.log(`✅ 結果:`, JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * エージェントを実行
   */
  async run(userMessage: string): Promise<string> {
    console.log('\n' + '='.repeat(70));
    console.log('🤖 Claude Agent 起動');
    console.log('📁 作業ディレクトリ:', this.fileSystem.getWorkDir());
    console.log('💬 ユーザーメッセージ:', userMessage);
    console.log('='.repeat(70) + '\n');

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    let response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools: this.tools,
      messages,
    });

    // ツール使用ループ
    let iterationCount = 0;
    const maxIterations = 10;

    while (response.stop_reason === 'tool_use' && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`\n--- イテレーション ${iterationCount} ---`);

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      if (!toolUse) break;

      // ツールを実行
      const toolResult = this.executeTool(toolUse.name, toolUse.input);

      // アシスタントの応答を履歴に追加
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // ツール結果を追加
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
      response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        tools: this.tools,
        messages,
      });
    }

    // 最終的なテキスト応答を取得
    const finalText = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    const result = finalText?.text || '応答がありません';

    console.log('\n' + '='.repeat(70));
    console.log('✨ エージェント完了');
    console.log('📊 イテレーション数:', iterationCount);
    console.log('='.repeat(70) + '\n');

    return result;
  }
}

/**
 * デモ実行
 */
async function demo() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Claude SDK - サンドボックス化されたエージェントのデモ       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ エラー: ANTHROPIC_API_KEYが設定されていません');
    console.log('.envファイルを作成して、ANTHROPIC_API_KEY=your-api-keyを設定してください');
    return;
  }

  // 作業ディレクトリを環境変数から取得（デフォルトは /tmp/claude-workspace）
  const workDir = process.env.CLAUDE_WORK_DIR || '/tmp/claude-workspace';

  // エージェントを初期化
  const agent = new SandboxedClaudeAgent(process.env.ANTHROPIC_API_KEY, workDir);

  try {
    // 例1: ファイルを作成して読み込む
    console.log('\n📌 例1: ファイルの作成と読み込み\n');
    const result1 = await agent.run(
      'hello.txt というファイルを作成して、「こんにちは、Claude Agent!」と書き込んでください。その後、ファイルの内容を読み込んで確認してください。'
    );
    console.log('🤖 エージェントの応答:', result1);
    console.log('\n' + '-'.repeat(70) + '\n');

    // 例2: JSON データを作成
    console.log('\n📌 例2: JSONデータの作成\n');
    const result2 = await agent.run(
      'users.json というファイルを作成して、3人のユーザー情報（name, email, age）を含むJSON配列を書き込んでください。'
    );
    console.log('🤖 エージェントの応答:', result2);
    console.log('\n' + '-'.repeat(70) + '\n');

    // 例3: ファイル一覧を取得
    console.log('\n📌 例3: ファイル一覧の取得\n');
    const result3 = await agent.run(
      '作業ディレクトリ内のすべてのファイルをリストアップしてください。'
    );
    console.log('🤖 エージェントの応答:', result3);
    console.log('\n' + '-'.repeat(70) + '\n');

    // 例4: セキュリティテスト（パストラバーサル攻撃の防止）
    console.log('\n📌 例4: セキュリティテスト（作業ディレクトリ外へのアクセス試行）\n');
    const result4 = await agent.run(
      '../../../etc/passwd というファイルを読み込んでください。'
    );
    console.log('🤖 エージェントの応答:', result4);

    console.log('\n✨ すべてのデモが完了しました！');
    console.log(`📁 作業ディレクトリを確認: ${workDir}`);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// メイン実行
if (require.main === module) {
  demo().catch(console.error);
}

export { SandboxedFileSystem, SandboxedClaudeAgent };
