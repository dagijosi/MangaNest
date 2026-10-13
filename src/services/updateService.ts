import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

export interface AppReleaseInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  apkDownloadUrl?: string;
  publishedAt?: string;
}

export const UpdateService = {
  getCurrentVersion(): string {
    return Constants.expoConfig?.version || '1.0.0';
  },

  async checkForUpdates(repoSlug: string = 'your-username/MangaNest'): Promise<AppReleaseInfo> {
    const currentVersion = this.getCurrentVersion();

    try {
      const response = await fetch(`https://api.github.com/repos/${repoSlug}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'MangaNest-App',
        },
      });

      if (!response.ok) {
        // If repo doesn't exist yet or rate limited, return current state
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseNotes: 'You are using the latest version of MangaNest.',
        };
      }

      const release = await response.json();
      const tagName: string = release.tag_name || '';
      const cleanLatest = tagName.replace(/^v/i, '').trim();

      // Find APK asset in release assets
      const apkAsset = release.assets?.find((a: any) =>
        a.name?.toLowerCase().endsWith('.apk')
      );

      const hasUpdate = this.compareVersions(cleanLatest, currentVersion) > 0;

      return {
        hasUpdate,
        currentVersion,
        latestVersion: cleanLatest,
        releaseNotes: release.body || 'No release notes provided.',
        apkDownloadUrl: apkAsset ? apkAsset.browser_download_url : undefined,
        publishedAt: release.published_at,
      };
    } catch {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseNotes: 'Could not reach GitHub Releases server.',
      };
    }
  },

  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
    const maxLen = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLen; i++) {
      const n1 = parts1[i] || 0;
      const n2 = parts2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  },

  async downloadAndInstallApk(
    apkUrl: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<void> {
    if (Platform.OS !== 'android') {
      await Linking.openURL(apkUrl);
      return;
    }

    const destination = `${FileSystem.cacheDirectory}MangaNest-latest.apk`;

    // Download APK
    const downloadResumable = FileSystem.createDownloadResumable(
      apkUrl,
      destination,
      {},
      (downloadProgress) => {
        const percent = Math.round(
          (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
        );
        onProgress?.(percent);
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      throw new Error('Failed to download update APK');
    }

    // Launch Android Package Installer
    try {
      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
    } catch {
      // Fallback: Open URL in browser
      await Linking.openURL(apkUrl);
    }
  },
};
