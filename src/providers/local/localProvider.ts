import { ChapterItem, ChapterPage, MangaItem, SourceProvider } from '../types';

export const LOCAL_SAMPLE_MANGA: MangaItem[] = [];

export class LocalSourceProvider implements SourceProvider {
  id = 'local';
  name = 'Local Files & Archives';
  version = '2.0.0';
  language = 'all';
  isLocal = true;
  isEnabled = true;
  capabilities = {
    supportsSearch: true,
    supportsFilters: true,
    supportsLatest: false,
    supportsPopular: false,
  };

  async search(query: string): Promise<MangaItem[]> {
    const q = query.toLowerCase().trim();
    if (!q) return LOCAL_SAMPLE_MANGA;
    return LOCAL_SAMPLE_MANGA.filter((item) => item.title.toLowerCase().includes(q));
  }

  async getPopular(): Promise<MangaItem[]> {
    return LOCAL_SAMPLE_MANGA;
  }

  async getLatestUpdates(): Promise<MangaItem[]> {
    return LOCAL_SAMPLE_MANGA;
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const item = LOCAL_SAMPLE_MANGA.find((m) => m.sourceId === sourceId || m.id === sourceId);
    if (!item) {
      throw new Error(`Local manga ${sourceId} not found`);
    }
    return item;
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    const manga = await this.getMangaDetails(sourceId);
    const total = manga.totalChapters || 10;
    const chapters: ChapterItem[] = [];

    for (let i = total; i >= 1; i--) {
      chapters.push({
        id: `local:${sourceId}:ch-${i}`,
        mangaId: `local:${sourceId}`,
        providerId: 'local',
        sourceChapterId: `ch-${i}`,
        chapterNumber: i,
        title: `Chapter ${i}`,
        scanlator: 'Local Storage',
        releaseDate: 'Local File',
        isRead: i < total - 2,
        readProgress: i < total - 2 ? 100 : 0,
        pageCount: 30,
        isDownloaded: true,
      });
    }

    return chapters;
  }

  async getPageList(_sourceChapterId: string): Promise<ChapterPage[]> {
    return [];
  }
}
