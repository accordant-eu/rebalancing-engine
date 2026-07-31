export interface CommandContext {
  cwd: string;
  stdin?: string;
}

export interface CommandResult {
  exitCode: number;
  output: string;
}
