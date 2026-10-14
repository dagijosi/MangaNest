import { ExtensionItem } from '../../services/extensionRepoService';
import { absolutizeUrl, fetchText, normalizeBaseUrl } from '../http/fetchText';
import { ChapterItem, ChapterPage, MangaItem, MangaStatus, SourceProvider } from '../types';

const PAGE_SIZE = 25;

export class MadaraProvider implements SourceProvider {
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
  private mangaPath: string;

  constructor(ext: ExtensionItem, mangaPath = 'manga') {
    this.id = ext.packageName;
    this.name = ext.name;
    this.version = ext.versionName;
    this.icon = ext.iconUrl;
    this.language = ext.lang;
    this.baseUrl = normalizeBaseUrl(ext.sources[0]?.homeUrl || '');
    this.mangaPath = mangaPath;
  }

  private mapItem(slug: string, title: string, coverUrl: string, href: string): MangaItem {
    return {
      id: `${this.id}:${slug}`,
      sourceId: slug,
      providerId: this.id,
      providerName: this.name,
      title,
      coverUrl: absolutizeUrl(this.baseUrl, coverUrl),
      genres: [],
      status: 'ongoing',
      type: 'manhwa',
      description: `From ${this.name}`,
    };
  }

  private parseArchiveHtml(html: string): MangaItem[] {
    const items: MangaItem[] = [];
    const seen = new Set<string>();

    const blockRegex =
      /<div[^>]*class="[^"]*(?:page-item-detail|manga__item|c-tabs-item__content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*(?:page-item-detail|manga__item|c-tabs-item__content)|$)/gi;

    let block: RegExpExecArray | null;
    const tryBlock = (inner: string) => {
      const hrefMatch =
        inner.match(/class=["'][^"']*post-title[^"']*["'][\s\S]*?href=["']([^"']+)["']/i) ||
        inner.match(/href=["']([^"']+\/(?:manga|comics|series)\/[^"']+)["']/i);
      if (!hrefMatch) return;

      const href = hrefMatch[1];
      const slugMatch = href.match(/\/(?:manga|comics|series)\/([^/?#]+)/i);
      if (!slugMatch) return;
      const slug = slugMatch[1];
      if (seen.has(slug)) return;
      seen.add(slug);

      const titleMatch =
        inner.match(/class=["'][^"']*post-title[^"']*["'][\s\S]*?>([^<]+)</i) ||
        inner.match(/title=["']([^"']+)["']/i) ||
        inner.match(/<img[^>]+alt=["']([^"']+)["']/i);
      const title = (titleMatch?.[1] || slug.replace(/-/g, ' ')).trim();

      const imgMatch =
        inner.match(/data-src=["']([^"']+)["']/i) ||
        inner.match(/src=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i);
      const cover = imgMatch?.[1] || '';

      items.push(this.mapItem(slug, title, cover, href));
    };

    while ((block = blockRegex.exec(html)) !== null) {
      tryBlock(block[1]);
    }

    if (items.length === 0) {
      const linkRegex = /href=["']([^"']*\/(?:manga|comics|series)\/([^/?#"']+))\/?["']/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        const slug = m[2];
        if (seen.has(slug) || slug === 'page' || slug === 'category') continue;
        seen.add(slug);
        items.push(this.mapItem(slug, slug.replace(/-/g, ' '), '', m[1]));
      }
    }

    return items;
  }

  private buildMadaraForm(page: number, mode: 'popular' | 'latest' | 'search', query?: string): string {
    const params = new URLSearchParams();
    params.set('action', 'madara_load_more');
    params.set('page', String(Math.max(0, page - 1)));
    params.set('template', 'madara-core/content/content-archive');
    params.set('vars[paged]', '1');
    params.set('vars[template]', 'archive');
    params.set('vars[posts_per_page]', String(PAGE_SIZE));
    params.set('vars[post_type]', 'wp-manga');
    params.set('vars[post_status]', 'publish');
    params.set('vars[manga_archives_item_layout]', 'big_thumbnail');
    params.set('vars[meta_query][0][key]', '_wp_manga_chapter_type');
    params.set('vars[meta_query][0][value]', 'manga');
    params.set('vars[orderby]', 'meta_value_num');
    params.set('vars[order]', 'DESC');

    if (mode === 'popular') {
      params.set('vars[meta_key]', '_wp_manga_views');
    } else if (mode === 'latest') {
      params.set('vars[meta_key]', '_latest_update');
    } else if (mode === 'search' && query) {
      params.set('vars[s]', query);
    }

    return params.toString();
  }

  private async ajaxList(page: number, mode: 'popular' | 'latest' | 'search', query?: string): Promise<MangaItem[]> {
    const body = this.buildMadaraForm(page, mode, query);
    const html = await fetchText(`${this.baseUrl}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      body,
      referer: `${this.baseUrl}/${this.mangaPath}/`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeoutMs: 12000,
    });
    return this.parseArchiveHtml(html);
  }

  async getPopular(page = 1): Promise<MangaItem[]> {
    try {
      const items = await this.ajaxList(page, 'popular');
      if (items.length > 0) return items;
    } catch (e) {
      console.warn(`${this.name} Madara popular ajax failed:`, e);
    }

    try {
      const html = await fetchText(`${this.baseUrl}/${this.mangaPath}/?m_orderby=views`, {
        referer: this.baseUrl,
      });
      return this.parseArchiveHtml(html).slice(0, PAGE_SIZE);
    } catch {
      return [];
    }
  }

  async getLatestUpdates(page = 1): Promise<MangaItem[]> {
    try {
      return await this.ajaxList(page, 'latest');
    } catch (e) {
      console.warn(`${this.name} Madara latest ajax failed:`, e);
      return [];
    }
  }

  async search(query: string): Promise<MangaItem[]> {
    const q = query.trim();
    if (!q) return [];
    try {
      return await this.ajaxList(1, 'search', q);
    } catch (e) {
      console.warn(`${this.name} Madara search failed:`, e);
      return [];
    }
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    const slug = sourceId.split(':').pop() || sourceId;
    const url = `${this.baseUrl}/${this.mangaPath}/${slug}/`;
    try {
      const html = await fetchText(url, { referer: this.baseUrl });
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/property="og:title"\s+content="([^"]+)"/i);
      const title = titleMatch?.[1]?.trim() || slug.replace(/-/g, ' ');
      const coverMatch =
        html.match(/property="og:image"\s+content="([^"]+)"/i) ||
        html.match(/summary_image[\s\S]*?src=["']([^"']+)["']/i);
      const descMatch =
        html.match(/class="[^"]*description-summary[^"]*"[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i) ||
        html.match(/property="og:description"\s+content="([^"]+)"/i);

      let status: MangaStatus = 'ongoing';
      if (/completed|finished|end/i.test(html)) status = 'completed';
      else if (/hiatus/i.test(html)) status = 'hiatus';

      return {
        id: `${this.id}:${slug}`,
        sourceId: slug,
        providerId: this.id,
        providerName: this.name,
        title,
        coverUrl: coverMatch ? absolutizeUrl(this.baseUrl, coverMatch[1]) : '',
        genres: [],
        status,
        type: 'manhwa',
        description: descMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || '',
      };
    } catch {
      return this.mapItem(slug, slug.replace(/-/g, ' '), '', url);
    }
  }

  async getChapters(sourceId: string): Promise<ChapterItem[]> {
    const slug = sourceId.split(':').pop() || sourceId;
    const url = `${this.baseUrl}/${this.mangaPath}/${slug}/`;
    const html = await fetchText(url, { referer: this.baseUrl });

    const chapters: ChapterItem[] = [];
    const seen = new Set<string>();
    const chRegex =
      /class=["'][^"']*wp-manga-chapter[^"']*["'][\s\S]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;

    while ((m = chRegex.exec(html)) !== null) {
      const href = m[1];
      const inner = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const chSlugMatch = href.match(/\/([^/?#]+)\/?(?:\?|$)/);
      const chSlug = chSlugMatch?.[1] || inner;
      if (!chSlug || seen.has(chSlug)) continue;
      seen.add(chSlug);

      const numMatch = inner.match(/(\d+(?:\.\d+)?)/) || chSlug.match(/(\d+(?:\.\d+)?)/);
      const chapterNumber = numMatch ? parseFloat(numMatch[1]) : chapters.length + 1;

      chapters.push({
        id: `${this.id}::${slug}::${chSlug}`,
        mangaId: `${this.id}:${slug}`,
        providerId: this.id,
        sourceChapterId: `${slug}___${chSlug}`,
        chapterNumber,
        title: inner || `Chapter ${chapterNumber}`,
        scanlator: this.name,
      });
    }

    return chapters.sort((a, b) => b.chapterNumber - a.chapterNumber);
  }

  async getPageList(sourceChapterId: string): Promise<ChapterPage[]> {
    let mangaSlug = '';
    let chapterSlug = sourceChapterId;
    if (sourceChapterId.includes('___')) {
      const parts = sourceChapterId.split('___');
      mangaSlug = parts[0];
      chapterSlug = parts.slice(1).join('___');
    }

    const chapterUrl = `${this.baseUrl}/${this.mangaPath}/${mangaSlug}/${chapterSlug}/`;
    const html = await fetchText(chapterUrl, { referer: `${this.baseUrl}/${this.mangaPath}/${mangaSlug}/` });

    const readingMatch = html.match(
      /class=["'][^"']*reading-content[^"']*["'][\s\S]*?(?=<div[^>]+class=["'][^"']*(?:entry-header|comments|nav-links)|$)/i
    );
    const scanHtml = readingMatch?.[0] || html;

    const urls: string[] = [];
    const imgRegex = /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi;
    let im: RegExpExecArray | null;
    while ((im = imgRegex.exec(scanHtml)) !== null) {
      const src = im[1];
      if (
        src.includes('avatar') ||
        src.includes('logo') ||
        src.includes('emoji') ||
        src.endsWith('.svg') ||
        src.includes('kofi') ||
        src.includes('discord')
      ) {
        continue;
      }
      if (/(?:jpg|jpeg|png|webp|gif)/i.test(src)) {
        urls.push(absolutizeUrl(this.baseUrl, src));
      }
    }

    const unique = [...new Set(urls)];
    return unique.map((imageUrl, idx) => ({
      pageNumber: idx + 1,
      imageUrl,
      width: 800,
      height: 1200,
    }));
  }
}
