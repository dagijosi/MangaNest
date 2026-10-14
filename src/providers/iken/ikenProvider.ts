import { ExtensionItem } from '../../services/extensionRepoService';
import { fetchText, normalizeBaseUrl } from '../http/fetchText';
import { ChapterItem, ChapterPage, MangaItem, MangaStatus, MangaType, SourceProvider } from '../types';

interface IkenGenre {
  id: number;
  name: string;
}

interface IkenChapter {
  id: number;
  slug: string;
  number: string | number;
  title?: string | null;
  createdAt?: string;
  isLocked?: boolean;
  isTimeLocked?: boolean;
  price?: number;
  chapterPurchased?: boolean;
}

interface IkenManga {
  id: number;
  slug: string;
  postTitle: string;
  postContent?: string | null;
  featuredImage?: string | null;
  seriesType?: string | null;
  seriesStatus?: string | null;
  genres?: IkenGenre[];
  chapters?: IkenChapter[];
}

interface SearchResponse {
  posts: IkenManga[];
  totalCount: number;
}

interface MangaDto {
  post: IkenManga;
}

interface PageResponse {
  chapter: {
    images: { url: string; order?: number }[];
    isPermanentlyLocked?: boolean;
    isLockedByCoins?: boolean;
    isShortLinkLocked?: boolean;
  };
}

export class IkenProvider implements SourceProvider {
  id: string;
  name: string;
  version: string;
  icon?: string;
  language: string;
  isEnabled = true;
  readonly supported = true as const;
  capabilities = {
    supportsSearch: true,
    supportsFilters: false,
    supportsLatest: true,
    supportsPopular: true,
  };

  private baseUrl: string;
  private apiUrl: string;

  constructor(ext: ExtensionItem) {
    this.id = ext.packageName;
    this.name = ext.name;
    this.version = ext.versionName;
    this.icon = ext.iconUrl;
    this.language = ext.lang;
    this.baseUrl = normalizeBaseUrl(ext.sources[0]?.homeUrl || '');
    this.apiUrl = this.baseUrl.replace(/^https:\/\//i, 'https://api.');
  }

  private mapStatus(s?: string | null): MangaStatus {
    if (s === 'COMPLETED') return 'completed';
    if (s === 'CANCELLED' || s === 'DROPPED') return 'cancelled';
    if (s === 'HIATUS') return 'hiatus';
    return 'ongoing';
  }

  private mapType(s?: string | null): MangaType {
    if (s === 'MANHWA') return 'manhwa';
    if (s === 'MANHUA') return 'manhua';
    return 'manga';
  }

  private toItem(m: IkenManga): MangaItem {
    return {
      id: `${this.id}:${m.slug}`,
      sourceId: m.slug,
      providerId: this.id,
      providerName: this.name,
      title: m.postTitle,
      coverUrl: m.featuredImage || '',
      genres: m.genres?.map((g) => g.name) || [],
      status: this.mapStatus(m.seriesStatus),
      type: this.mapType(m.seriesType),
      description: m.postContent?.replace(/<[^>]+>/g, '').trim(),
    };
  }

  private async queryApi(params: Record<string, string>): Promise<SearchResponse> {
    const url = new URL(`${this.apiUrl}/api/query`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const json = await fetchText(url.toString(), {
      referer: this.baseUrl,
      headers: { Accept: 'application/json' },
    });
    return JSON.parse(json) as SearchResponse;
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    const data = await this.queryApi({
      page: String(page),
      perPage: '18',
      searchTerm: '',
      orderBy: 'totalViews',
      orderDirection: 'desc',
    });
    return data.posts.filter((p) => p.seriesType?.toLowerCase() !== 'novel').map((p) => this.toItem(p));
  }

  async getLatestUpdates(page = 1): Promise<MangaItem[]> {
    const data = await this.queryApi({
      page: String(page),
      perPage: '18',
      searchTerm: '',
      orderBy: 'lastChapterAddedAt',
      orderDirection: 'desc',
    });
    return data.posts.filter((p) => p.seriesType?.toLowerCase() !== 'novel').map((p) => this.toItem(p));
  }

  async search(query: string): Promise<MangaItem[]> {
    const data = await this.queryApi({
      page: '1',
      perPage: '24',
      searchTerm: query.trim(),
      orderBy: 'totalViews',
      orderDirection: 'desc',
    });
    return data.posts.map((p) => this.toItem(p));
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const slug = sourceId.split(':').pop() || sourceId;
    const url = `${this.apiUrl}/api/post?postSlug=${encodeURIComponent(slug)}`;
    const json = await fetchText(url, { referer: this.baseUrl, headers: { Accept: 'application/json' } });
    const data = JSON.parse(json) as MangaDto;
    return this.toItem(data.post);
  }

  private chapterLocked(ch: IkenChapter): boolean {
    return (
      ch.isLocked === true ||
      ch.isTimeLocked === true ||
      (ch.chapterPurchased === false && (ch.price ?? 0) !== 0)
    );
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    const slug = sourceId.split(':').pop() || sourceId;
    const url = `${this.apiUrl}/api/post?postSlug=${encodeURIComponent(slug)}`;
    const json = await fetchText(url, { referer: this.baseUrl, headers: { Accept: 'application/json' } });
    const data = JSON.parse(json) as MangaDto;
    const list = (data.post.chapters || []).filter((c) => !this.chapterLocked(c));

    return list
      .map((ch) => {
        const num = typeof ch.number === 'number' ? ch.number : parseFloat(String(ch.number)) || 1;
        const title = ch.title ? `Chapter ${num} - ${ch.title}` : `Chapter ${num}`;
        return {
          id: `${this.id}::${slug}::${ch.id}`,
          mangaId: `${this.id}:${slug}`,
          providerId: this.id,
          sourceChapterId: `${slug}___${ch.id}`,
          chapterNumber: num,
          title,
          scanlator: this.name,
        };
      })
      .sort((a, b) => b.chapterNumber - a.chapterNumber);
  }

  async getPageList(sourceChapterId: string): Promise<ChapterPage[]> {
    let chapterId = sourceChapterId;
    if (sourceChapterId.includes('___')) {
      chapterId = sourceChapterId.split('___').pop() || sourceChapterId;
    }

    const url = `${this.apiUrl}/api/chapter?chapterId=${encodeURIComponent(chapterId)}`;
    const json = await fetchText(url, { referer: this.baseUrl, headers: { Accept: 'application/json' } });
    const data = JSON.parse(json) as PageResponse;
    const ch = data.chapter;
    if (ch.isPermanentlyLocked || ch.isLockedByCoins || ch.isShortLinkLocked) {
      throw new Error('This chapter is locked on the source website.');
    }

    const images = [...ch.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return images.map((img, idx) => ({
      pageNumber: idx + 1,
      imageUrl: img.url,
      width: 900,
      height: 1300,
    }));
  }
}
