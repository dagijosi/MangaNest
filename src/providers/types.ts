export type MangaType = 'manga' | 'manhwa' | 'manhua' | 'webtoon';
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export interface MangaItem {
  id: string; // Globally unique: `${providerId}:${sourceId}`
  sourceId: string; // Source-specific ID
  providerId: string;
  providerName?: string; // Human-readable extension/source name (e.g. 'MangaDex', 'ComicK')
  title: string;
  altTitles?: string[];
  coverUrl: string;
  author?: string;
  artist?: string;
  description?: string;
  genres: string[];
  status: MangaStatus;
  type: MangaType;
  rating?: number;
  ratingCount?: number;
  inLibrary?: boolean;
  totalChapters?: number;
  unreadCount?: number;
  lastReadChapterId?: string;
  lastReadChapterNumber?: number;
  lastReadProgress?: number; // 0 to 100 percentage
  updatedAt?: string;
}

export interface ChapterItem {
  id: string; // Globally unique: `${providerId}:${sourceChapterId}`
  mangaId: string;
  providerId: string;
  sourceChapterId: string;
  chapterNumber: number;
  title?: string;
  scanlator?: string;
  releaseDate?: string;
  isRead?: boolean;
  readProgress?: number; // 0 to 100 percentage
  lastReadAt?: string;
  pageCount?: number;
  isDownloaded?: boolean;
}

export interface ChapterPage {
  pageNumber: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface ProviderCapabilities {
  supportsSearch: boolean;
  supportsFilters: boolean;
  supportsLatest: boolean;
  supportsPopular: boolean;
}

export interface SourceProvider {
  id: string;
  name: string;
  version: string;
  icon?: string;
  language: string;
  isLocal?: boolean;
  isEnabled: boolean;
  capabilities: ProviderCapabilities;

  search(query: string, filters?: { type?: MangaType; genres?: string[] }): Promise<MangaItem[]>;
  getPopular(page?: number): Promise<MangaItem[]>;
  getLatestUpdates(page?: number): Promise<MangaItem[]>;
  getMangaDetails(sourceId: string): Promise<MangaItem>;
  getChapters(sourceId: string): Promise<ChapterItem[]>;
  getPageList(sourceChapterId: string): Promise<ChapterPage[]>;
}
