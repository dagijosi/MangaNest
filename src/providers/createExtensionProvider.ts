import { ExtensionItem } from '../services/extensionRepoService';
import { ExtensionEngineConfig } from './engines/engineTypes';
import { AsuraScansProvider } from './custom/asuraScansProvider';
import { ComicKProvider } from './comick/comickProvider';
import { IkenProvider } from './iken/ikenProvider';
import { MadaraProvider } from './madara/madaraProvider';
import { MangaDexProvider } from './mangadex/mangadexProvider';
import { MangaThemesiaProvider } from './mangathemesia/mangaThemesiaProvider';
import { SourceProvider } from './types';
import { UnsupportedExtensionProvider } from './unsupported/unsupportedExtensionProvider';

export function createExtensionProvider(
  ext: ExtensionItem,
  engineConfig: ExtensionEngineConfig
): SourceProvider {
  switch (engineConfig.engine) {
    case 'mangadex':
      return new MangaDexProvider();
    case 'comick':
      return new ComicKProvider();
    case 'asura':
      return new AsuraScansProvider(ext);
    case 'madara':
      return new MadaraProvider(ext, engineConfig.mangaPath || 'manga');
    case 'mangathemesia':
      return new MangaThemesiaProvider(ext, engineConfig.mangaDirectory || '/manga');
    case 'iken':
      return new IkenProvider(ext);
    case 'unsupported':
    default:
      return new UnsupportedExtensionProvider(
        ext,
        engineConfig.unsupportedReason ||
          'This extension is not supported yet in MangaNest. Use MangaDex, ComicK, Madara-based sources, or Asura Scans.'
      );
  }
}

export function isProviderSupported(provider: SourceProvider): boolean {
  return (provider as SourceProvider & { supported?: boolean }).supported !== false;
}
