import { ExtensionRepoService } from '../services/extensionRepoService';
import { createExtensionProvider } from './createExtensionProvider';
import { detectExtensionEngine } from './engines/detectEngine';
import { LocalSourceProvider } from './local/localProvider';
import { SourceProvider } from './types';

class ProviderRegistry {
  private providers: Map<string, SourceProvider> = new Map();
  private extensionProviderKeys: Set<string> = new Set();

  constructor() {
    this.register(new LocalSourceProvider());
  }

  register(provider: SourceProvider) {
    this.providers.set(provider.id, provider);
  }

  invalidateExtensionProviders() {
    for (const key of this.extensionProviderKeys) {
      this.providers.delete(key);
    }
    this.extensionProviderKeys.clear();
  }

  unregister(providerId: string) {
    this.providers.delete(providerId);
    this.extensionProviderKeys.delete(providerId);
    for (const [key, p] of this.providers.entries()) {
      if (key.includes(providerId) || p.id.includes(providerId)) {
        this.providers.delete(key);
        this.extensionProviderKeys.delete(key);
      }
    }
  }

  get(providerId: string): SourceProvider | undefined {
    if (!providerId) return undefined;
    return this.providers.get(providerId);
  }

  async resolveProvider(providerId: string): Promise<SourceProvider> {
    const existing = this.get(providerId);
    if (existing) return existing;

    const installed = await this.getInstalledProviders();
    const found = installed.find(
      (p) =>
        p.id === providerId ||
        p.id.toLowerCase() === providerId.toLowerCase() ||
        p.id.includes(providerId) ||
        providerId.includes(p.id)
    );
    if (found) return found;

    return this.getDefault();
  }

  async getDefault(): Promise<SourceProvider> {
    const installed = await this.getInstalledProviders();
    if (installed.length > 0) {
      return installed[0];
    }
    const local = this.providers.get('local');
    if (local) return local;
    throw new Error('No sources installed. Please install an extension from the catalog.');
  }

  getAll(): SourceProvider[] {
    return Array.from(this.providers.values());
  }

  async getInstalledProviders(): Promise<SourceProvider[]> {
    const installedExts = await ExtensionRepoService.getInstalledExtensions();
    const engineConfigs = await ExtensionRepoService.getEngineConfigs();
    const activeList: SourceProvider[] = [];

    for (const ext of installedExts) {
      let provider = this.providers.get(ext.packageName);
      if (!provider) {
        let engineConfig = engineConfigs[ext.packageName];
        if (!engineConfig) {
          engineConfig = await detectExtensionEngine(ext);
          await ExtensionRepoService.saveEngineConfig(engineConfig);
        }
        provider = createExtensionProvider(ext, engineConfig);
        this.register(provider);
        this.extensionProviderKeys.add(provider.id);
        if (provider.id !== ext.packageName) {
          this.providers.set(ext.packageName, provider);
          this.extensionProviderKeys.add(ext.packageName);
        }
      }

      if (!activeList.some((x) => x.id === provider!.id || x.id === ext.packageName)) {
        activeList.push(provider);
      }
    }

    return activeList;
  }

  setEnabled(providerId: string, enabled: boolean) {
    const p = this.providers.get(providerId);
    if (p) {
      p.isEnabled = enabled;
    }
  }
}

export const providerRegistry = new ProviderRegistry();
