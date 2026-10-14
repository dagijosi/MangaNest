import { ExtensionItem } from '../../services/extensionRepoService';
import { fetchText } from '../http/fetchText';
import { ChapterItem, ChapterPage, MangaItem, SourceProvider } from '../types';

const ASURA_ORIGIN = 'https://asurascans.com';

export class AsuraScansProvider implements SourceProvider {
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

  private catalogCache = new Map<string, MangaItem>();

  constructor(ext: ExtensionItem) {
    this.id = ext.packageName;
    this.name = ext.name;
    this.version = ext.versionName;
    this.icon = ext.iconUrl;
    this.language = ext.lang;
  }

  private cacheItem(item: MangaItem) {
    this.catalogCache.set(item.sourceId, item);
    this.catalogCache.set(item.id, item);
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    try {
      const html = await fetchText(`${ASURA_ORIGIN}/comics?page=${page}`, { referer: ASURA_ORIGIN });
      const cardRegex = /<a[^>]+href=["'](\/comics\/([^"']+))["'][^>]*>([\s\S]*?)<\/a>/gi;
      const liveList: MangaItem[] = [];
      const seen = new Set<string>();
      let m: RegExpExecArray | null;

      while ((m = cardRegex.exec(html)) !== null) {
        const slug = m[2];
        const inner = m[3];
        if (seen.has(slug) || slug.includes('chapter') || !slug) continue;
        seen.add(slug);

        const titleMatch =
          inner.match(/<span[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)<\/span>/i) ||
          inner.match(/alt=["']([^"']+)["']/i);
        let title = titleMatch ? titleMatch[1].trim() : slug.replace(/-[a-f0-9]+$/, '').replace(/-/g, ' ');
        title = title.replace(/\b\w/g, (c) => c.toUpperCase());

        const imgMatch = inner.match(/src=["']([^"']+)["']/i);
        const item: MangaItem = {
          id: `${this.id}:${slug}`,
          sourceId: slug,
          providerId: this.id,
          providerName: this.name,
          title,
          coverUrl: imgMatch?.[1] || '',
          genres: ['Action', 'Manhwa'],
          status: 'ongoing',
          type: 'manhwa',
          description: `Read ${title} on ${this.name}.`,
        };
        this.cacheItem(item);
        liveList.push(item);
      }

      return liveList;
    } catch (err) {
      console.warn('Asura getPopular failed:', err);
      return [];
    }
  }

  async getLatestUpdates(page = 1): Promise<MangaItem[]> {
    return this.getPopular(page);
  }

  async search(query: string): Promise<MangaItem[]> {
    const q = query.toLowerCase().trim();
    const popular = await this.getPopular(1);
    const matched = popular.filter((i) => i.title.toLowerCase().includes(q));
    if (matched.length > 0) return matched;

    for (const item of this.catalogCache.values()) {
      if (item.title.toLowerCase().includes(q) && !matched.some((x) => x.id === item.id)) {
        matched.push(item);
      }
    }
    return matched;
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const cached = this.catalogCache.get(sourceId) || this.catalogCache.get(`${this.id}:${sourceId}`);
    if (cached) return cached;

    const slug = sourceId.split(':').pop() || sourceId;
    const title = slug.replace(/-[a-f0-9]{6,}$/, '').replace(/-/g, ' ');
    const item: MangaItem = {
      id: `${this.id}:${slug}`,
      sourceId: slug,
      providerId: this.id,
      providerName: this.name,
      title: title.replace(/\b\w/g, (c) => c.toUpperCase()),
      coverUrl: this.icon || '',
      genres: ['Action', 'Manhwa'],
      status: 'ongoing',
      type: 'manhwa',
      description: '',
    };
    this.cacheItem(item);
    return item;
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    const slug = sourceId.split(':').pop() || sourceId;
    const html = await fetchText(`${ASURA_ORIGIN}/comics/${slug}`, { referer: ASURA_ORIGIN });
    const baseSlug = slug.replace(/-[a-f0-9]{6,}$/, '');
    const chRegex = /href=["'](\/comics\/([^"']+)\/chapter\/([^"']+))["'][^>]*>([\s\S]*?)<\/a>/gi;
    const liveChapters: ChapterItem[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;

    while ((m = chRegex.exec(html)) !== null) {
      const comicInLink = m[2];
      const chNum = m[3];
      if (!comicInLink.includes(baseSlug) && !baseSlug.includes(comicInLink)) continue;
      if (seen.has(chNum)) continue;
      seen.add(chNum);

      const num = parseFloat(chNum) || 1;
      liveChapters.push({
        id: `${this.id}::${slug}::${chNum}`,
        mangaId: `${this.id}:${slug}`,
        providerId: this.id,
        sourceChapterId: `${slug}___${chNum}`,
        chapterNumber: num,
        title: `Chapter ${chNum}`,
        scanlator: this.name,
      });
    }

    return liveChapters.sort((a, b) => b.chapterNumber - a.chapterNumber);
  }

  async getPageList(sourceChapterId: string): Promise<ChapterPage[]> {
    let mangaSlug = '';
    let chapterPart = sourceChapterId;
    if (sourceChapterId.includes('___')) {
      const parts = sourceChapterId.split('___');
      mangaSlug = parts[0].split(':').pop() || parts[0];
      chapterPart = parts.slice(1).join('___');
    }

    const html = await fetchText(`${ASURA_ORIGIN}/comics/${mangaSlug}/chapter/${chapterPart}`, {
      referer: `${ASURA_ORIGIN}/comics/${mangaSlug}`,
    });

    const liveImgs: string[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let im: RegExpExecArray | null;
    while ((im = imgRegex.exec(html)) !== null) {
      const src = im[1];
      if (
        (src.includes('asura-images/chapters') || src.includes('/chapters/')) &&
        !src.includes('covers') &&
        !src.includes('banner')
      ) {
        liveImgs.push(src);
      }
    }

    return liveImgs.map((imageUrl, idx) => ({
      pageNumber: idx + 1,
      imageUrl,
      width: 1000,
      height: 1500,
    }));
  }
}
