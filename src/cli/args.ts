import { Command } from 'commander';

export interface CliHandlers {
  onCheck: (options: Record<string, unknown>) => Promise<number>;
  onDiff: (base: string, head: string, options: Record<string, unknown>) => Promise<number>;
  onBaselineSave: (path: string, options: Record<string, unknown>) => Promise<number>;
  onBaselineShow: (path: string) => Promise<number>;
  onBaselineClear: (path: string) => Promise<number>;
  onServe?: (options: Record<string, unknown>) => Promise<number>;
}

export function buildCliProgram(handlers?: CliHandlers): Command {
  const program = new Command();

  program
    .name('traceguard')
    .description('Deterministic OpenAPI contract testing and breaking change detection.')
    .version('0.1.1', '-v, --version', 'Output the current version of TraceGuard');

  program
    .command('check')
    .description('Validate a running API service against its OpenAPI contract.')
    .option('-s, --spec <path>', 'Path to OpenAPI spec file (YAML or JSON)')
    .option('-u, --base-url <url>', 'Base URL of the running API (e.g. http://localhost:8080)')
    .option('-c, --config <path>', 'Path to traceguard config file')
    .option('-f, --format <format>', 'Output report format: terminal, json, markdown, html', 'terminal')
    .option('-o, --output <path>', 'Write report to destination file')
    .option('--ci', 'Enforce strict CI policy (exit 1 on any breaking or critical findings)')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .option('--concurrency <n>', 'Maximum concurrent requests')
    .option('-b, --baseline <path>', 'Path to baseline file to suppress known findings')
    .action(async (options) => {
      if (handlers?.onCheck) {
        const code = await handlers.onCheck(options);
        process.exitCode = code;
      }
    });

  program
    .command('diff')
    .description('Detect breaking changes between two OpenAPI specifications.')
    .argument('<base>', 'Path to base OpenAPI specification (baseline/main)')
    .argument('<head>', 'Path to revised OpenAPI specification (feature branch)')
    .option('-c, --config <path>', 'Path to traceguard config file')
    .option('-f, --format <format>', 'Output report format: terminal, json, markdown, html', 'terminal')
    .option('-o, --output <path>', 'Write report to destination file')
    .option('--ci', 'Enforce strict CI policy (exit 1 on breaking changes)')
    .option('-b, --baseline <path>', 'Path to baseline file to suppress known changes')
    .action(async (base, head, options) => {
      if (handlers?.onDiff) {
        const code = await handlers.onDiff(base, head, options);
        process.exitCode = code;
      }
    });

  const baselineCmd = program
    .command('baseline')
    .description('Manage baseline finding snapshots.');

  baselineCmd
    .command('save <path>')
    .description('Capture findings and save to baseline snapshot')
    .option('-s, --spec <path>', 'OpenAPI specification path')
    .option('-u, --base-url <url>', 'Base URL for check mode')
    .option('--diff <head>', 'Spec path to diff against to capture baseline diff findings')
    .option('--force', 'Overwrite existing baseline file')
    .action(async (path, options) => {
      if (handlers?.onBaselineSave) {
        const code = await handlers.onBaselineSave(path, options);
        process.exitCode = code;
      }
    });

  baselineCmd
    .command('show <path>')
    .description('Display entries inside an existing baseline file')
    .action(async (path) => {
      if (handlers?.onBaselineShow) {
        const code = await handlers.onBaselineShow(path);
        process.exitCode = code;
      }
    });

  baselineCmd
    .command('clear <path>')
    .description('Remove an existing baseline file')
    .action(async (path) => {
      if (handlers?.onBaselineClear) {
        const code = await handlers.onBaselineClear(path);
        process.exitCode = code;
      }
    });

  program
    .command('serve')
    .alias('ui')
    .description('Launch the local visual dashboard and interactive playground.')
    .option('-p, --port <number>', 'Port to listen on', '3000')
    .option('--host <host>', 'Host to bind to', '0.0.0.0')
    .action(async (options) => {
      if (handlers?.onServe) {
        const code = await handlers.onServe(options);
        process.exitCode = code;
      }
    });

  return program;
}
