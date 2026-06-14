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
    CREATE TABLE IF NOT EXISTS Portfolios (
      accountId TEXT PRIMARY KEY,
      cash REAL NOT NULL,
      policy TEXT NOT NULL
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
  `);

  dbInstance = db;
  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
