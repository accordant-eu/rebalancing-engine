import * as fs from 'fs';
import * as path from 'path';
import { AuditRecord, roundAuditRecordOutputs } from './audit';

export interface AuditStorageAdapter {
  saveAuditRecord(record: AuditRecord): Promise<void>;
}

export class FileAuditStorage implements AuditStorageAdapter {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public async saveAuditRecord(record: AuditRecord): Promise<void> {
    // Round outputs before saving for deterministic JSON equality
    const rounded = roundAuditRecordOutputs(record);
    const jsonl = JSON.stringify(rounded) + '\n';
    await fs.promises.appendFile(this.filePath, jsonl, 'utf-8');
  }
}
