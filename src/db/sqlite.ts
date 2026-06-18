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
      name TEXT NOT NULL,
      brokerType TEXT DEFAULT 'MOCK',
      brokerApiKey TEXT,
      brokerApiSecret TEXT,
      brokerBaseUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS TenantApiKeys (
      keyId TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      keyPrefix TEXT NOT NULL,
      keyHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Assets (
      instrumentId TEXT PRIMARY KEY,
      isin TEXT NOT NULL,
      ticker TEXT NOT NULL,
      exchangeMic TEXT NOT NULL,
      currency TEXT DEFAULT 'USD'
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
      cashBuffer REAL DEFAULT 0,
      brokerAccountId TEXT,
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
    CREATE TABLE IF NOT EXISTS Users (
      userId TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Viewer',
      status TEXT DEFAULT 'Active',
      FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON DELETE CASCADE
    );
  `);

  // Safe migrations for existing databases
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN tenantId TEXT REFERENCES Tenants(tenantId) ON DELETE CASCADE`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN modelId TEXT REFERENCES Models(modelId) ON DELETE SET NULL`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN subscriptionType TEXT DEFAULT 'bespoke'`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Portfolios ADD COLUMN brokerAccountId TEXT`); } catch (e) { /* ignore if exists */ }
  
  try { db.exec(`ALTER TABLE Models ADD COLUMN archetype TEXT DEFAULT 'StaticWeights'`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Models ADD COLUMN evaluationFrequency TEXT DEFAULT 'realtime'`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Models ADD COLUMN constraints TEXT`); } catch (e) { /* ignore if exists */ }

  try { db.exec(`ALTER TABLE Tenants ADD COLUMN brokerType TEXT DEFAULT 'MOCK'`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Tenants ADD COLUMN brokerApiKey TEXT`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Tenants ADD COLUMN brokerApiSecret TEXT`); } catch (e) { /* ignore if exists */ }
  try { db.exec(`ALTER TABLE Tenants ADD COLUMN brokerBaseUrl TEXT`); } catch (e) { /* ignore if exists */ }

  // Create Users table explicitly as part of migrations (since the initial block is skipped if db exists)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      userId TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Viewer',
      status TEXT DEFAULT 'Active',
      FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS TenantApiKeys (
      keyId TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      keyPrefix TEXT NOT NULL,
      keyHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      FOREIGN KEY(tenantId) REFERENCES Tenants(tenantId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Assets (
      instrumentId TEXT PRIMARY KEY,
      isin TEXT NOT NULL,
      ticker TEXT NOT NULL,
      exchangeMic TEXT NOT NULL,
      currency TEXT DEFAULT 'USD'
    );
  `);

  // Seed baseline assets
  const baselineAssets = [
    { instrumentId: 'US0378331005:XNAS:USD', isin: 'US0378331005', ticker: 'US0378331005:XNAS:USD', exchangeMic: 'XNAS', currency: 'USD' },
    { instrumentId: 'US5949181045:XNAS:USD', isin: 'US5949181045', ticker: 'US5949181045:XNAS:USD', exchangeMic: 'XNAS', currency: 'USD' },
    { instrumentId: 'US38259P5089:XNAS:USD', isin: 'US38259P5089', ticker: 'US38259P5089:XNAS:USD', exchangeMic: 'XNAS', currency: 'USD' }
  ];
  const insertAsset = db.prepare(`INSERT OR IGNORE INTO Assets (instrumentId, isin, ticker, exchangeMic, currency) VALUES (?, ?, ?, ?, ?)`);
  baselineAssets.forEach(a => insertAsset.run(a.instrumentId, a.isin, a.ticker, a.exchangeMic, a.currency));
  // Seed baseline tenant and superadmin user if they don't exist
  const baselineTenant = db.prepare('SELECT tenantId FROM Tenants WHERE tenantId = ?').get('tenant-baseline');
  if (!baselineTenant) {
    db.prepare(`INSERT INTO Tenants (tenantId, name, brokerType) VALUES (?, ?, ?)`).run('tenant-baseline', 'Baseline Tenant', 'MOCK');
  }

  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@localhost';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'changeme123';
  
  const superadminUser = db.prepare('SELECT userId FROM Users WHERE email = ?').get(superadminEmail);
  if (!superadminUser) {
    // In a real system, password would be hashed (e.g. bcrypt). Here it's plaintext for MVP auth.
    db.prepare(`INSERT INTO Users (userId, tenantId, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'user-superadmin',
      'tenant-baseline',
      superadminEmail,
      superadminPassword,
      'Admin',
      'Active'
    );
  }

  dbInstance = db;
  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
