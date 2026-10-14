import { ExtensionItem } from '../../services/extensionRepoService';
import { absolutizeUrl, fetchText, normalizeBaseUrl } from '../http/fetchText';
import { ChapterItem, ChapterPage, MangaItem, SourceProvider } from '../types';

export class MangaThemesiaProvider implements SourceProvider {
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
  private mangaDirectory: string;

  constructor(ext: ExtensionItem, mangaDirectory = '/manga') {
    this.id = ext.packageName;
    this.name = ext.name;
    this.version = ext.versionName;
    this.icon = ext.iconUrl;
    this.language = ext.lang;
    this.baseUrl = normalizeBaseUrl(ext.sources[0]?.homeUrl || '');
    this.mangaDirectory = mangaDirectory.startsWith('/') ? mangaDirectory : `/${mangaDirectory}`;
  }

  private listingUrl(page: number, query: string, order?: 'popular' | 'update'): string {
    const path = this.mangaDirectory.replace(/^\//, '');
    const url = new URL(`${this.baseUrl}/${path}/`);
    if (query.trim()) url.searchParams.set('title', query.trim());
    url.searchParams.set('page', String(page));
    if (order) url.searchParams.set('order', order);
    return url.toString();
  }

  private imgAttr(tag: string): string {
    const m =
      tag.match(/data-src=["']([^"']+)["']/i) ||
      tag.match(/data-lazy-src=["']([^"']+)["']/i) ||
      tag.match(/src=["']([^"']+)["']/i);
    return m?.[1] || '';
  }

  private parseSearchHtml(html: string): MangaItem[] {
    const items: MangaItem[] = [];
    const seen = new Set<string>();
    const cardRegex =
      /<div[^>]*class="[^"]*(?:utao|listupd|listo|bsx)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div|$)/gi;
    let block: RegExpExecArray | null;

    const pushFromInner = (inner: string) => {
      const link = inner.match(/<a[^>]+href=["']([^"']+)["'][^>]*(?:title=["']([^"']+)["'])?/i);
      if (!link) return;
      const href = link[1];
      const slugMatch = href.match(/\/([^/?#]+)\/?(?:\?|$)/);
      const slug = slugMatch?.[1];
      if (!slug || seen.has(slug)) return;
      seen.add(slug);

      const imgTag = inner.match(/<img[^>]+>/i)?.[0] || '';
      const title =
        link[2]?.trim() ||
        inner.match(/<a[^>]+title=["']([^"']+)["']/i)?.[1]?.trim() ||
        slug.replace(/-/g, ' ');

      items.push({
        id: `${this.id}:${slug}`,
        sourceId: slug,
        providerId: this.id,
        providerName: this.name,
        title,
        coverUrl: absolutizeUrl(this.baseUrl, this.imgAttr(imgTag)),
        genres: [],
        status: 'ongoing',
        type: 'manhwa',
      });
    };

    while ((block = cardRegex.exec(html)) !== null) {
      pushFromInner(block[1]);
    }

    if (items.length === 0) {
      const linkRegex = new RegExp(
        `<a[^>]+href=["'](${this.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${this.mangaDirectory}/[^"']+)["']`,
        'gi'
      );
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1];
        const slug = href.split('/').filter(Boolean).pop();
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        items.push({
          id: `${this.id}:${slug}`,
          sourceId: slug,
          providerId: this.id,
          providerName: this.name,
          title: slug.replace(/-/g, ' '),
          coverUrl: '',
          genres: [],
          status: 'ongoing',
          type: 'manhwa',
        });
      }
    }

    return items;
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    const html = await fetchText(this.listingUrl(page, '', 'popular'), { referer: this.baseUrl });
    return this.parseSearchHtml(html);
  }

  async getLatestUpdates(page = 1): Promise<MangaItem[]> {
    const html = await fetchText(this.listingUrl(page, '', 'update'), { referer: this.baseUrl });
    return this.parseSearchHtml(html);
  }

  async search(query: string): Promise<MangaItem[]> {
    const html = await fetchText(this.listingUrl(1, query), { referer: this.baseUrl });
    return this.parseSearchHtml(html);
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const slug = sourceId.split(':').pop() || sourceId;
    const url = `${this.baseUrl}${this.mangaDirectory}/${slug}/`;
    const html = await fetchText(url, { referer: this.baseUrl });
    const title =
      html.match(/class="[^"]*entry-title[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim() ||
      slug.replace(/-/g, ' ');
    const cover =
      html.match(/class="[^"]*thumb[^"]*"[\s\S]*?<img[^>]+>/i)?.[0] ||
      html.match(/<img[^>]+>/i)?.[0] ||
      '';
    return {
      id: `${this.id}:${slug}`,
      sourceId: slug,
      providerId: this.id,
      providerName: this.name,
      title,
      coverUrl: cover ? absolutizeUrl(this.baseUrl, this.imgAttr(cover)) : '',
      genres: [],
      status: 'ongoing',
      type: 'manhwa',
      description: html.match(/class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1]?.replace(/<[^>]+>/g, '').trim(),
    };
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    const slug = sourceId.split(':').pop() || sourceId;
    const url = `${this.baseUrl}${this.mangaDirectory}/${slug}/`;
    const html = await fetchText(url, { referer: this.baseUrl });

    const chapters: ChapterItem[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li: RegExpExecArray | null;
    while ((li = liRegex.exec(html)) !== null) {
      const inner = li[1];
      if (!/lch|chapternum|chapter/i.test(inner)) continue;
      const hrefMatch = inner.match(/href=["']([^"']+)["']/i);
      if (!hrefMatch) continue;
      const href = hrefMatch[1];
      const name =
        inner.match(/class="[^"]*chapternum[^"]*"[^>]*>([^<]+)</i)?.[1]?.trim() ||
        inner.match(/class="[^"]*lch[^"]*"[\s\S]*?>([^<]+)</i)?.[1]?.trim() ||
        'Chapter';
      const numMatch = name.match(/(\d+(?:\.\d+)?)/);
      const chapterNumber = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;
      const chapterPath = href.startsWith('http') ? new URL(href).pathname : href;
      const chapterKey = chapterPath.replace(/^\//, '').replace(/\//g, '___');

      chapters.push({
        id: `${this.id}::${slug}::${chapterKey}`,
        mangaId: `${this.id}:${slug}`,
        providerId: this.id,
        sourceChapterId: `${slug}___${chapterKey}`,
        chapterNumber,
        title: name,
        scanlator: this.name,
      });
    }

    return chapters.sort((a, b) => b.chapterNumber - a.chapterNumber);
  }

  async getPageList(sourceChapterId: string): Promise<ChapterPage[]> {
    let mangaSlug = '';
    let chapterKey = sourceChapterId;
    if (sourceChapterId.includes('___')) {
      const parts = sourceChapterId.split('___');
      mangaSlug = parts[0];
      chapterKey = parts.slice(1).join('___').replace(/___/g, '/');
    }

    const chapterPath = chapterKey.startsWith('/') ? chapterKey : `/${chapterKey}`;
    const chapterUrl = chapterPath.startsWith('http')
      ? chapterPath
      : absolutizeUrl(this.baseUrl, chapterPath);

    const html = await fetchText(chapterUrl, {
      referer: `${this.baseUrl}${this.mangaDirectory}/${mangaSlug}/`,
    });

    const urls: string[] = [];
    const readerMatch = html.match(/id=["']readerarea["'][\s\S]*?(?=<div[^>]+id=|$)/i);
    const scan = readerMatch?.[0] || html;
    const imgRegex = /<img[^>]+>/gi;
    let im: RegExpExecArray | null;
    while ((im = imgRegex.exec(scan)) !== null) {
      const src = this.imgAttr(im[0]);
      if (src && !src.includes('avatar') && !src.endsWith('.svg')) {
        urls.push(absolutizeUrl(this.baseUrl, src));
      }
    }

    return [...new Set(urls)].map((imageUrl, idx) => ({
      pageNumber: idx + 1,
      imageUrl,
      width: 900,
      height: 1300,
    }));
  }
}
