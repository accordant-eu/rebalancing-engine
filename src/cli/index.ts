#!/usr/bin/env node
import { executeCommand, writeOutputIfRequested } from './commands';
import { UsageError } from './errors';
import { parseArgs } from './options';

export interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runCli(args: string[], cwd = process.cwd(), stdin?: string): CliRunResult {
  let parsed;
  try {
    parsed = parseArgs(args);
    const result = executeCommand(parsed, { cwd, stdin });
    const outputResult = writeOutputIfRequested(result, parsed.options, cwd);
    return {
      exitCode: outputResult.exitCode,
      stdout: outputResult.output,
      stderr: '',
    };
  } catch (error) {
    if (error instanceof UsageError) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: `Usage error: ${error.message}\n`,
      };
    }

    const verbose = parsed?.options.verbose === true;
    return {
      exitCode: 3,
      stdout: '',
      stderr:
        verbose && error instanceof Error
          ? `${error.stack ?? error.message}\n`
          : `Runtime error: ${error instanceof Error ? error.message : String(error)}\n`,
    };
  }
}

if (require.main === module) {
  const result = runCli(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
