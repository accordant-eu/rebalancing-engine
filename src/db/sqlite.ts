import Database from 'better-sqlite3';

let dbInstance: Database.Database | null = null;

export function initDb(dbPath: string = './data/state.db'): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS Tenants (
      tenantId TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Models (
      modelId TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      archetype TEXT DEFAULT 'StaticWeights',
      evaluationFrequency TEXT DEFAULT 'realtime',
      targetAllocation TEXT NOT NULL,
      policy TEXT NOT NULL,
      constraints TEXT,
      FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Portfolios (
      accountId TEXT PRIMARY KEY,
      tenantId TEXT,
      modelId TEXT,
      subscriptionType TEXT DEFAULT 'bespoke',
      cash REAL NOT NULL,
      policy TEXT NOT NULL,
      FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON DELETE CASCADE,
      FOREIGN KEY(modelId) REFERENCES Models(modelId) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Holdings (
      accountId TEXT NOT NULL,
      instrumentId TEXT NOT NULL,
      quantity REAL NOT NULL,
      PRIMARY KEY (accountId, instrumentId),
      FOREIGN KEY(accountId) REFERENCES Portfolios(accountId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS TaxLots (
      lotId TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      instrumentId TEXT NOT NULL,
      quantity REAL NOT NULL,
      acquisitionDate TEXT,
      unitCost REAL,
      FOREIGN KEY(accountId) REFERENCES Portfolios(accountId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS TargetAllocations (
      accountId TEXT NOT NULL,
      instrumentId TEXT NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (accountId, instrumentId),
      FOREIGN KEY(accountId) REFERENCES Portfolios(accountId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS GlobalPrices (
      instrumentId TEXT PRIMARY KEY,
      price REAL NOT NULL,
      asOf TEXT
    );

    CREATE TABLE IF NOT EXISTS EvaluationQueue (
      accountId TEXT PRIMARY KEY,
      queuedAtMs INTEGER NOT NULL,
      FOREIGN KEY(accountId) REFERENCES Portfolios(accountId) ON DELETE CASCADE
    );
  `);

  // Safe migrations for existing databases
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN tenantId TEXT REFERENCES Tenants(tenantId) ON DELETE CASCADE`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN modelId TEXT REFERENCES Models(modelId) ON DELETE SET NULL`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN subscriptionType TEXT DEFAULT 'bespoke'`); } catch (e) { /* ignore if exists */ }

  dbInstance = db;
  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
