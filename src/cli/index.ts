import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCliProgram, type CliHandlers } from './args.js';
import {
  createTraceGuard,
  compareContracts,
  saveBaseline,
  loadBaseline,
  clearBaseline,
  formatTerminalReport,
  formatJsonReport,
  formatMarkdownReport,
  formatHtmlReport,
  type Report,
} from '../index.js';
import { TraceGuardError } from '../types/errors.js';

export async function runCli(argv: string[] = process.argv): Promise<number> {
  let exitCode = 0;

  const handlers: CliHandlers = {
    onCheck: async (options) => {
      exitCode = await handleCheck(options);
      return exitCode;
    },
    onDiff: async (base, head, options) => {
      exitCode = await handleDiff(base, head, options);
      return exitCode;
    },
    onBaselineSave: async (path, options) => {
      exitCode = await handleBaselineSave(path, options);
      return exitCode;
    },
    onBaselineShow: async (path) => {
      exitCode = await handleBaselineShow(path);
      return exitCode;
    },
    onBaselineClear: async (path) => {
      exitCode = await handleBaselineClear(path);
      return exitCode;
    },
  };

  const program = buildCliProgram(handlers);

  try {
    await program.parseAsync(argv);
    return exitCode;
  } catch (err) {
    if (err instanceof TraceGuardError) {
      process.stderr.write(`Error [${err.code}]: ${err.message}\n`);
      process.stderr.write(`Hint: ${err.hint}\n`);
      return err.exitCode;
    }

    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Unexpected error: ${message}\n`);
    return 2;
  }
}

async function handleCheck(options: Record<string, unknown>): Promise<number> {
  const client = createTraceGuard({
    configPath: options['config'] as string | undefined,
    spec: options['spec'] as string | undefined,
    baseUrl: options['baseUrl'] as string | undefined,
    timeoutMs: options['timeout'] ? Number(options['timeout']) : undefined,
    concurrency: options['concurrency'] ? Number(options['concurrency']) : undefined,
    baselinePath: options['baseline'] as string | undefined,
    ci: options['ci'] === true,
  });

  const report = await client.check();
  outputReport(report, options['format'] as string, options['output'] as string);
  return report.policyResult.passed ? 0 : 1;
}

async function handleDiff(base: string, head: string, options: Record<string, unknown>): Promise<number> {
  const report = await compareContracts({
    baseSpecPath: base,
    headSpecPath: head,
    config: {
      configPath: options['config'] as string | undefined,
      baselinePath: options['baseline'] as string | undefined,
      ci: options['ci'] === true,
    },
  });

  outputReport(report, options['format'] as string, options['output'] as string);
  return report.policyResult.passed ? 0 : 1;
}

async function handleBaselineSave(path: string, options: Record<string, unknown>): Promise<number> {
  const force = options['force'] === true;

  if (options['diff']) {
    const report = await compareContracts({
      baseSpecPath: (options['spec'] as string) || './openapi.yaml',
      headSpecPath: options['diff'] as string,
    });
    saveBaseline(path, report.findings, { force });
  } else {
    const client = createTraceGuard({
      spec: options['spec'] as string | undefined,
      baseUrl: options['baseUrl'] as string | undefined,
    });
    const report = await client.check();
    saveBaseline(path, report.findings, { force });
  }

  process.stdout.write(`Baseline saved to '${path}'.\n`);
  return 0;
}

async function handleBaselineShow(path: string): Promise<number> {
  const baseline = loadBaseline(path);
  process.stdout.write(`Baseline snapshot: ${path} (Version: ${baseline.version}, Recorded: ${baseline.createdAt})\n`);
  process.stdout.write(`Total entries: ${baseline.entries.length}\n`);
  for (const [idx, entry] of baseline.entries.entries()) {
    process.stdout.write(` #${idx + 1} [${entry.ruleId}] ${entry.method} ${entry.endpoint} (${entry.fingerprint})\n`);
  }
  return 0;
}

async function handleBaselineClear(path: string): Promise<number> {
  clearBaseline(path);
  process.stdout.write(`Cleared baseline snapshot at '${path}'.\n`);
  return 0;
}

function outputReport(report: Report, format?: string, outputPath?: string): void {
  let output = '';
  if (format === 'json') {
    output = formatJsonReport(report);
  } else if (format === 'markdown') {
    output = formatMarkdownReport(report);
  } else if (format === 'html') {
    output = formatHtmlReport(report);
  } else {
    output = formatTerminalReport(report);
  }

  if (outputPath) {
    writeFileSync(resolve(outputPath), output, 'utf-8');
    process.stdout.write(`Report written to '${outputPath}'.\n`);
  } else {
    process.stdout.write(output + '\n');
  }
}

// Automatically execute when run as binary (outside vitest test runner)
if (!process.env.VITEST) {
  runCli().then((code) => {
    if (code !== 0) process.exit(code);
  });
}
