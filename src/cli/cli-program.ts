import { Command } from 'commander';
import packageJson from '../../package.json' with { type: 'json' };
import { runInstall } from './install.ts';
import { runDoctor } from './doctor/index.ts';

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
  .action(async () => {
    await runInstall();
  });

program
  .command('doctor')
  .description('Run environment and config health checks')
  .action(async () => {
    await runDoctor();
  });

export function runCli(): void {
  void program.parseAsync(process.argv);
}
