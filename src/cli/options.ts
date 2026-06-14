import { UsageError } from './errors';

export type OutputFormat = 'json' | 'pretty' | 'summary';

export interface ParsedArgs {
  command?: string;
  subcommand?: string;
  options: Record<string, string | boolean>;
}

const OPTION_ALIASES: Record<string, string> = {
  h: 'help',
  v: 'version',
};

const STRING_OPTIONS = new Set([
  'expectations',
  'format',
  'output',
  'output-dir',
  'policy',
  'portfolio',
  'prices',
  'scenario',
  'scenario-id',
  'scenarios',
  'target',
  'live',
]);

const BOOLEAN_OPTIONS = new Set(['force', 'help', 'quiet', 'strict', 'verbose', 'version']);

export function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith('-') || arg === '-') {
      positionals.push(arg);
      continue;
    }

    const rawName = arg.startsWith('--') ? arg.slice(2) : arg.slice(1);
    const [rawKey, inlineValue] = rawName.split('=', 2);
    const key = OPTION_ALIASES[rawKey] ?? rawKey;

    if (BOOLEAN_OPTIONS.has(key)) {
      if (inlineValue !== undefined) {
        throw new UsageError(`Option --${key} does not accept a value.`);
      }
      options[key] = true;
      continue;
    }

    if (!STRING_OPTIONS.has(key)) {
      throw new UsageError(`Unknown option: --${key}`);
    }

    const value = inlineValue ?? args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new UsageError(`Option --${key} requires a value.`);
    }
    options[key] = value;
    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return {
    command: positionals[0],
    subcommand: positionals[1],
    options,
  };
}

export function getFormat(options: Record<string, string | boolean>): OutputFormat {
  const format = options.format ?? 'summary';
  if (format !== 'json' && format !== 'pretty' && format !== 'summary') {
    throw new UsageError(`Unsupported output format: ${String(format)}`);
  }
  return format;
}

export function getStringOption(
  options: Record<string, string | boolean>,
  name: string,
): string | undefined {
  const value = options[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new UsageError(`Option --${name} requires a value.`);
  }
  return value;
}

export function hasBooleanOption(options: Record<string, string | boolean>, name: string): boolean {
  return options[name] === true;
}
