import { getDatabase } from '../database';
import { MangaItem, MangaStatus, MangaType } from '../../providers/types';

interface MangaRow {
  id: string;
  source_id: string;
  provider_id: string;
  title: string;
  alt_titles: string | null;
  cover_url: string;
  author: string | null;
  artist: string | null;
  description: string | null;
  genres: string | null;
  status: string;
  type: string;
  rating: number | null;
  rating_count: number | null;
  in_library: number;
  total_chapters: number | null;
  unread_count: number | null;
  created_at: number | null;
  updated_at: number | null;
}

function mapRowToManga(row: MangaRow): MangaItem {
  return {
    id: row.id,
    sourceId: row.source_id,
    providerId: row.provider_id,
    title: row.title,
    altTitles: row.alt_titles ? JSON.parse(row.alt_titles) : undefined,
    coverUrl: row.cover_url,
    author: row.author ?? undefined,
    artist: row.artist ?? undefined,
    description: row.description ?? undefined,
    genres: row.genres ? JSON.parse(row.genres) : [],
    status: row.status as MangaStatus,
    type: row.type as MangaType,
    rating: row.rating ?? undefined,
    ratingCount: row.rating_count ?? undefined,
    inLibrary: row.in_library === 1,
    totalChapters: row.total_chapters ?? undefined,
    unreadCount: row.unread_count ?? undefined,
  };
}

export const MangaRepository = {
  async upsert(item: MangaItem): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO manga (
        id, source_id, provider_id, title, alt_titles, cover_url,
        author, artist, description, genres, status, type,
        rating, rating_count, in_library, total_chapters, unread_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        alt_titles = excluded.alt_titles,
        cover_url = excluded.cover_url,
        author = excluded.author,
        artist = excluded.artist,
        description = excluded.description,
        genres = excluded.genres,
        status = excluded.status,
        type = excluded.type,
        rating = excluded.rating,
        rating_count = excluded.rating_count,
        in_library = excluded.in_library,
        total_chapters = excluded.total_chapters,
        unread_count = excluded.unread_count,
        updated_at = excluded.updated_at;`,
      item.id,
      item.sourceId,
      item.providerId,
      item.title,
      item.altTitles ? JSON.stringify(item.altTitles) : null,
      item.coverUrl,
      item.author ?? null,
      item.artist ?? null,
      item.description ?? null,
      JSON.stringify(item.genres),
      item.status,
      item.type,
      item.rating ?? null,
      item.ratingCount ?? null,
      item.inLibrary ? 1 : 0,
      item.totalChapters ?? 0,
      item.unreadCount ?? 0,
      now,
      now
    );
  },

  async getById(id: string): Promise<MangaItem | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<MangaRow>(
      'SELECT * FROM manga WHERE id = ? OR source_id = ?',
      id,
      id
    );
    return row ? mapRowToManga(row) : null;
  },

  async getLibrary(filter?: { type?: string; searchQuery?: string }): Promise<MangaItem[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM manga WHERE in_library = 1';
    const params: (string | number)[] = [];

    if (filter?.type && filter.type !== 'all') {
      query += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter?.searchQuery) {
      query += ' AND (title LIKE ? OR author LIKE ?)';
      const wildcard = `%${filter.searchQuery}%`;
      params.push(wildcard, wildcard);
    }

    query += ' ORDER BY updated_at DESC';

    try {
      const rows =
        params.length > 0
          ? await db.getAllAsync<MangaRow>(query, ...params)
          : await db.getAllAsync<MangaRow>(query);
      return rows.map(mapRowToManga);
    } catch (err) {
      console.warn('Error querying library:', err);
      return [];
    }
  },

  async setInLibrary(id: string, inLibrary: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE manga SET in_library = ?, updated_at = ? WHERE id = ? OR source_id = ?',
      inLibrary ? 1 : 0,
      Date.now(),
      id,
      id
    );
  },

  async seedIfEmpty(items: MangaItem[]): Promise<void> {
    const db = await getDatabase();
    const countRow = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM manga');
    if (!countRow || countRow.count === 0) {
      for (const item of items) {
        await this.upsert(item);
      }
    }
  },

  async resetAndSeed(items: MangaItem[]): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM manga');
    for (const item of items) {
      await this.upsert(item);
    }
  },
};
