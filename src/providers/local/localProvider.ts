import { ChapterItem, ChapterPage, MangaItem, SourceProvider } from '../types';
import { MOCK_READER_PAGES } from '../mock/mockData';

export const LOCAL_SAMPLE_MANGA: MangaItem[] = [
  {
    id: 'local:my-hero-academia',
    sourceId: 'my-hero-academia',
    providerId: 'local',
    title: 'My Hero Academia (Local CBZ)',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    author: 'Kohei Horikoshi',
    description: 'Local manga comic archive imported directly from device storage.',
    genres: ['Action', 'Superhero', 'Shounen'],
    status: 'ongoing',
    type: 'manga',
    rating: 4.8,
    ratingCount: 1540,
    inLibrary: false,
    totalChapters: 12,
    unreadCount: 2,
    updatedAt: 'Device Storage',
  },
];

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
    return MOCK_READER_PAGES;
  }
}
