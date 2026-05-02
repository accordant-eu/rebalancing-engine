import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runCli } from '../src/cli';

const cwd = path.join(__dirname, '..');
const scenariosPath = path.join('tests', 'fixtures', 'scenarios.json');
const expectationsPath = path.join('tests', 'fixtures', 'scenario-expectations.json');
const scenarios = JSON.parse(fs.readFileSync(path.join(cwd, scenariosPath), 'utf8')) as {
  scenarios: Array<{ id: string }>;
};

describe('CLI', () => {
  it('renders root help', () => {
    const result = runCli(['--help'], cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('rebalance <command>');
    expect(result.stdout).toContain('validate');
    expect(result.stderr).toBe('');
  });

  it('renders command help', () => {
    const result = runCli(['run', '--help'], cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('rebalance run');
    expect(result.stdout).toContain('--scenario <path>');
    expect(result.stdout).toContain('use - to read from stdin');
  });

  it('clarifies that validate uses the deterministic engine path', () => {
    const result = runCli(['validate', '--help'], cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('same deterministic engine');
    expect(result.stdout).toContain('not a separate schema-only validator');
  });

  it('reports missing required inputs as usage errors', () => {
    const result = runCli(['run'], cwd);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Provide --scenario or explicit input files');
  });

  it('rejects incompatible scenario and explicit input modes', () => {
    const result = runCli(
      ['run', '--scenario', scenariosPath, '--portfolio', 'portfolio.json'],
      cwd,
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Use either --scenario or explicit input files');
  });

  it('validates a valid scenario', () => {
    const result = runCli(
      ['validate', '--scenario', scenariosPath, '--scenario-id', 'on_target'],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Validation: valid');
    expect(result.stdout).toContain('valid: 1 invalid: 0');
  });

  it('validates an invalid scenario with a clear error', () => {
    const result = runCli(
      ['validate', '--scenario', scenariosPath, '--scenario-id', 'missing_price'],
      cwd,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Validation: invalid');
    expect(result.stdout).toContain('Missing price for instrument: MSFT');
  });

  it('validates scenario input from stdin', () => {
    const scenario = scenarios.scenarios.find((candidate) => candidate.id === 'on_target');
    const result = runCli(['validate', '--scenario', '-'], cwd, JSON.stringify(scenario));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Validation: valid');
    expect(result.stderr).toBe('');
  });

  it('reports malformed stdin scenario input clearly', () => {
    const result = runCli(['validate', '--scenario', '-'], cwd, '{not-json');

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Invalid JSON in stdin');
  });

  it('reports empty stdin scenario input clearly', () => {
    const result = runCli(['validate', '--scenario', '-'], cwd, '   ');

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Stdin scenario input is empty');
  });

  it('runs one scenario and returns deterministic JSON', () => {
    const result = runCli(
      [
        'run',
        '--scenario',
        scenariosPath,
        '--scenario-id',
        'one_asset_out_of_band',
        '--format',
        'json',
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe('run');
    expect(parsed.result.auditRecord.eventId).toBe('scenario:one_asset_out_of_band');
    expect(parsed.result.auditRecord.outputs.tradeProposal.trades).toHaveLength(2);
  });

  it('runs a scheduled cash-flow scenario and includes deterministic schedule metadata', () => {
    const result = runCli(
      [
        'run',
        '--scenario',
        scenariosPath,
        '--scenario-id',
        'scheduled_deposit_due',
        '--format',
        'json',
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    const outputs = parsed.result.auditRecord.outputs;
    expect(outputs.cashFlowScheduleSummary.appliedEventCount).toBe(1);
    expect(outputs.cashFlowScheduleSummary.netAppliedCashFlow).toBe(1000);
    expect(outputs.tradeProposal.trades).toHaveLength(2);
  });

  it('validates an invalid recurring cash-flow scenario with a clear error', () => {
    const result = runCli(
      ['validate', '--scenario', scenariosPath, '--scenario-id', 'invalid_recurring_cash_flow'],
      cwd,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Validation: invalid');
    expect(result.stdout).toContain('Unsupported cash flow recurrence frequency');
  });

  it('runs scenario input from stdin with clean JSON stdout', () => {
    const scenario = scenarios.scenarios.find(
      (candidate) => candidate.id === 'one_asset_out_of_band',
    );
    const result = runCli(
      ['run', '--scenario', '-', '--format', 'json'],
      cwd,
      JSON.stringify(scenario),
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe('run');
    expect(parsed.scenarioId).toBe('one_asset_out_of_band');
  });

  it('rejects stdin for explicit input mode', () => {
    const result = runCli(
      [
        'run',
        '--portfolio',
        '-',
        '--prices',
        'prices.json',
        '--target',
        'target.json',
        '--policy',
        'policy.json',
      ],
      cwd,
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Stdin is supported only for --scenario -');
  });

  it('renders detailed pretty output for a scenario run', () => {
    const result = runCli(
      [
        'run',
        '--scenario',
        scenariosPath,
        '--scenario-id',
        'one_asset_out_of_band',
        '--format',
        'pretty',
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Trades:');
    expect(result.stdout).toContain('Explanation:');
    expect(result.stdout).toContain('SELL AAPL');
  });

  it('returns non-zero for strict warning handling', () => {
    const result = runCli(
      ['run', '--scenario', scenariosPath, '--scenario-id', 'pending_cash_flow', '--strict'],
      cwd,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Warnings: 1');
  });

  it('returns non-zero in strict mode when a future scheduled cash flow is excluded', () => {
    const result = runCli(
      ['run', '--scenario', scenariosPath, '--scenario-id', 'scheduled_deposit_future', '--strict'],
      cwd,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Warnings: 1');
  });

  it('runs a batch with an expected-status manifest', () => {
    const result = runCli(
      ['batch', '--scenarios', scenariosPath, '--expectations', expectationsPath],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Batch: success');
    expect(result.stdout).toContain('Expectations: valid checked: 26');
  });

  it('writes deterministic per-scenario batch outputs without changing stdout summary', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalance-cli-batch-'));
    const outputDir = path.join(tempDir, 'results');

    const result = runCli(
      [
        'batch',
        '--scenarios',
        scenariosPath,
        '--expectations',
        expectationsPath,
        '--output-dir',
        outputDir,
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Batch: success');
    const outputFiles = fs.readdirSync(outputDir).sort();
    expect(outputFiles).toContain('on_target.json');
    expect(outputFiles).toContain('missing_price.json');
    const parsed = JSON.parse(fs.readFileSync(path.join(outputDir, 'on_target.json'), 'utf8'));
    expect(parsed.command).toBe('run');
    expect(parsed.scenarioId).toBe('on_target');
  });

  it('refuses to overwrite existing batch outputs without force', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalance-cli-batch-existing-'));
    fs.writeFileSync(path.join(tempDir, 'on_target.json'), '{}');

    const result = runCli(
      [
        'batch',
        '--scenarios',
        scenariosPath,
        '--expectations',
        expectationsPath,
        '--output-dir',
        tempDir,
      ],
      cwd,
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Batch output file already exists');
  });

  it('overwrites existing batch outputs with force', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalance-cli-batch-force-'));
    fs.writeFileSync(path.join(tempDir, 'on_target.json'), '{}');

    const result = runCli(
      [
        'batch',
        '--scenarios',
        scenariosPath,
        '--expectations',
        expectationsPath,
        '--output-dir',
        tempDir,
        '--force',
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(path.join(tempDir, 'on_target.json'), 'utf8'));
    expect(parsed.scenarioId).toBe('on_target');
  });

  it('writes per-scenario batch outputs for partial failures and returns non-zero', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalance-cli-batch-errors-'));

    const result = runCli(['batch', '--scenarios', scenariosPath, '--output-dir', tempDir], cwd);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(fs.readFileSync(path.join(tempDir, 'missing_price.json'), 'utf8'));
    expect(parsed.status).toBe('error');
    expect(parsed.result.error).toContain('Missing price for instrument: MSFT');
  });

  it('returns non-zero for batch errors without expectations', () => {
    const result = runCli(['batch', '--scenarios', scenariosPath], cwd);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Batch: error');
    expect(result.stdout).toContain('errors: 5');
  });

  it('inspects supported strategies', () => {
    const result = runCli(['inspect', 'strategies'], cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('threshold (default)');
    expect(result.stdout).toContain('calendar');
    expect(result.stdout).toContain('manual');
  });

  it('inspects scheduled cash-flow scenarios', () => {
    const result = runCli(['inspect', 'scenarios', '--scenarios', scenariosPath], cwd);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('scheduled_deposit_due [scheduled cash flows: 1]');
  });

  it('keeps config files and strategy overrides unsupported', () => {
    const configResult = runCli(['run', '--config', 'rebalance.json'], cwd);
    const strategyResult = runCli(
      ['run', '--scenario', scenariosPath, '--strategy', 'manual'],
      cwd,
    );

    expect(configResult.exitCode).toBe(2);
    expect(configResult.stderr).toContain('Unknown option: --config');
    expect(strategyResult.exitCode).toBe(2);
    expect(strategyResult.stderr).toContain('Unknown option: --strategy');
  });

  it('writes output to a file without mixing stdout', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalance-cli-'));
    const outputPath = path.join(tempDir, 'run.json');

    const result = runCli(
      [
        'run',
        '--scenario',
        scenariosPath,
        '--scenario-id',
        'on_target',
        '--format',
        'json',
        '--output',
        outputPath,
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(JSON.parse(fs.readFileSync(outputPath, 'utf8')).scenarioId).toBe('on_target');
  });

  it('runs explicit input files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalance-cli-inputs-'));
    const portfolioPath = path.join(tempDir, 'portfolio.json');
    const pricesPath = path.join(tempDir, 'prices.json');
    const targetPath = path.join(tempDir, 'target.json');
    const policyPath = path.join(tempDir, 'policy.json');
    fs.writeFileSync(
      portfolioPath,
      JSON.stringify({
        accountId: 'explicit-account',
        cash: 0,
        holdings: [
          { instrumentId: 'AAPL', quantity: 100 },
          { instrumentId: 'MSFT', quantity: 100 },
        ],
      }),
    );
    fs.writeFileSync(pricesPath, JSON.stringify({ prices: { AAPL: 100, MSFT: 100 } }));
    fs.writeFileSync(
      targetPath,
      JSON.stringify({
        targets: [
          { instrumentId: 'AAPL', weight: 0.5 },
          { instrumentId: 'MSFT', weight: 0.5 },
        ],
      }),
    );
    fs.writeFileSync(
      policyPath,
      JSON.stringify({ absoluteDriftTolerance: 0.05, minimumTradeSize: 0 }),
    );

    const result = runCli(
      [
        'run',
        '--portfolio',
        portfolioPath,
        '--prices',
        pricesPath,
        '--target',
        targetPath,
        '--policy',
        policyPath,
        '--format',
        'json',
      ],
      cwd,
    );

    const parsed = JSON.parse(result.stdout);
    expect(result.exitCode).toBe(0);
    expect(parsed.scenarioId).toBe('explicit_input');
    expect(parsed.result.auditRecord.accountId).toBe('explicit-account');
  });
});
