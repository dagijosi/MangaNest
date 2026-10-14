import { providerRegistry } from '../providers/registry';
import { ChapterItem, MangaItem } from '../providers/types';

export interface ResolvedMangaResult {
  item: MangaItem;
  chapters: ChapterItem[];
  providerId: string;
  sourceId: string;
}

export interface PresetUrl {
  title: string;
  url: string;
  coverHint?: string;
}

export const PRESET_TEST_URLS: PresetUrl[] = [
  {
    title: 'Solo Leveling',
    url: 'https://mangadex.org/title/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/solo-leveling',
  },
  {
    title: 'Berserk',
    url: 'https://mangadex.org/title/801513ba-a712-498b-8f57-f8609b833412/berserk',
  },
  {
    title: 'Chainsaw Man',
    url: 'https://mangadex.org/title/a77742b1-b345-42bc-aa23-96e67e372709/chainsaw-man',
  },
  {
    title: 'Frieren',
    url: 'https://mangadex.org/title/b0b721ff-c388-4486-aa0f-c8b0e921824b/sousou-no-frieren',
  },
  {
    title: 'One Piece',
    url: 'https://mangadex.org/title/a1c7c817-4e59-43b7-9365-09675a149a6f/one-piece',
  },
];

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const UrlResolver = {
  /**
   * Resolves a manga item and its available chapters from a URL or raw ID
   */
  async resolve(input: string): Promise<ResolvedMangaResult> {
    const raw = input.trim();
    if (!raw) {
      throw new Error('Please enter a manga URL or identifier');
    }

    // 1. MangaDex title URL: https://mangadex.org/title/{uuid}/...
    const titleMatch = raw.match(/mangadex\.org\/title\/([0-9a-fA-F-]{36})/i);
    if (titleMatch) {
      const sourceId = titleMatch[1];
      return this.fetchFromMangaDex(sourceId);
    }

    // 2. MangaDex chapter URL: https://mangadex.org/chapter/{uuid}
    const chapterMatch = raw.match(/mangadex\.org\/chapter\/([0-9a-fA-F-]{36})/i);
    if (chapterMatch) {
      const chapterId = chapterMatch[1];
      // Fetch chapter info to find the parent manga
      const res = await fetch(`https://api.mangadex.org/chapter/${chapterId}`);
      if (!res.ok) throw new Error(`Could not resolve chapter ${chapterId}`);
      const json = await res.json();
      const mangaRel = json.data?.relationships?.find((r: any) => r.type === 'manga');
      if (!mangaRel?.id) {
        throw new Error('Could not find manga associated with this chapter URL');
      }
      return this.fetchFromMangaDex(mangaRel.id);
    }

    // 3. Raw UUID matching
    const uuidMatch = raw.match(UUID_REGEX);
    if (uuidMatch) {
      return this.fetchFromMangaDex(uuidMatch[0]);
    }

    // 4. Fallback search on MangaDex if user typed a name or search query
    const provider = providerRegistry.get('mangadex');
    if (provider) {
      const results = await provider.search(raw);
      if (results.length > 0) {
        const item = results[0];
        const chapters = await provider.getChapters(item.sourceId);
        return {
          item: { ...item, totalChapters: chapters.length },
          chapters,
          providerId: 'mangadex',
          sourceId: item.sourceId,
        };
      }
    }

    throw new Error('Unsupported URL format. Please paste a valid MangaDex URL or title.');
  },

  async fetchFromMangaDex(sourceId: string): Promise<ResolvedMangaResult> {
    const provider = providerRegistry.get('mangadex');
    if (!provider) {
      throw new Error('MangaDex provider not initialized');
    }

    const item = await provider.getMangaDetails(sourceId);
    const chapters = await provider.getChapters(sourceId);

    const enrichedItem: MangaItem = {
      ...item,
      totalChapters: chapters.length,
    };

    return {
      item: enrichedItem,
      chapters,
      providerId: 'mangadex',
      sourceId,
    };
  },
};
