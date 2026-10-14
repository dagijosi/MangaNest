import { ChapterItem, ChapterPage, MangaItem } from '../types';

export const MOCK_MANGA_LIST: MangaItem[] = [
  {
    id: 'mock:solo-leveling',
    sourceId: 'solo-leveling',
    providerId: 'mock',
    title: 'Solo Leveling',
    altTitles: ['Na Honjaman Level Up', 'I Alone Level Up'],
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    author: 'Chugong',
    artist: 'DUBU (REDICE STUDIO)',
    description:
      'Ten years ago, "the Gate" opened and connected the real world with the realm of magic and monsters. To combat these vile beasts, ordinary people received superhuman powers and became known as "Hunters." Sung Jin-Woo, known as the weakest E-rank hunter, finds himself trapped in a deadly double dungeon and awakes with a mysterious quest log only he can see.',
    genres: ['Action', 'Fantasy', 'Adventure', 'Supernatural'],
    status: 'completed',
    type: 'manhwa',
    rating: 4.9,
    ratingCount: 42100,
    inLibrary: true,
    totalChapters: 201,
    unreadCount: 12,
    lastReadChapterId: 'mock:solo-leveling:ch-200',
    lastReadChapterNumber: 200,
    lastReadProgress: 72,
    updatedAt: '2 days ago',
  },
];

export function generateMockChapters(mangaId: string, total: number = 30): ChapterItem[] {
  const chapters: ChapterItem[] = [];
  for (let i = total; i >= 1; i--) {
    const isLatest = i === total;
    chapters.push({
      id: `${mangaId}:ch-${i}`,
      mangaId,
      providerId: 'mock',
      sourceChapterId: `ch-${i}`,
      chapterNumber: i,
      title: i % 10 === 0 ? `The Turning Point Part ${i / 10}` : `Chapter ${i}`,
      scanlator: 'Asura Scans',
      releaseDate: isLatest ? '2 days ago' : `${total - i + 2} days ago`,
      isRead: i < total - 3,
      readProgress: i < total - 3 ? 100 : i === total - 3 ? 72 : 0,
      pageCount: 36,
      isDownloaded: i === total - 1,
    });
  }
  return chapters;
}

export const MOCK_READER_PAGES: ChapterPage[] = [
  {
    pageNumber: 1,
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1080&auto=format&fit=crop&q=85',
  },
  {
    pageNumber: 2,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&auto=format&fit=crop&q=85',
  },
  {
    pageNumber: 3,
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1080&auto=format&fit=crop&q=85',
  },
  {
    pageNumber: 4,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1080&auto=format&fit=crop&q=85',
  },
  {
    pageNumber: 5,
    imageUrl: 'https://images.unsplash.com/photo-1569701813229-33284b643e3c?w=1080&auto=format&fit=crop&q=85',
  },
  {
    pageNumber: 6,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&auto=format&fit=crop&q=85',
  },
];
