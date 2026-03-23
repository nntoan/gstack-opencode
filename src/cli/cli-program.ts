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
