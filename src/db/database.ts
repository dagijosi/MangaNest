import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('manganest.db');
      await initDatabase(db);
      return db;
    })();
  }
  return dbPromise;
}

async function initDatabase(db: SQLite.SQLiteDatabase) {
  // Disable foreign key constraints as chapter IDs and manga sources are dynamically fetched from remote providers
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  // Clean up any legacy tables that still have FOREIGN KEY / REFERENCES constraints in their schema
  try {
    const legacyTables = await db.getAllAsync<{ name: string; sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%REFERENCES%';"
    );
    if (legacyTables && legacyTables.length > 0) {
      for (const table of legacyTables) {
        if (table.name && !table.name.startsWith('sqlite_')) {
          await db.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
        }
      }
    }
  } catch (err) {
    console.warn('Legacy table cleanup check error:', err);
  }

  // Ensure schema tables exist without conflicting foreign key constraints on dynamic chapter IDs
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS manga (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      title TEXT NOT NULL,
      alt_titles TEXT,
      cover_url TEXT NOT NULL,
      author TEXT,
      artist TEXT,
      description TEXT,
      genres TEXT,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      rating REAL,
      rating_count INTEGER DEFAULT 0,
      in_library INTEGER DEFAULT 0,
      total_chapters INTEGER DEFAULT 0,
      unread_count INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS manga_categories (
      manga_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (manga_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      manga_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      source_chapter_id TEXT NOT NULL,
      chapter_number REAL NOT NULL,
      title TEXT,
      scanlator TEXT,
      release_date TEXT,
      page_count INTEGER,
      is_read INTEGER DEFAULT 0,
      read_progress REAL DEFAULT 0,
      last_read_at INTEGER,
      is_downloaded INTEGER DEFAULT 0,
      download_path TEXT,
      downloaded_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id TEXT PRIMARY KEY,
      manga_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      read_at INTEGER NOT NULL,
      progress REAL DEFAULT 0,
      completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL UNIQUE,
      manga_id TEXT NOT NULL,
      total_pages INTEGER DEFAULT 0,
      downloaded_pages INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      size_bytes INTEGER DEFAULT 0,
      error TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS app_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
