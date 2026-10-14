import { ChapterItem, ChapterPage, MangaItem, MangaStatus, MangaType, SourceProvider } from '../types';

export class ComicKProvider implements SourceProvider {
  id = 'comick';
  name = 'ComicK';
  version = '1.4.30';
  language = 'en';
  isEnabled = true;
  capabilities = {
    supportsSearch: true,
    supportsFilters: true,
    supportsLatest: true,
    supportsPopular: true,
  };

  private apiBase = 'https://api.comick.dev';
  private imageBase = 'https://meo.comick.pictures';

  private mapType(country?: string): MangaType {
    if (country === 'kr') return 'manhwa';
    if (country === 'cn' || country === 'hk' || country === 'tw') return 'manhua';
    return 'manga';
  }

  private mapStatus(statusNum?: number): MangaStatus {
    if (statusNum === 2) return 'completed';
    if (statusNum === 3) return 'cancelled';
    if (statusNum === 4) return 'hiatus';
    return 'ongoing';
  }

  private formatCover(b2key?: string): string {
    if (!b2key) {
      return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
    }
    return `${this.imageBase}/${b2key}`;
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    try {
      const res = await fetch(`${this.apiBase}/v1.0/search?sort=follow&page=${page}&limit=24`);
      if (!res.ok) throw new Error(`ComicK HTTP error ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];

      return list.map((item: any) => ({
        id: `comick:${item.hid || item.slug}`,
        sourceId: item.hid || item.slug,
        providerId: 'comick',
        providerName: 'ComicK',
        title: item.title || item.slug || 'Untitled',
        coverUrl: this.formatCover(item.md_covers?.[0]?.b2key || item.b2key),
        genres: (item.md_comic_md_genres || []).map((g: any) => g.md_genres?.name).filter(Boolean),
        status: this.mapStatus(item.status),
        type: this.mapType(item.country),
        rating: item.bayesian_rating ? parseFloat(item.bayesian_rating.toFixed(1)) : 4.6,
        description: item.desc || '',
      }));
    } catch (err) {
      console.warn('ComicK getPopular failed:', err);
      return [];
    }
  }

  async getLatestUpdates(page = 1): Promise<MangaItem[]> {
    try {
      const res = await fetch(`${this.apiBase}/v1.0/search?sort=uploaded&page=${page}&limit=24`);
      if (!res.ok) throw new Error(`ComicK HTTP error ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];

      return list.map((item: any) => ({
        id: `comick:${item.hid || item.slug}`,
        sourceId: item.hid || item.slug,
        providerId: 'comick',
        providerName: 'ComicK',
        title: item.title || item.slug || 'Untitled',
        coverUrl: this.formatCover(item.md_covers?.[0]?.b2key || item.b2key),
        genres: (item.md_comic_md_genres || []).map((g: any) => g.md_genres?.name).filter(Boolean),
        status: this.mapStatus(item.status),
        type: this.mapType(item.country),
        rating: item.bayesian_rating ? parseFloat(item.bayesian_rating.toFixed(1)) : 4.5,
        description: item.desc || '',
      }));
    } catch (err) {
      console.warn('ComicK getLatestUpdates failed:', err);
      return [];
    }
  }

  async search(query: string): Promise<MangaItem[]> {
    try {
      const res = await fetch(`${this.apiBase}/v1.0/search?q=${encodeURIComponent(query)}&limit=24`);
      if (!res.ok) throw new Error(`ComicK HTTP error ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];

      return list.map((item: any) => ({
        id: `comick:${item.hid || item.slug}`,
        sourceId: item.hid || item.slug,
        providerId: 'comick',
        providerName: 'ComicK',
        title: item.title || item.slug || 'Untitled',
        coverUrl: this.formatCover(item.md_covers?.[0]?.b2key || item.b2key),
        genres: (item.md_comic_md_genres || []).map((g: any) => g.md_genres?.name).filter(Boolean),
        status: this.mapStatus(item.status),
        type: this.mapType(item.country),
        rating: item.bayesian_rating ? parseFloat(item.bayesian_rating.toFixed(1)) : 4.5,
        description: item.desc || '',
      }));
    } catch (err) {
      console.warn('ComicK search failed:', err);
      return [];
    }
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const res = await fetch(`${this.apiBase}/comic/${sourceId}`);
    if (!res.ok) throw new Error(`ComicK HTTP error ${res.status}`);
    const data = await res.json();
    const comic = data.comic || data;

    return {
      id: `comick:${comic.hid || sourceId}`,
      sourceId: comic.hid || sourceId,
      providerId: 'comick',
      providerName: 'ComicK',
      title: comic.title || sourceId,
      altTitles: (comic.md_titles || []).map((t: any) => t.title),
      coverUrl: this.formatCover(comic.md_covers?.[0]?.b2key),
      author: (comic.authors || []).map((a: any) => a.name).join(', ') || undefined,
      artist: (comic.artists || []).map((a: any) => a.name).join(', ') || undefined,
      description: comic.desc || '',
      genres: (comic.md_comic_md_genres || []).map((g: any) => g.md_genres?.name).filter(Boolean),
      status: this.mapStatus(comic.status),
      type: this.mapType(comic.country),
      rating: comic.bayesian_rating ? parseFloat(comic.bayesian_rating.toFixed(1)) : 4.8,
      ratingCount: comic.user_follow_count || 1000,
    };
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    try {
      const res = await fetch(`${this.apiBase}/comic/${sourceId}/chapters?lang=en&limit=150`);
      if (!res.ok) throw new Error(`ComicK HTTP error ${res.status}`);
      const data = await res.json();
      const rawChapters = data.chapters || [];

      return rawChapters.map((ch: any) => ({
        id: `comick:${ch.hid}`,
        mangaId: `comick:${sourceId}`,
        providerId: 'comick',
        sourceChapterId: ch.hid,
        chapterNumber: parseFloat(ch.chap || '0') || 0,
        title: ch.title || (ch.chap ? `Chapter ${ch.chap}` : 'Chapter'),
        releaseDate: ch.created_at ? new Date(ch.created_at).toISOString().split('T')[0] : undefined,
        scanlator: ch.group_name || undefined,
      }));
    } catch (err) {
      console.warn('ComicK getChapters failed:', err);
      return [];
    }
  }

  async getPageList(sourceChapterId: string): Promise<ChapterPage[]> {
    const res = await fetch(`${this.apiBase}/chapter/${sourceChapterId}`);
    if (!res.ok) throw new Error(`ComicK HTTP error ${res.status}`);
    const data = await res.json();
    const images = data.chapter?.images || [];

    return images.map((img: any, idx: number) => ({
      pageNumber: idx + 1,
      imageUrl: img.url?.startsWith('http') ? img.url : `${this.imageBase}/${img.b2key}`,
      width: img.w,
      height: img.h,
    }));
  }
}
