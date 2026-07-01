import * as fs from 'fs';
import * as path from 'path';
import { AuditRecord, roundAuditRecordOutputs } from './audit';
import { logger } from '../utils/logger';
import { getDb } from '../db/sqlite';

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

  private async rotateLogsIfNeeded(newEntrySize: number): Promise<void> {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_FILES = 3;

    try {
      const stats = await fs.promises.stat(this.filePath);
      if (stats.size + newEntrySize > MAX_SIZE) {
        // Rotate: .2 -> .3, .1 -> .2, original -> .1
        for (let i = MAX_FILES - 1; i >= 1; i--) {
          const oldPath = `${this.filePath}.${i}`;
          const newPath = `${this.filePath}.${i + 1}`;
          if (fs.existsSync(oldPath)) {
            await fs.promises.rename(oldPath, newPath);
          }
        }
        await fs.promises.rename(this.filePath, `${this.filePath}.1`);
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        logger.error({ err: e }, 'Error rotating logs');
      }
    }
  }

  public async saveAuditRecord(record: AuditRecord): Promise<void> {
    // Round outputs before saving for deterministic JSON equality
    const rounded = roundAuditRecordOutputs(record);
    const jsonl = JSON.stringify(rounded) + '\n';
    await this.rotateLogsIfNeeded(Buffer.byteLength(jsonl, 'utf-8'));
    await fs.promises.appendFile(this.filePath, jsonl, 'utf-8');
  }
}

export class SqliteAuditStorage implements AuditStorageAdapter {
  public async saveAuditRecord(record: any): Promise<void> {
    const rounded = roundAuditRecordOutputs(record);
    const db = getDb();
    
    // Some records are purely system evaluations without an explicit accountId at top level, 
    // but have an eventId like accountId:timestamp
    const accountId = record.accountId || (record.eventId ? record.eventId.split(':')[0] : null);
    const tenantId = record.inputs?.portfolioState?.tenantId || record.tenantId || null;
    const type = record.type || 'UNKNOWN';
    
    db.prepare(`
      INSERT OR REPLACE INTO AuditTrails (eventId, accountId, tenantId, type, inputs, outputs, timestampMs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.eventId,
      accountId,
      tenantId,
      type,
      JSON.stringify(rounded.inputs || {}),
      JSON.stringify(rounded.outputs || {}),
      Date.now(),
      record.createdAt || new Date().toISOString()
    );
  }
}
