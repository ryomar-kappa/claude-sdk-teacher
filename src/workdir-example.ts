import * as path from 'path';
import * as fs from 'fs';

/**
 * Node.jsの作業ディレクトリ（Working Directory）の仕組みと制御方法
 *
 * Node.jsはデフォルトで以下の方法で作業ディレクトリを特定します：
 * 1. process.cwd() - プロセスが起動された時の現在のディレクトリ
 * 2. __dirname - 現在実行中のスクリプトファイルがあるディレクトリ
 * 3. require.main?.path - メインモジュールのディレクトリ
 */

/**
 * 作業ディレクトリ情報を表示する関数
 */
export function showWorkingDirectoryInfo() {
  console.log('=== 作業ディレクトリ情報 ===\n');

  // 1. process.cwd() - プロセスの現在の作業ディレクトリ
  console.log('1. process.cwd() (プロセスの作業ディレクトリ):');
  console.log('   ', process.cwd());
  console.log('   説明: プロセスが起動された場所\n');

  // 2. __dirname - このファイルがあるディレクトリ
  console.log('2. __dirname (このファイルの場所):');
  console.log('   ', __dirname);
  console.log('   説明: このスクリプトファイルの絶対パス\n');

  // 3. require.main?.path - メインモジュールのディレクトリ
  console.log('3. require.main?.path (メインモジュールの場所):');
  console.log('   ', require.main?.path);
  console.log('   説明: 最初に実行されたスクリプトの場所\n');

  // 4. 環境変数
  console.log('4. 環境変数:');
  console.log('   PWD:', process.env.PWD);
  console.log('   OLDPWD:', process.env.OLDPWD);
  console.log('\n');
}

/**
 * 方法1: process.chdir()を使って作業ディレクトリを変更
 *
 * 注意: これはプロセス全体に影響を与えます
 */
export function changeWorkingDirectory(targetDir: string) {
  console.log('=== 方法1: process.chdir()で変更 ===\n');

  const originalCwd = process.cwd();
  console.log('変更前:', originalCwd);

  try {
    // 絶対パスに解決
    const absolutePath = path.isAbsolute(targetDir)
      ? targetDir
      : path.resolve(originalCwd, targetDir);

    // ディレクトリが存在するか確認
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`ディレクトリが存在しません: ${absolutePath}`);
    }

    // 作業ディレクトリを変更
    process.chdir(absolutePath);
    console.log('変更後:', process.cwd());
    console.log('✅ 作業ディレクトリの変更に成功\n');

    return true;
  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * 方法2: 絶対パスを使って特定のディレクトリで作業
 *
 * 推奨: この方法はprocess.cwd()に依存せず、常に同じ場所を参照します
 */
export class FixedDirectoryWorker {
  private workDir: string;

  constructor(workDir: string) {
    // 絶対パスに解決
    this.workDir = path.isAbsolute(workDir)
      ? workDir
      : path.resolve(process.cwd(), workDir);

    console.log('=== 方法2: 固定ディレクトリワーカー ===');
    console.log('作業ディレクトリ:', this.workDir);
    console.log();
  }

  /**
   * ファイルパスを作業ディレクトリからの相対パスで解決
   */
  resolvePath(relativePath: string): string {
    return path.resolve(this.workDir, relativePath);
  }

  /**
   * ファイルを読み込む（作業ディレクトリ基準）
   */
  readFile(relativePath: string): string {
    const fullPath = this.resolvePath(relativePath);
    console.log(`📖 読み込み: ${relativePath}`);
    console.log(`   フルパス: ${fullPath}`);

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      console.log(`✅ 読み込み成功 (${content.length}文字)\n`);
      return content;
    } catch (error) {
      console.error(`❌ 読み込み失敗:`, error instanceof Error ? error.message : error);
      console.log();
      throw error;
    }
  }

  /**
   * ファイルを書き込む（作業ディレクトリ基準）
   */
  writeFile(relativePath: string, content: string): void {
    const fullPath = this.resolvePath(relativePath);
    console.log(`✍️  書き込み: ${relativePath}`);
    console.log(`   フルパス: ${fullPath}`);

    try {
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ 書き込み成功 (${content.length}文字)\n`);
    } catch (error) {
      console.error(`❌ 書き込み失敗:`, error instanceof Error ? error.message : error);
      console.log();
      throw error;
    }
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   */
  listFiles(relativePath: string = '.'): string[] {
    const fullPath = this.resolvePath(relativePath);
    console.log(`📂 ディレクトリ一覧: ${relativePath}`);
    console.log(`   フルパス: ${fullPath}`);

    try {
      const files = fs.readdirSync(fullPath);
      console.log(`✅ ${files.length}個のファイル/ディレクトリを発見\n`);
      return files;
    } catch (error) {
      console.error(`❌ 一覧取得失敗:`, error instanceof Error ? error.message : error);
      console.log();
      throw error;
    }
  }

  /**
   * 作業ディレクトリを取得
   */
  getWorkDir(): string {
    return this.workDir;
  }
}

/**
 * 方法3: 環境変数を使って作業ディレクトリを指定
 *
 * ts-nodeの場合: TS_NODE_CWD環境変数を使用できます
 */
export function getWorkDirFromEnv(): string {
  const envCwd = process.env.TS_NODE_CWD || process.env.WORK_DIR;

  if (envCwd) {
    console.log('=== 方法3: 環境変数から取得 ===');
    console.log('TS_NODE_CWD:', process.env.TS_NODE_CWD);
    console.log('WORK_DIR:', process.env.WORK_DIR);
    console.log('使用するディレクトリ:', envCwd);
    console.log();
    return envCwd;
  }

  return process.cwd();
}

/**
 * デモ実行
 */
async function demo() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Node.js 作業ディレクトリの仕組みと制御方法のデモ            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 現在の作業ディレクトリ情報を表示
  showWorkingDirectoryInfo();

  console.log('─'.repeat(60));
  console.log();

  // 方法1: process.chdir()を使う（非推奨）
  const projectRoot = path.resolve(__dirname, '..');
  changeWorkingDirectory(projectRoot);

  console.log('─'.repeat(60));
  console.log();

  // 方法2: FixedDirectoryWorkerを使う（推奨）
  const worker = new FixedDirectoryWorker(projectRoot);

  try {
    // ファイル一覧を取得
    const files = worker.listFiles('src');
    console.log('srcディレクトリの内容:');
    files.forEach(file => console.log(`  - ${file}`));
    console.log();

    // package.jsonを読み込む
    const packageJson = worker.readFile('package.json');
    const pkg = JSON.parse(packageJson);
    console.log('プロジェクト名:', pkg.name);
    console.log('バージョン:', pkg.version);
    console.log();

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }

  console.log('─'.repeat(60));
  console.log();

  // 方法3: 環境変数を使う
  const envWorkDir = getWorkDirFromEnv();
  console.log('環境変数で指定された作業ディレクトリ:', envWorkDir);

  console.log('\n✨ デモ完了！\n');
}

// メイン実行
if (require.main === module) {
  demo().catch(console.error);
}

export { demo };
