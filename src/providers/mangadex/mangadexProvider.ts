import { ChapterItem, ChapterPage, MangaItem, MangaStatus, MangaType, SourceProvider } from '../types';

export class MangaDexProvider implements SourceProvider {
  id = 'mangadex';
  name = 'MangaDex';
  version = '1.0.0';
  language = 'en';
  isEnabled = true;
  capabilities = {
    supportsSearch: true,
    supportsFilters: true,
    supportsLatest: true,
    supportsPopular: true,
  };

  private baseUrl = 'https://api.mangadex.org';

  private mapStatus(status: string): MangaStatus {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'hiatus':
        return 'hiatus';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'ongoing';
    }
  }

  private mapType(originalLang: string, publicationDemographic?: string): MangaType {
    if (originalLang === 'ko') return 'manhwa';
    if (originalLang === 'zh' || originalLang === 'zh-hk') return 'manhua';
    if (publicationDemographic === 'webtoon') return 'webtoon';
    return 'manga';
  }

  private formatCoverUrl(mangaId: string, fileName?: string): string {
    if (!fileName) {
      return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
    }
    return `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.512.jpg`;
  }

  private parseMangaItem(data: any): MangaItem {
    const attr = data.attributes || {};
    const titleObj = attr.title || {};
    const title =
      titleObj.en ||
      Object.values(titleObj)[0] ||
      'Untitled Manga';

    // Find cover art relationship
    const coverRel = data.relationships?.find((r: any) => r.type === 'cover_art');
    const coverFileName = coverRel?.attributes?.fileName;

    // Find author relationship
    const authorRel = data.relationships?.find((r: any) => r.type === 'author');
    const authorName = authorRel?.attributes?.name;

    // Find artist relationship
    const artistRel = data.relationships?.find((r: any) => r.type === 'artist');
    const artistName = artistRel?.attributes?.name;

    // Extract genres/tags
    const genres = (attr.tags || [])
      .map((t: any) => t.attributes?.name?.en)
      .filter(Boolean)
      .slice(0, 6);

    const descObj = attr.description || {};
    const description = descObj.en || Object.values(descObj)[0] || '';

    // Alt titles
    const altTitles: string[] = [];
    if (Array.isArray(attr.altTitles)) {
      for (const entry of attr.altTitles) {
        const val = Object.values(entry)[0];
        if (typeof val === 'string') altTitles.push(val);
      }
    }

    return {
      id: `mangadex:${data.id}`,
      sourceId: data.id,
      providerId: 'mangadex',
      providerName: 'MangaDex',
      title: String(title),
      altTitles: altTitles.slice(0, 5),
      coverUrl: this.formatCoverUrl(data.id, coverFileName),
      author: authorName,
      artist: artistName,
      description: String(description),
      genres,
      status: this.mapStatus(attr.status),
      type: this.mapType(attr.originalLanguage, attr.publicationDemographic),
      rating: 4.8,
      ratingCount: 1200,
      inLibrary: false,
      updatedAt: attr.updatedAt,
    };
  }

  async search(query: string): Promise<MangaItem[]> {
    try {
      const url = `${this.baseUrl}/manga?title=${encodeURIComponent(
        query
      )}&limit=20&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return (json.data || []).map((d: unknown) => this.parseMangaItem(d));
    } catch (err) {
      console.warn('MangaDex search failed:', err);
      return [];
    }
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    try {
      const offset = (page - 1) * 20;
      const url = `${this.baseUrl}/manga?order[followedCount]=desc&limit=20&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return (json.data || []).map((d: unknown) => this.parseMangaItem(d));
    } catch (err) {
      console.warn('MangaDex getPopular failed:', err);
      return [];
    }
  }

  async getLatestUpdates(page = 1): Promise<MangaItem[]> {
    try {
      const offset = (page - 1) * 20;
      const url = `${this.baseUrl}/manga?order[latestUploadedChapter]=desc&limit=20&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return (json.data || []).map((d: unknown) => this.parseMangaItem(d));
    } catch (err) {
      console.warn('MangaDex getLatestUpdates failed:', err);
      return [];
    }
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId);
    let targetId = sourceId;

    if (!isUuid) {
      const searchRes = await this.search(sourceId.replace(/[-_]/g, ' '));
      if (searchRes.length > 0) {
        return searchRes[0];
      }
      throw new Error(`Manga "${sourceId}" not found on MangaDex`);
    }

    const url = `${this.baseUrl}/manga/${targetId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load manga details (${res.status})`);
    const json = await res.json();
    return this.parseMangaItem(json.data);
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId);
      let targetId = sourceId;

      if (!isUuid) {
        const searchRes = await this.search(sourceId.replace(/[-_]/g, ' '));
        if (searchRes.length > 0) {
          targetId = searchRes[0].sourceId;
        } else {
          return [];
        }
      }

      // Fetch English chapters ordered descending by chapter number with limit=500
      let offset = 0;
      const limit = 500;
      const list: any[] = [];
      let total = 0;

      do {
        const url = `${this.baseUrl}/manga/${targetId}/feed?translatedLanguage[]=en&order[chapter]=desc&limit=${limit}&offset=${offset}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load chapters (${res.status})`);
        const json = await res.json();
        const batch = json.data || [];
        list.push(...batch);
        total = json.total || list.length;
        offset += limit;
      } while (list.length < total && offset < 2000);

      // If no English chapters found, fetch all languages fallback
      if (list.length === 0) {
        const fallbackRes = await fetch(
          `${this.baseUrl}/manga/${targetId}/feed?order[chapter]=desc&limit=500&contentRating[]=safe&contentRating[]=suggestive`
        );
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          list.push(...(fallbackJson.data || []));
        }
      }

      return list.map((item: any) => {
        const attr = item.attributes || {};
        const chNum = parseFloat(attr.chapter) || 0;
        const title = attr.title ? `Ch. ${attr.chapter}: ${attr.title}` : `Chapter ${attr.chapter || '?'}`;
        return {
          id: `mangadex:${item.id}`,
          mangaId: `mangadex:${sourceId}`,
          providerId: 'mangadex',
          sourceChapterId: item.id,
          chapterNumber: chNum,
          title,
          scanlator: attr.scanlation_group || 'MangaDex',
          releaseDate: attr.publishAt ? new Date(attr.publishAt).toLocaleDateString() : undefined,
          pageCount: attr.pages || 0,
          isRead: false,
          readProgress: 0,
        };
      });
    } catch (err) {
      console.warn('MangaDex getChapters failed:', err);
      return [];
    }
  }

  async getPageList(sourceChapterId: string): Promise<ChapterPage[]> {
    const url = `${this.baseUrl}/at-home/server/${sourceChapterId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load chapter server (${res.status})`);
    const json = await res.json();
    const baseUrl = json.baseUrl;
    const hash = json.chapter?.hash;
    const files: string[] = json.chapter?.data || json.chapter?.dataSaver || [];

    return files.map((fileName, index) => ({
      pageNumber: index + 1,
      imageUrl: `${baseUrl}/data/${hash}/${fileName}`,
    }));
  }
}
