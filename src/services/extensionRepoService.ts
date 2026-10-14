import { getDatabase } from '../db/database';
import { ExtensionEngineConfig } from '../providers/engines/engineTypes';

export interface ExtensionSource {
  id: string;
  name: string;
  language: string;
  homeUrl: string;
}

export interface ExtensionItem {
  name: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  lang: string;
  iconUrl?: string;
  apkUrl?: string;
  sources: ExtensionSource[];
  isInstalled: boolean;
  isEnabled: boolean;
  installedVersionName?: string;
  hasUpdate?: boolean;
  latestVersionName?: string;
}

const REPO_INDEX_URL = 'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.json';
const INSTALLED_EXTENSIONS_KEY = 'installed_extensions';
const ENABLED_EXTENSIONS_KEY = 'enabled_extensions';
const INSTALLED_VERSIONS_KEY = 'installed_extension_versions';
const EXTENSION_ENGINES_KEY = 'installed_extension_engines';

let cachedExtensions: ExtensionItem[] | null = null;

export const ExtensionRepoService = {
  /**
   * Loads installed extension package names from SQLite preferences
   */
  async getInstalledPackages(): Promise<Set<string>> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_preferences WHERE key = ?',
        INSTALLED_EXTENSIONS_KEY
      );
      if (row && row.value) {
        const parsed: string[] = JSON.parse(row.value);
        // Clear legacy default if the user never explicitly chose it
        const isLegacyDefault =
          (parsed.length === 2 &&
            parsed.includes('eu.kanade.tachiyomi.extension.all.mangadex') &&
            parsed.includes('eu.kanade.tachiyomi.extension.all.local')) ||
          (parsed.length === 1 && parsed[0] === 'eu.kanade.tachiyomi.extension.all.mangadex');
        if (isLegacyDefault) {
          return new Set<string>();
        }
        return new Set(parsed);
      }
    } catch (e) {
      console.warn('Failed to get installed packages:', e);
    }
    // Default installed packages: initially empty (Mihon model - user installs sources from catalog)
    return new Set<string>();
  },

  /**
   * Saves installed extension package names
   */
  async saveInstalledPackages(packages: Set<string>): Promise<void> {
    try {
      const db = await getDatabase();
      const json = JSON.stringify(Array.from(packages));
      await db.runAsync(
        'INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        INSTALLED_EXTENSIONS_KEY,
        json
      );
    } catch (e) {
      console.warn('Failed to save installed packages:', e);
    }
  },

  /**
   * Loads enabled extension package names
   */
  async getEnabledPackages(): Promise<Set<string>> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_preferences WHERE key = ?',
        ENABLED_EXTENSIONS_KEY
      );
      if (row && row.value) {
        const parsed: string[] = JSON.parse(row.value);
        const isLegacyDefault =
          parsed.length === 1 && parsed[0] === 'eu.kanade.tachiyomi.extension.all.mangadex';
        if (isLegacyDefault) {
          return new Set<string>();
        }
        return new Set(parsed);
      }
    } catch (e) {
      console.warn('Failed to get enabled packages:', e);
    }
    return new Set<string>();
  },

  /**
   * Saves enabled extension package names
   */
  async saveEnabledPackages(packages: Set<string>): Promise<void> {
    try {
      const db = await getDatabase();
      const json = JSON.stringify(Array.from(packages));
      await db.runAsync(
        'INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ENABLED_EXTENSIONS_KEY,
        json
      );
    } catch (e) {
      console.warn('Failed to save enabled packages:', e);
    }
  },

  /**
   * Loads installed extension version map from SQLite
   */
  async getInstalledVersions(): Promise<Record<string, string>> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_preferences WHERE key = ?',
        INSTALLED_VERSIONS_KEY
      );
      if (row && row.value) {
        return JSON.parse(row.value);
      }
    } catch (e) {
      console.warn('Failed to get installed versions:', e);
    }
    return {};
  },

  /**
   * Saves installed extension version map
   */
  async getEngineConfigs(): Promise<Record<string, ExtensionEngineConfig>> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_preferences WHERE key = ?',
        EXTENSION_ENGINES_KEY
      );
      if (row?.value) {
        return JSON.parse(row.value) as Record<string, ExtensionEngineConfig>;
      }
    } catch (e) {
      console.warn('Failed to get extension engine configs:', e);
    }
    return {};
  },

  async getEngineConfig(packageName: string): Promise<ExtensionEngineConfig | undefined> {
    const all = await this.getEngineConfigs();
    return all[packageName];
  },

  async saveEngineConfig(config: ExtensionEngineConfig): Promise<void> {
    try {
      const all = await this.getEngineConfigs();
      all[config.packageName] = config;
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        EXTENSION_ENGINES_KEY,
        JSON.stringify(all)
      );
    } catch (e) {
      console.warn('Failed to save extension engine config:', e);
    }
  },

  async removeEngineConfig(packageName: string): Promise<void> {
    try {
      const all = await this.getEngineConfigs();
      delete all[packageName];
      const db = await getDatabase();
      await db.runAsync(
        'INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        EXTENSION_ENGINES_KEY,
        JSON.stringify(all)
      );
    } catch (e) {
      console.warn('Failed to remove extension engine config:', e);
    }
  },

  async saveInstalledVersions(versions: Record<string, string>): Promise<void> {
    try {
      const db = await getDatabase();
      const json = JSON.stringify(versions);
      await db.runAsync(
        'INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        INSTALLED_VERSIONS_KEY,
        json
      );
    } catch (e) {
      console.warn('Failed to save installed versions:', e);
    }
  },

  /**
   * Returns full ExtensionItem objects for all installed & enabled packages
   */
  async getInstalledExtensions(): Promise<ExtensionItem[]> {
    const [installed, enabled] = await Promise.all([
      this.getInstalledPackages(),
      this.getEnabledPackages(),
    ]);

    const catalog = await this.fetchCatalog();
    return catalog.filter((e) => installed.has(e.packageName) && enabled.has(e.packageName));
  },

  /**
   * Fetches extensions from the Keiyoushi repo
   */
  async fetchCatalog(refresh = false): Promise<ExtensionItem[]> {
    if (cachedExtensions && !refresh) {
      return cachedExtensions;
    }

    const [installed, enabled, versions] = await Promise.all([
      this.getInstalledPackages(),
      this.getEnabledPackages(),
      this.getInstalledVersions(),
    ]);

    try {
      const res = await fetch(REPO_INDEX_URL);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      const rawList = json?.extensionList?.extensions || [];

      const mapped: ExtensionItem[] = rawList.map((ext: any) => {
        // Extract language from package name (e.g. eu.kanade.tachiyomi.extension.en.asurascans -> en)
        const parts = (ext.packageName || '').split('.');
        let lang = 'all';
        if (parts.length >= 5) {
          lang = parts[4]; // 'en', 'all', 'es', etc.
        }

        const isInst = installed.has(ext.packageName);
        const isEn = enabled.has(ext.packageName);
        const repoVer = ext.versionName || '1.0.0';
        const installedVer = versions[ext.packageName] || repoVer;
        const hasUpdate = Boolean(isInst && versions[ext.packageName] && versions[ext.packageName] !== repoVer);

        return {
          name: ext.name,
          packageName: ext.packageName,
          versionName: repoVer,
          versionCode: String(ext.versionCode || '1'),
          lang,
          iconUrl: ext.resources?.iconUrl,
          apkUrl: ext.resources?.apkUrl,
          sources: (ext.sources || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            language: s.language,
            homeUrl: s.homeUrl,
          })),
          isInstalled: isInst,
          isEnabled: isEn,
          installedVersionName: installedVer,
          hasUpdate,
          latestVersionName: repoVer,
        };
      });

      cachedExtensions = mapped;
      return mapped;
    } catch (err) {
      console.warn('Failed to fetch Keiyoushi extensions repo:', err);
      // Fallback popular extensions list if network is offline
      return this.getFallbackExtensions(installed, enabled);
    }
  },

  /**
   * Installs an extension chosen by the user
   */
  async installExtension(packageName: string, versionName?: string): Promise<boolean> {
    const installed = await this.getInstalledPackages();
    installed.add(packageName);
    await this.saveInstalledPackages(installed);

    const enabled = await this.getEnabledPackages();
    enabled.add(packageName);
    await this.saveEnabledPackages(enabled);

    const versions = await this.getInstalledVersions();
    const ver = versionName || '1.0.0';
    versions[packageName] = ver;
    await this.saveInstalledVersions(versions);

    if (cachedExtensions) {
      cachedExtensions = cachedExtensions.map((e) =>
        e.packageName === packageName
          ? {
              ...e,
              isInstalled: true,
              isEnabled: true,
              installedVersionName: ver,
              hasUpdate: false,
            }
          : e
      );
    }
    return true;
  },

  /**
   * Updates an installed extension to the latest version
   */
  async updateExtension(packageName: string, newVersion: string): Promise<boolean> {
    const versions = await this.getInstalledVersions();
    versions[packageName] = newVersion;
    await this.saveInstalledVersions(versions);

    if (cachedExtensions) {
      cachedExtensions = cachedExtensions.map((e) =>
        e.packageName === packageName
          ? {
              ...e,
              installedVersionName: newVersion,
              versionName: newVersion,
              hasUpdate: false,
            }
          : e
      );
    }
    return true;
  },

  /**
   * Uninstalls an extension
   */
  async uninstallExtension(packageName: string): Promise<boolean> {
    const installed = await this.getInstalledPackages();
    installed.delete(packageName);
    await this.saveInstalledPackages(installed);

    const enabled = await this.getEnabledPackages();
    enabled.delete(packageName);
    await this.saveEnabledPackages(enabled);

    await this.removeEngineConfig(packageName);

    if (cachedExtensions) {
      cachedExtensions = cachedExtensions.map((e) =>
        e.packageName === packageName
          ? { ...e, isInstalled: false, isEnabled: false }
          : e
      );
    }
    return false;
  },

  /**
   * Installs or uninstalls an extension
   */
  async toggleInstall(packageName: string): Promise<boolean> {
    const installed = await this.getInstalledPackages();
    let isNowInstalled = false;
    if (installed.has(packageName)) {
      installed.delete(packageName);
      isNowInstalled = false;
    } else {
      installed.add(packageName);
      isNowInstalled = true;
    }
    await this.saveInstalledPackages(installed);

    // If installed, also enable by default
    if (isNowInstalled) {
      const enabled = await this.getEnabledPackages();
      enabled.add(packageName);
      await this.saveEnabledPackages(enabled);
    }

    if (cachedExtensions) {
      cachedExtensions = cachedExtensions.map((e) =>
        e.packageName === packageName
          ? { ...e, isInstalled: isNowInstalled, isEnabled: isNowInstalled }
          : e
      );
    }
    return isNowInstalled;
  },

  /**
   * Enables or disables an extension
   */
  async toggleEnable(packageName: string): Promise<boolean> {
    const enabled = await this.getEnabledPackages();
    let isNowEnabled = false;
    if (enabled.has(packageName)) {
      enabled.delete(packageName);
      isNowEnabled = false;
    } else {
      enabled.add(packageName);
      isNowEnabled = true;
    }
    await this.saveEnabledPackages(enabled);

    if (cachedExtensions) {
      cachedExtensions = cachedExtensions.map((e) =>
        e.packageName === packageName ? { ...e, isEnabled: isNowEnabled } : e
      );
    }
    return isNowEnabled;
  },

  getFallbackExtensions(installed: Set<string>, enabled: Set<string>): ExtensionItem[] {
    const fallbacks = [
      {
        name: 'MangaDex',
        packageName: 'eu.kanade.tachiyomi.extension.all.mangadex',
        versionName: '1.4.228',
        versionCode: '104228',
        lang: 'all',
        iconUrl: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/mangadex/res/mipmap-xhdpi/ic_launcher.png',
        sources: [{ id: '2499283573021220255', name: 'MangaDex', language: 'en', homeUrl: 'https://mangadex.org' }],
      },
      {
        name: 'Asura Scans',
        packageName: 'eu.kanade.tachiyomi.extension.en.asurascans',
        versionName: '1.4.45',
        versionCode: '104045',
        lang: 'en',
        iconUrl: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/asurascans/res/mipmap-xhdpi/ic_launcher.png',
        sources: [{ id: '601340156846152932', name: 'Asura Scans', language: 'en', homeUrl: 'https://asuracomic.net' }],
      },
      {
        name: 'Flame Comics',
        packageName: 'eu.kanade.tachiyomi.extension.en.flamecomics',
        versionName: '1.4.12',
        versionCode: '104012',
        lang: 'en',
        iconUrl: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/flamecomics/res/mipmap-xhdpi/ic_launcher.png',
        sources: [{ id: '479001923184918239', name: 'Flame Comics', language: 'en', homeUrl: 'https://flamecomics.me' }],
      },
      {
        name: 'ComicK',
        packageName: 'eu.kanade.tachiyomi.extension.all.comick',
        versionName: '1.4.30',
        versionCode: '104030',
        lang: 'all',
        iconUrl: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/all/comick/res/mipmap-xhdpi/ic_launcher.png',
        sources: [{ id: '184918294819481928', name: 'ComicK', language: 'en', homeUrl: 'https://comick.io' }],
      },
      {
        name: 'Webtoons.com',
        packageName: 'eu.kanade.tachiyomi.extension.en.webtoons',
        versionName: '1.4.18',
        versionCode: '104018',
        lang: 'en',
        iconUrl: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/webtoons/res/mipmap-xhdpi/ic_launcher.png',
        sources: [{ id: '891824719284719284', name: 'Webtoon', language: 'en', homeUrl: 'https://webtoons.com' }],
      },
      {
        name: 'MangaSee',
        packageName: 'eu.kanade.tachiyomi.extension.en.mangasee',
        versionName: '1.4.24',
        versionCode: '104024',
        lang: 'en',
        iconUrl: 'https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main/src/en/mangasee/res/mipmap-xhdpi/ic_launcher.png',
        sources: [{ id: '91827491824719284', name: 'MangaSee', language: 'en', homeUrl: 'https://mangasee123.com' }],
      },
    ];

    return fallbacks.map((f) => ({
      ...f,
      isInstalled: installed.has(f.packageName),
      isEnabled: enabled.has(f.packageName),
    }));
  },
};
