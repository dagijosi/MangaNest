import * as FileSystem from 'expo-file-system/legacy';
import { detectExtensionEngine } from '../providers/engines/detectEngine';
import { ExtensionEngineConfig } from '../providers/engines/engineTypes';
import { providerRegistry } from '../providers/registry';
import { ExtensionItem, ExtensionRepoService } from './extensionRepoService';

const EXTENSIONS_DIR = `${FileSystem.documentDirectory}extensions/`;

export type InstallProgress = {
  phase: 'download' | 'detect' | 'register';
  percent: number;
  message: string;
};

export const ExtensionInstallService = {
  async ensureExtensionDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(EXTENSIONS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(EXTENSIONS_DIR, { intermediates: true });
    }
  },

  async downloadExtensionApk(
    item: ExtensionItem,
    onProgress?: (percent: number) => void
  ): Promise<string | undefined> {
    if (!item.apkUrl) return undefined;

    await this.ensureExtensionDir();
    const safeName = item.packageName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destination = `${EXTENSIONS_DIR}${safeName}_${item.versionName}.apk`;

    const existing = await FileSystem.getInfoAsync(destination);
    if (existing.exists) {
      onProgress?.(100);
      return destination;
    }

    const downloadResumable = FileSystem.createDownloadResumable(item.apkUrl, destination, {}, (progress) => {
      if (progress.totalBytesExpectedToWrite > 0) {
        const percent = Math.round(
          (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        );
        onProgress?.(percent);
      }
    });

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      throw new Error(`Failed to download extension APK for ${item.name}`);
    }
    onProgress?.(100);
    return result.uri;
  },

  async install(item: ExtensionItem, onProgress?: (p: InstallProgress) => void): Promise<ExtensionEngineConfig> {
    onProgress?.({ phase: 'download', percent: 0, message: 'Downloading extension…' });

    let apkLocalPath: string | undefined;
    try {
      apkLocalPath = await this.downloadExtensionApk(item, (percent) => {
        onProgress?.({ phase: 'download', percent, message: 'Downloading extension APK…' });
      });
    } catch (err) {
      console.warn('APK download failed, continuing with engine detection:', err);
      onProgress?.({
        phase: 'download',
        percent: 100,
        message: 'APK skipped — registering source engine…',
      });
    }

    onProgress?.({ phase: 'detect', percent: 10, message: 'Detecting source engine…' });
    const engineConfig = await detectExtensionEngine(item);
    if (apkLocalPath) {
      engineConfig.apkLocalPath = apkLocalPath;
    }

    onProgress?.({ phase: 'register', percent: 80, message: 'Saving extension…' });
    await ExtensionRepoService.saveEngineConfig(engineConfig);
    await ExtensionRepoService.installExtension(item.packageName, item.versionName);

    providerRegistry.invalidateExtensionProviders();

    onProgress?.({ phase: 'register', percent: 100, message: 'Installed' });
    return engineConfig;
  },

  async update(item: ExtensionItem, onProgress?: (p: InstallProgress) => void): Promise<void> {
    await this.install(
      { ...item, versionName: item.latestVersionName || item.versionName },
      onProgress
    );
    await ExtensionRepoService.updateExtension(
      item.packageName,
      item.latestVersionName || item.versionName
    );
  },
};
