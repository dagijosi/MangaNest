import { ExtensionItem } from '../../services/extensionRepoService';
import { fetchText, normalizeBaseUrl } from '../http/fetchText';
import { ExtensionEngineConfig, ExtensionEngineKind } from './engineTypes';
import { PACKAGE_ENGINE_HINTS, USER_EXTENSION_CATALOG } from './userExtensionCatalog';

function configFromEntry(
  packageName: string,
  baseUrl: string,
  engine: ExtensionEngineKind,
  entry?: {
    mangaPath?: string;
    mangaDirectory?: string;
    baseUrlOverride?: string;
    note?: string;
  }
): ExtensionEngineConfig {
  const resolvedBase = normalizeBaseUrl(entry?.baseUrlOverride || baseUrl);
  if (engine === 'unsupported') {
    return {
      packageName,
      engine: 'unsupported',
      baseUrl: resolvedBase,
      detectedAt: Date.now(),
      unsupportedReason:
        entry?.note ||
        'This extension needs a custom reader engine in MangaNest. See userExtensionCatalog.ts to add a port.',
    };
  }
  return {
    packageName,
    engine,
    baseUrl: resolvedBase,
    mangaPath: entry?.mangaPath,
    mangaDirectory: entry?.mangaDirectory,
    detectedAt: Date.now(),
  };
}

export async function detectExtensionEngine(ext: ExtensionItem): Promise<ExtensionEngineConfig> {
  const packageName = ext.packageName;
  const baseUrl = normalizeBaseUrl(ext.sources[0]?.homeUrl || '');

  const catalog = USER_EXTENSION_CATALOG[packageName];
  if (catalog) {
    return configFromEntry(packageName, baseUrl, catalog.engine, catalog);
  }

  for (const hint of PACKAGE_ENGINE_HINTS) {
    if (hint.match.test(packageName) || hint.match.test(ext.name)) {
      return configFromEntry(packageName, baseUrl, hint.entry.engine, hint.entry);
    }
  }

  if (baseUrl && (await probeMangaThemesiaSite(baseUrl))) {
    return configFromEntry(packageName, baseUrl, 'mangathemesia', { mangaDirectory: '/manga' });
  }

  if (baseUrl && (await probeMadaraSite(baseUrl))) {
    return configFromEntry(packageName, baseUrl, 'madara', { mangaPath: 'manga' });
  }

  if (baseUrl && (await probeIkenSite(baseUrl))) {
    return configFromEntry(packageName, baseUrl, 'iken');
  }

  return configFromEntry(packageName, baseUrl, 'unsupported');
}

async function probeMadaraSite(baseUrl: string): Promise<boolean> {
  const candidates = [`${baseUrl}/manga/`, `${baseUrl}/`, baseUrl];
  for (const url of candidates) {
    try {
      const html = await fetchText(url, { timeoutMs: 8000, referer: baseUrl });
      if (
        /wp-manga|madara_load_more|page-item-detail|manga__item|c-tabs-item__content|post-type-wp-manga/i.test(
          html
        )
      ) {
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

async function probeMangaThemesiaSite(baseUrl: string): Promise<boolean> {
  for (const path of ['/comics', '/manga']) {
    try {
      const html = await fetchText(`${baseUrl}${path}`, { timeoutMs: 8000, referer: baseUrl });
      if (/listupd|\.bsx|utao|mangaThemesia|order=popular|div\.bxcl/i.test(html)) {
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

async function probeIkenSite(baseUrl: string): Promise<boolean> {
  const apiUrl = baseUrl.replace(/^https:\/\//i, 'https://api.');
  try {
    const json = await fetchText(`${apiUrl}/api/query?page=1&perPage=1&searchTerm=`, {
      timeoutMs: 8000,
      referer: baseUrl,
      headers: { Accept: 'application/json' },
    });
    return json.includes('"posts"') && json.includes('"totalCount"');
  } catch {
    return false;
  }
}
