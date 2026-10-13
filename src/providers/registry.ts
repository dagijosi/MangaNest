import { SourceProvider } from './types';
import { MockSourceProvider } from './mock/mockProvider';
import { LocalSourceProvider } from './local/localProvider';

class ProviderRegistry {
  private providers: Map<string, SourceProvider> = new Map();
  private defaultProviderId = 'mock';

  constructor() {
    this.register(new MockSourceProvider());
    this.register(new LocalSourceProvider());
  }

  register(provider: SourceProvider) {
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string) {
    this.providers.delete(providerId);
  }

  get(providerId: string): SourceProvider | undefined {
    return this.providers.get(providerId);
  }

  getDefault(): SourceProvider {
    const provider = this.providers.get(this.defaultProviderId);
    if (!provider) {
      const first = Array.from(this.providers.values())[0];
      if (!first) throw new Error('No providers registered');
      return first;
    }
    return provider;
  }

  getAll(): SourceProvider[] {
    return Array.from(this.providers.values());
  }

  setEnabled(providerId: string, enabled: boolean) {
    const p = this.providers.get(providerId);
    if (p) {
      p.isEnabled = enabled;
    }
  }
}

export const providerRegistry = new ProviderRegistry();
