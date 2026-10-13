import { ChapterItem, ChapterPage, MangaItem, MangaType, SourceProvider } from '../types';
import { generateMockChapters, MOCK_MANGA_LIST, MOCK_READER_PAGES } from './mockData';

export class MockSourceProvider implements SourceProvider {
  id = 'mock';
  name = 'MangaNest Mock Source';
  version = '1.0.0';
  language = 'en';
  isEnabled = true;
  capabilities = {
    supportsSearch: true,
    supportsFilters: true,
    supportsLatest: true,
    supportsPopular: true,
  };

  async search(query: string, filters?: { type?: MangaType; genres?: string[] }): Promise<MangaItem[]> {
    const q = query.trim().toLowerCase();
    return MOCK_MANGA_LIST.filter((item) => {
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.altTitles && item.altTitles.some((alt) => alt.toLowerCase().includes(q))) ||
        (item.author && item.author.toLowerCase().includes(q));

      const matchesType = !filters?.type || item.type === filters.type;
      const matchesGenres =
        !filters?.genres?.length ||
        filters.genres.every((g) => item.genres.some((ig) => ig.toLowerCase() === g.toLowerCase()));

      return matchesQuery && matchesType && matchesGenres;
    });
  }

  async getPopular(): Promise<MangaItem[]> {
    return [...MOCK_MANGA_LIST].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  async getLatestUpdates(): Promise<MangaItem[]> {
    return MOCK_MANGA_LIST.filter((item) => !!item.unreadCount);
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const item = MOCK_MANGA_LIST.find((m) => m.sourceId === sourceId || m.id === sourceId);
    if (!item) {
      throw new Error(`Manga with sourceId ${sourceId} not found`);
    }
    return item;
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    return generateMockChapters(sourceId, 25);
  }

  async getPageList(_sourceChapterId: string): Promise<ChapterPage[]> {
    return MOCK_READER_PAGES;
  }
}
