import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite, PgliteDatabase } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Type representing the application's Drizzle database
export type AppDatabase = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __lms_db_instance: AppDatabase | undefined;
  // eslint-disable-next-line no-var
  var __lms_raw_pglite: PGlite | undefined;
  // eslint-disable-next-line no-var
  var __lms_raw_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __lms_is_migrated: boolean | undefined;
}

function getDatabaseInstance(): { db: AppDatabase; initPromise: Promise<void> } {
  if (globalThis.__lms_db_instance) {
    return {
      db: globalThis.__lms_db_instance,
      initPromise: Promise.resolve(),
    };
  }

  const databaseUrl = process.env.DATABASE_URL;

  let db: AppDatabase;
  let initPromise: Promise<void>;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    globalThis.__lms_raw_pool = pool;
    db = drizzlePg(pool, { schema });
    globalThis.__lms_db_instance = db;

    initPromise = runMigrationsOnPg(pool);
  } else {
    // Local embedded PGLite mode for zero-setup execution
    // OneDrive intercepts filesystem locking, so use LOCALAPPDATA if workspace is in OneDrive
    let dataDir = path.join(process.cwd(), '.data', 'lms-db');
    if (process.cwd().toLowerCase().includes('onedrive') && process.env.LOCALAPPDATA) {
      dataDir = path.join(process.env.LOCALAPPDATA, 'library-management-system', 'lms-db');
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    } else {
      const pidFile = path.join(dataDir, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {
          // Ignore
        }
      }
    }

    const pglite = new PGlite(dataDir);
    globalThis.__lms_raw_pglite = pglite;
    db = drizzlePglite(pglite, { schema });
    globalThis.__lms_db_instance = db;

    initPromise = runMigrationsOnPglite(pglite);
  }

  return { db, initPromise };
}

async function runMigrationsOnPglite(pglite: PGlite): Promise<void> {
  if (globalThis.__lms_is_migrated) return;
  try {
    await pglite.waitReady;
    const migrationFile = path.join(process.cwd(), 'src', 'server', 'db', 'migrations', '0000_chunky_goliath.sql');
    if (fs.existsSync(migrationFile)) {
      const sqlContent = fs.readFileSync(migrationFile, 'utf8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await pglite.exec(statement);
        } catch {
          // Ignore table already exists or constraint already exists
        }
      }
    }
    globalThis.__lms_is_migrated = true;
  } catch (err) {
    console.error('Migration error on PGLite:', err);
  }
}

async function runMigrationsOnPg(pool: Pool): Promise<void> {
  if (globalThis.__lms_is_migrated) return;
  try {
    const migrationFile = path.join(process.cwd(), 'src', 'server', 'db', 'migrations', '0000_chunky_goliath.sql');
    if (fs.existsSync(migrationFile)) {
      const sqlContent = fs.readFileSync(migrationFile, 'utf8');
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const client = await pool.connect();
      try {
        for (const statement of statements) {
          try {
            await client.query(statement);
          } catch {
            // Ignore if exists
          }
        }
      } finally {
        client.release();
      }
    }
    globalThis.__lms_is_migrated = true;
  } catch (err) {
    console.error('Migration error on Postgres:', err);
  }
}

export const { db, initPromise } = getDatabaseInstance();
export { schema };
