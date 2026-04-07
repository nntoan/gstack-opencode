import { Command } from 'commander';
import packageJson from '../../package.json' with { type: 'json' };
import { runInstall } from './install.ts';
import { runDoctor } from './doctor/index.ts';
import { runMemoirRefresh } from './memoir.ts';

const packageVersion: string = packageJson.version;

const program = new Command();

program
  .name('gstack')
  .description('CLI for @nntoan/gstack OpenCode plugin')
  .version(packageVersion);

program
  .command('install')
  .description('Install gstack config and register plugin')
  .option('--claude <none|pro|max>', 'Claude subscription tier for default fallback chain')
  .option('--openai <yes|no>', 'OpenAI availability for default fallback chain')
  .option('--gemini <yes|no>', 'Gemini availability for default fallback chain')
  .option('--copilot <yes|no>', 'GitHub Copilot availability for default fallback chain')
  .option('--opencode-zen <yes|no>', 'OpenCode Zen availability for default fallback chain')
  .option('--zai-coding-plan <yes|no>', 'Z.ai Coding Plan availability for default fallback chain')
  .option('--kimi-for-coding <yes|no>', 'Kimi for Coding availability for default fallback chain')
  .option('--opencode-go <yes|no>', 'OpenCode Go availability for default fallback chain')
  .option('--non-interactive', 'Disable interactive installer prompts')
  .option('--slim', 'Use slim preset with curated skill set (5 core skills)')
  .action(async () => {
    await runInstall();
  });

program
  .command('doctor')
  .description('Run environment and config health checks')
  .action(async () => {
    await runDoctor();
  });

program
  .command('memoir:refresh')
  .description('Refresh an ICM memoir for the current project or a target repository')
  .option('--project <path>', 'Project root to refresh memoir for (defaults to current repository)')
  .option('--memoir-name <name>', 'Override the memoir name (defaults to project-derived name)')
  .option('--dry-run', 'Show memoir changes without writing to ICM')
  .action(async () => {
    await runMemoirRefresh();
  });

export function runCli(): void {
  void program.parseAsync(process.argv);
}
