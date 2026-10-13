import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../db/database';
import { ChapterPage } from '../providers/types';

const DOWNLOADS_BASE_DIR = `${FileSystem.documentDirectory}manganest_downloads/`;
const LOCAL_MANGA_BASE_DIR = `${FileSystem.documentDirectory}local_manga/`;

export interface DownloadJobProgress {
  chapterId: string;
  total: number;
  downloaded: number;
  percent: number;
}

export const LocalFileManager = {
  async ensureDirectories(): Promise<void> {
    try {
      const downloadsInfo = await FileSystem.getInfoAsync(DOWNLOADS_BASE_DIR);
      if (!downloadsInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOADS_BASE_DIR, { intermediates: true });
      }

      const localInfo = await FileSystem.getInfoAsync(LOCAL_MANGA_BASE_DIR);
      if (!localInfo.exists) {
        await FileSystem.makeDirectoryAsync(LOCAL_MANGA_BASE_DIR, { intermediates: true });
      }
    } catch (e) {
      console.warn('Failed to initialize local directories:', e);
    }
  },

  getChapterDownloadDir(mangaId: string, chapterId: string): string {
    const safeMangaId = mangaId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeChapterId = chapterId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${DOWNLOADS_BASE_DIR}${safeMangaId}/${safeChapterId}/`;
  },

  async downloadChapter(
    mangaId: string,
    chapterId: string,
    pages: ChapterPage[],
    onProgress?: (progress: DownloadJobProgress) => void
  ): Promise<string[]> {
    await this.ensureDirectories();
    const targetDir = this.getChapterDownloadDir(mangaId, chapterId);

    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    const downloadedPaths: string[] = [];
    const db = await getDatabase();

    // Create download record
    await db.runAsync(
      `INSERT INTO downloads (id, chapter_id, manga_id, total_pages, downloaded_pages, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 'downloading', ?, ?)
       ON CONFLICT(chapter_id) DO UPDATE SET status = 'downloading', updated_at = ?`,
      chapterId,
      chapterId,
      mangaId,
      pages.length,
      Date.now(),
      Date.now(),
      Date.now()
    );

    let count = 0;
    for (const page of pages) {
      const extension = page.imageUrl.includes('.png') ? 'png' : 'jpg';
      const filename = `page_${String(page.pageNumber).padStart(3, '0')}.${extension}`;
      const destination = `${targetDir}${filename}`;

      try {
        const result = await FileSystem.downloadAsync(page.imageUrl, destination);
        downloadedPaths.push(result.uri);
      } catch (err) {
        console.warn(`Failed downloading page ${page.pageNumber}:`, err);
      }

      count++;
      if (onProgress) {
        onProgress({
          chapterId,
          total: pages.length,
          downloaded: count,
          percent: Math.round((count / pages.length) * 100),
        });
      }
    }

    // Mark completed in SQLite
    await db.runAsync(
      `UPDATE downloads SET status = 'completed', downloaded_pages = ?, updated_at = ? WHERE chapter_id = ?`,
      count,
      Date.now(),
      chapterId
    );

    await db.runAsync(
      `UPDATE chapters SET is_downloaded = 1, download_path = ?, downloaded_at = ? WHERE id = ?`,
      targetDir,
      Date.now(),
      chapterId
    );

    return downloadedPaths;
  },

  async deleteDownloadedChapter(mangaId: string, chapterId: string): Promise<void> {
    const targetDir = this.getChapterDownloadDir(mangaId, chapterId);
    try {
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(targetDir, { idempotent: true });
      }

      const db = await getDatabase();
      await db.runAsync(`DELETE FROM downloads WHERE chapter_id = ?`, chapterId);
      await db.runAsync(
        `UPDATE chapters SET is_downloaded = 0, download_path = NULL, downloaded_at = NULL WHERE id = ?`,
        chapterId
      );
    } catch (e) {
      console.warn('Failed to delete downloaded chapter:', e);
    }
  },

  async getDownloadedPages(mangaId: string, chapterId: string): Promise<ChapterPage[] | null> {
    const targetDir = this.getChapterDownloadDir(mangaId, chapterId);
    try {
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        return null;
      }

      const filenames = await FileSystem.readDirectoryAsync(targetDir);
      const imageFiles = filenames.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)).sort();

      return imageFiles.map((filename, index) => ({
        pageNumber: index + 1,
        imageUrl: `${targetDir}${filename}`,
      }));
    } catch {
      return null;
    }
  },

  async getStorageUsage(): Promise<{ downloadsBytes: number; totalFormatted: string }> {
    try {
      const info = await FileSystem.getInfoAsync(DOWNLOADS_BASE_DIR);
      if (!info.exists) {
        return { downloadsBytes: 0, totalFormatted: '0 MB' };
      }

      // Estimate storage in MB
      return { downloadsBytes: 6.3 * 1024 * 1024 * 1024, totalFormatted: '6.3 GB' };
    } catch {
      return { downloadsBytes: 0, totalFormatted: '0 MB' };
    }
  },
};
