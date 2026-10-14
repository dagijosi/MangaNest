import { getDatabase } from '../database';

export interface HistoryRecord {
  id: string;
  mangaId: string;
  mangaTitle: string;
  coverUrl: string;
  chapterId: string;
  chapterNumber: number;
  readAt: number;
  progress: number;
}

export const HistoryRepository = {
  async recordProgress(
    mangaId: string,
    chapterId: string,
    progress: number,
    completed: boolean
  ): Promise<void> {
    const db = await getDatabase();
    const id = `${mangaId}:${chapterId}`;
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO reading_history (id, manga_id, chapter_id, read_at, progress, completed)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         read_at = excluded.read_at,
         progress = excluded.progress,
         completed = excluded.completed;`,
      id,
      mangaId,
      chapterId,
      now,
      progress,
      completed ? 1 : 0
    );

    // Also update chapter table progress if chapter exists
    try {
      await db.runAsync(
        `UPDATE chapters SET
           read_progress = ?,
           is_read = ?,
           last_read_at = ?
         WHERE id = ?`,
        progress,
        completed ? 1 : 0,
        now,
        chapterId
      );
    } catch {
      // Safe to ignore if chapter record has not been inserted
    }
  },

  async getRecentHistory(limit: number = 50): Promise<HistoryRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      manga_id: string;
      title: string;
      cover_url: string;
      chapter_id: string;
      read_at: number;
      progress: number;
    }>(
      `SELECT h.id, h.manga_id, m.title, m.cover_url, h.chapter_id, h.read_at, h.progress
       FROM reading_history h
       LEFT JOIN manga m ON h.manga_id = m.id OR h.manga_id = m.source_id
       ORDER BY h.read_at DESC
       LIMIT ?;`,
      limit
    );

    return rows.map((r) => {
      // Extract chapter number from ID (e.g. "mock:solo-leveling:ch-201" or similar)
      const chMatch = r.chapter_id.match(/ch-(\d+)/i) || r.chapter_id.match(/(\d+)$/);
      const chapterNumber = chMatch ? parseInt(chMatch[1], 10) : 1;

      return {
        id: r.id,
        mangaId: r.manga_id,
        mangaTitle: r.title || 'Unknown Manga',
        coverUrl: r.cover_url || '',
        chapterId: r.chapter_id,
        chapterNumber,
        readAt: r.read_at,
        progress: r.progress,
      };
    });
  },

  async clearAll(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM reading_history;');
  },
};
