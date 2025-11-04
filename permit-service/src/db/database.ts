/**
 * Database Module - SQLite with Better-SQLite3
 * Handles all database operations for chat sessions, submissions, and users
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/permit-app.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db: Database.Database = new Database(DB_PATH, { verbose: console.log });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initializeDatabase() {
  // Chat sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      messages TEXT NOT NULL,
      extracted_data TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Submissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      status TEXT NOT NULL,
      stripe_payment_id TEXT,
      amount_cents INTEGER NOT NULL,
      permit_data TEXT NOT NULL,
      pdf_package TEXT,
      approval_token TEXT,
      approval_expires_at DATETIME,
      accela_record_id TEXT,
      accela_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME
    )
  `);

  // Users table (optional accounts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      company TEXT,
      license_number TEXT,
      phone TEXT,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Organizations table (contractor companies)
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      clerk_org_id TEXT UNIQUE,
      description TEXT,
      license_number TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Organization members table (permit runners, assistants)
  db.exec(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE(org_id, user_id)
    )
  `);

  // Accela credentials table (encrypted API credentials)
  db.exec(`
    CREATE TABLE IF NOT EXISTS accela_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      org_id TEXT,
      encrypted_credentials TEXT NOT NULL,
      agency TEXT NOT NULL,
      environment TEXT NOT NULL,
      verified BOOLEAN DEFAULT 0,
      last_verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK ((user_id IS NOT NULL AND org_id IS NULL) OR (user_id IS NULL AND org_id IS NOT NULL))
    )
  `);

  // Shared permits table (shareable links for homeowners/others)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_permits (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      password_hash TEXT,
      expires_at DATETIME,
      view_count INTEGER DEFAULT 0,
      last_viewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Database initialized');
}

/**
 * Chat Session Operations
 */
export const chatSessions = {
  create(id: string, userId: string | null) {
    const stmt = db.prepare(`
      INSERT INTO chat_sessions (id, user_id, messages, status)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, userId, JSON.stringify([]), 'active');
  },

  get(id: string) {
    const stmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
    const row = stmt.get(id) as any;
    if (row) {
      return {
        ...row,
        messages: JSON.parse(row.messages),
        extracted_data: row.extracted_data ? JSON.parse(row.extracted_data) : null,
      };
    }
    return null;
  },

  addMessage(id: string, role: 'user' | 'assistant', content: string) {
    const session = this.get(id);
    if (!session) throw new Error('Session not found');

    const messages = session.messages;
    messages.push({ role, content, timestamp: new Date().toISOString() });

    const stmt = db.prepare(`
      UPDATE chat_sessions
      SET messages = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(messages), id);
  },

  updateExtractedData(id: string, data: any) {
    const stmt = db.prepare(`
      UPDATE chat_sessions
      SET extracted_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(data), id);
  },

  markComplete(id: string) {
    const stmt = db.prepare(`
      UPDATE chat_sessions
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  },

  updateStatus(id: string, status: string) {
    const stmt = db.prepare(`
      UPDATE chat_sessions
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, id);
  },
};

/**
 * Submission Operations
 */
export const submissions = {
  create(data: {
    id: string;
    userId: string | null;
    sessionId: string;
    tier: string;
    amountCents: number;
    permitData: any;
  }) {
    const stmt = db.prepare(`
      INSERT INTO submissions (id, user_id, session_id, tier, status, amount_cents, permit_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.userId,
      data.sessionId,
      data.tier,
      'pending',
      data.amountCents,
      JSON.stringify(data.permitData)
    );
  },

  get(id: string) {
    const stmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
    const row = stmt.get(id) as any;
    if (row) {
      return {
        ...row,
        permit_data: JSON.parse(row.permit_data),
        pdf_package: row.pdf_package ? JSON.parse(row.pdf_package) : null,
      };
    }
    return null;
  },

  updateStatus(id: string, status: string) {
    const stmt = db.prepare('UPDATE submissions SET status = ? WHERE id = ?');
    stmt.run(status, id);
  },

  setPayment(id: string, stripePaymentId: string) {
    const stmt = db.prepare(`
      UPDATE submissions
      SET stripe_payment_id = ?, status = 'paid'
      WHERE id = ?
    `);
    stmt.run(stripePaymentId, id);
  },

  setPdfPackage(id: string, pdfPackage: any) {
    const stmt = db.prepare(`
      UPDATE submissions
      SET pdf_package = ?, status = 'generated'
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(pdfPackage), id);
  },

  setApprovalToken(id: string, token: string, expiresAt: Date) {
    const stmt = db.prepare(`
      UPDATE submissions
      SET approval_token = ?, approval_expires_at = ?
      WHERE id = ?
    `);
    stmt.run(token, expiresAt.toISOString(), id);
  },

  setAccelaSubmission(id: string, recordId: string, url: string) {
    const stmt = db.prepare(`
      UPDATE submissions
      SET accela_record_id = ?, accela_url = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(recordId, url, id);
  },

  getByToken(token: string) {
    const stmt = db.prepare('SELECT * FROM submissions WHERE approval_token = ?');
    const row = stmt.get(token) as any;
    if (row) {
      return {
        ...row,
        permit_data: JSON.parse(row.permit_data),
        pdf_package: row.pdf_package ? JSON.parse(row.pdf_package) : null,
      };
    }
    return null;
  },

  getBySessionId(sessionId: string) {
    const stmt = db.prepare('SELECT * FROM submissions WHERE session_id = ? ORDER BY created_at DESC LIMIT 1');
    const row = stmt.get(sessionId) as any;
    if (row) {
      return {
        ...row,
        permit_data: JSON.parse(row.permit_data),
        pdf_package: row.pdf_package ? JSON.parse(row.pdf_package) : null,
      };
    }
    return null;
  },

  getByUserId(userId: string) {
    const stmt = db.prepare('SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId) as any[];
    return rows.map(row => ({
      ...row,
      permit_data: JSON.parse(row.permit_data),
      pdf_package: row.pdf_package ? JSON.parse(row.pdf_package) : null,
    }));
  },
};

/**
 * Organization Operations
 */
export const organizations = {
  create(data: {
    id: string;
    name: string;
    ownerId: string;
    clerkOrgId?: string;
    description?: string;
    licenseNumber?: string;
    phone?: string;
    address?: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO organizations (id, name, owner_id, clerk_org_id, description, license_number, phone, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.name,
      data.ownerId,
      data.clerkOrgId || null,
      data.description || null,
      data.licenseNumber || null,
      data.phone || null,
      data.address || null
    );
  },

  get(id: string) {
    const stmt = db.prepare('SELECT * FROM organizations WHERE id = ?');
    return stmt.get(id) as any;
  },

  getByClerkOrgId(clerkOrgId: string) {
    const stmt = db.prepare('SELECT * FROM organizations WHERE clerk_org_id = ?');
    return stmt.get(clerkOrgId) as any;
  },

  getByOwnerId(ownerId: string) {
    const stmt = db.prepare('SELECT * FROM organizations WHERE owner_id = ?');
    return stmt.all(ownerId) as any[];
  },

  update(id: string, data: Partial<{
    name: string;
    description: string;
    licenseNumber: string;
    phone: string;
    address: string;
  }>) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`
      UPDATE organizations SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(...values, id);
  },

  delete(id: string) {
    const stmt = db.prepare('DELETE FROM organizations WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Organization Member Operations
 */
export const organizationMembers = {
  add(data: {
    id: string;
    orgId: string;
    userId: string;
    role: 'admin' | 'member';
  }) {
    const stmt = db.prepare(`
      INSERT INTO organization_members (id, org_id, user_id, role)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(data.id, data.orgId, data.userId, data.role);
  },

  getByOrg(orgId: string) {
    const stmt = db.prepare('SELECT * FROM organization_members WHERE org_id = ?');
    return stmt.all(orgId) as any[];
  },

  getByUser(userId: string) {
    const stmt = db.prepare('SELECT * FROM organization_members WHERE user_id = ?');
    return stmt.all(userId) as any[];
  },

  updateRole(orgId: string, userId: string, role: 'admin' | 'member') {
    const stmt = db.prepare('UPDATE organization_members SET role = ? WHERE org_id = ? AND user_id = ?');
    stmt.run(role, orgId, userId);
  },

  remove(orgId: string, userId: string) {
    const stmt = db.prepare('DELETE FROM organization_members WHERE org_id = ? AND user_id = ?');
    stmt.run(orgId, userId);
  },

  isAdmin(orgId: string, userId: string): boolean {
    const stmt = db.prepare('SELECT role FROM organization_members WHERE org_id = ? AND user_id = ?');
    const row = stmt.get(orgId, userId) as any;
    return row?.role === 'admin';
  },
};

/**
 * Accela Credentials Operations
 */
export const accelaCredentials = {
  create(data: {
    id: string;
    userId?: string;
    orgId?: string;
    encryptedCredentials: string;
    agency: string;
    environment: string;
  }) {
    const stmt = db.prepare(`
      INSERT INTO accela_credentials (id, user_id, org_id, encrypted_credentials, agency, environment)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.userId || null,
      data.orgId || null,
      data.encryptedCredentials,
      data.agency,
      data.environment
    );
  },

  getByUser(userId: string) {
    const stmt = db.prepare('SELECT * FROM accela_credentials WHERE user_id = ?');
    return stmt.get(userId) as any;
  },

  getByOrg(orgId: string) {
    const stmt = db.prepare('SELECT * FROM accela_credentials WHERE org_id = ?');
    return stmt.get(orgId) as any;
  },

  update(id: string, encryptedCredentials: string) {
    const stmt = db.prepare(`
      UPDATE accela_credentials SET encrypted_credentials = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(encryptedCredentials, id);
  },

  markVerified(id: string) {
    const stmt = db.prepare(`
      UPDATE accela_credentials SET verified = 1, last_verified_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(id);
  },

  delete(id: string) {
    const stmt = db.prepare('DELETE FROM accela_credentials WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Shared Permit Operations
 */
export const sharedPermits = {
  create(data: {
    id: string;
    submissionId: string;
    shareToken: string;
    createdBy: string;
    passwordHash?: string;
    expiresAt?: Date;
  }) {
    const stmt = db.prepare(`
      INSERT INTO shared_permits (id, submission_id, share_token, created_by, password_hash, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.submissionId,
      data.shareToken,
      data.createdBy,
      data.passwordHash || null,
      data.expiresAt ? data.expiresAt.toISOString() : null
    );
  },

  getByToken(shareToken: string) {
    const stmt = db.prepare('SELECT * FROM shared_permits WHERE share_token = ?');
    return stmt.get(shareToken) as any;
  },

  getBySubmission(submissionId: string) {
    const stmt = db.prepare('SELECT * FROM shared_permits WHERE submission_id = ?');
    return stmt.all(submissionId) as any[];
  },

  incrementView(id: string) {
    const stmt = db.prepare(`
      UPDATE shared_permits SET view_count = view_count + 1, last_viewed_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(id);
  },

  delete(id: string) {
    const stmt = db.prepare('DELETE FROM shared_permits WHERE id = ?');
    stmt.run(id);
  },

  deleteByToken(shareToken: string) {
    const stmt = db.prepare('DELETE FROM shared_permits WHERE share_token = ?');
    stmt.run(shareToken);
  },
};

// Initialize on import
initializeDatabase();
