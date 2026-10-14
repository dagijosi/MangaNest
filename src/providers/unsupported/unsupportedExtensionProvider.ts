import { ExtensionItem } from '../../services/extensionRepoService';
import { ChapterItem, ChapterPage, MangaItem, SourceProvider } from '../types';

export class UnsupportedExtensionProvider implements SourceProvider {
  id: string;
  name: string;
  version: string;
  icon?: string;
  language: string;
  isEnabled = true;
  readonly supported = false as const;
  readonly unsupportedReason: string;

  capabilities = {
    supportsSearch: false,
    supportsFilters: false,
    supportsLatest: false,
    supportsPopular: false,
  };

  constructor(ext: ExtensionItem, reason: string) {
    this.id = ext.packageName;
    this.name = ext.name;
    this.version = ext.versionName;
    this.icon = ext.iconUrl;
    this.language = ext.lang;
    this.unsupportedReason = reason;
  }

  async search(): Promise<MangaItem[]> {
    return [];
  }

  async getPopular(): Promise<MangaItem[]> {
    return [];
  }

  async getLatestUpdates(): Promise<MangaItem[]> {
    return [];
  }

  async getMangaDetails(sourceId: string): Promise<MangaItem> {
    throw new Error(this.unsupportedReason);
  }

  async getChapters(): Promise<ChapterItem[]> {
    return [];
  }

  async getPageList(): Promise<ChapterPage[]> {
    throw new Error(this.unsupportedReason);
  }
}
