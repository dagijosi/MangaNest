import { ExtensionEngineKind } from './engineTypes';

/** Keiyoushi package → engine (your commonly used sources). */
export interface UserExtensionEntry {
  engine: ExtensionEngineKind;
  mangaPath?: string;
  mangaDirectory?: string;
  /** Optional fixed base URL when index homeUrl differs from scrape target */
  baseUrlOverride?: string;
  note?: string;
}

export const USER_EXTENSION_CATALOG: Record<string, UserExtensionEntry> = {
  'eu.kanade.tachiyomi.extension.all.mangadex': { engine: 'mangadex' },
  'eu.kanade.tachiyomi.extension.en.asurascans': { engine: 'asura', baseUrlOverride: 'https://asurascans.com' },
  'eu.kanade.tachiyomi.extension.en.thunderscans': {
    engine: 'mangathemesia',
    mangaDirectory: '/comics',
  },
  'eu.kanade.tachiyomi.extension.en.arvenscans': {
    engine: 'iken',
    note: 'Vortex Scans in Mihon',
  },
  'eu.kanade.tachiyomi.extension.all.mangafire': {
    engine: 'unsupported',
    note: 'Custom API — port MangaFire.kt next',
  },
  'eu.kanade.tachiyomi.extension.en.mangabat': {
    engine: 'unsupported',
    note: 'MangaBox multisrc — port MangaBox.kt next',
  },
  'eu.kanade.tachiyomi.extension.en.mangago': {
    engine: 'unsupported',
    note: 'Uses QuickJS in Mihon — hard to port',
  },
  'eu.kanade.tachiyomi.extension.en.mangademon': {
    engine: 'unsupported',
    note: 'Custom HTML — port MangaDemon.kt',
  },
  'eu.kanade.tachiyomi.extension.en.goda': {
    engine: 'unsupported',
    note: 'GoDa multisrc — port lib-multisrc/goda',
  },
  'eu.kanade.tachiyomi.extension.all.mangadna': {
    engine: 'unsupported',
    note: 'Custom — port MangaDNA.kt',
  },
  'eu.kanade.tachiyomi.extension.all.kagane': {
    engine: 'unsupported',
    note: 'Multi-mirror aggregator — port Kagane.kt',
  },
  'eu.kanade.tachiyomi.extension.en.mangabolt': {
    engine: 'madara',
    mangaPath: 'manga',
  },
  'eu.kanade.tachiyomi.extension.ja.mangaparkpublisher': {
    engine: 'unsupported',
    note: 'Manga-Park (JP publisher) — not mangapark.net',
  },
};

/** Partial package / name hints for fuzzy match during detection */
export const PACKAGE_ENGINE_HINTS: { match: RegExp; entry: UserExtensionEntry }[] = [
  { match: /thunderscans/i, entry: { engine: 'mangathemesia', mangaDirectory: '/comics' } },
  { match: /arvenscans|vortexscans/i, entry: { engine: 'iken' } },
  { match: /asurascans/i, entry: { engine: 'asura', baseUrlOverride: 'https://asurascans.com' } },
  { match: /mangadex/i, entry: { engine: 'mangadex' } },
  { match: /comick/i, entry: { engine: 'comick' } },
];
