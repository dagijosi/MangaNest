import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Check,
  Download,
  Globe,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { ExtensionInstallService } from '../../services/extensionInstallService';
import { ExtensionItem, ExtensionRepoService } from '../../services/extensionRepoService';
import { providerRegistry } from '../../providers/registry';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

type SourceTab = 'installed' | 'catalog';

export default function SourcesScreen() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<SourceTab>('installed');
  const [extensions, setExtensions] = useState<ExtensionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [installMessage, setInstallMessage] = useState<string | null>(null);

  const loadCatalog = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const list = await ExtensionRepoService.fetchCatalog(refresh);
      setExtensions(list);
    } catch (err) {
      console.warn('Failed to load extensions catalog:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  const [downloadingPkg, setDownloadingPkg] = useState<string | null>(null);
  const [updatingPkg, setUpdatingPkg] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);

  const handleInstall = async (item: ExtensionItem) => {
    if (downloadingPkg) return;
    setDownloadingPkg(item.packageName);
    setInstallMessage(null);
    try {
      const engineConfig = await ExtensionInstallService.install(item, (p) => {
        setInstallMessage(p.message);
      });
      if (engineConfig.engine === 'unsupported') {
        setInstallMessage(
          engineConfig.unsupportedReason ||
            'Extension saved, but this site engine is not supported yet in MangaNest.'
        );
      }
      setExtensions((prev) =>
        prev.map((e) =>
          e.packageName === item.packageName
            ? { ...e, isInstalled: true, isEnabled: true, installedVersionName: e.versionName }
            : e
        )
      );
    } catch (err) {
      console.warn('Install failed:', err);
      setInstallMessage(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setDownloadingPkg(null);
    }
  };

  const handleUpdate = async (item: ExtensionItem) => {
    if (updatingPkg) return;
    setUpdatingPkg(item.packageName);
    try {
      const targetVer = item.latestVersionName || item.versionName;
      await ExtensionInstallService.update(
        { ...item, versionName: targetVer },
        (p) => setInstallMessage(p.message)
      );
      providerRegistry.invalidateExtensionProviders();
      setExtensions((prev) =>
        prev.map((e) =>
          e.packageName === item.packageName
            ? {
                ...e,
                hasUpdate: false,
                installedVersionName: targetVer,
                versionName: targetVer,
              }
            : e
        )
      );
    } finally {
      setUpdatingPkg(null);
    }
  };

  const handleUpdateAll = async () => {
    const updatable = extensions.filter((e) => e.isInstalled && e.hasUpdate);
    if (updatable.length === 0 || updatingAll) return;
    setUpdatingAll(true);
    try {
      for (const item of updatable) {
        await ExtensionRepoService.updateExtension(
          item.packageName,
          item.latestVersionName || item.versionName
        );
      }
      setExtensions((prev) =>
        prev.map((e) =>
          e.hasUpdate
            ? {
                ...e,
                hasUpdate: false,
                installedVersionName: e.latestVersionName || e.versionName,
                versionName: e.latestVersionName || e.versionName,
              }
            : e
        )
      );
    } finally {
      setUpdatingAll(false);
    }
  };

  const handleUninstall = async (item: ExtensionItem) => {
    providerRegistry.invalidateExtensionProviders();
    await ExtensionRepoService.uninstallExtension(item.packageName);
    setExtensions((prev) =>
      prev.map((e) =>
        e.packageName === item.packageName
          ? { ...e, isInstalled: false, isEnabled: false, hasUpdate: false }
          : e
      )
    );
  };

  const handleToggleEnable = async (item: ExtensionItem) => {
    const isNowEnabled = await ExtensionRepoService.toggleEnable(item.packageName);
    setExtensions((prev) =>
      prev.map((e) =>
        e.packageName === item.packageName ? { ...e, isEnabled: isNowEnabled } : e
      )
    );
  };

  const installedExtensions = extensions.filter((e) => e.isInstalled);
  const updatableExtensions = installedExtensions.filter((e) => e.hasUpdate);

  const catalogFiltered = extensions.filter((e) => {
    if (selectedLang !== 'all') {
      const langOk = e.lang === selectedLang || (selectedLang === 'en' && e.lang === 'all');
      if (!langOk) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.name.toLowerCase().includes(q) ||
      e.packageName.toLowerCase().includes(q) ||
      e.sources.some((s) => s.name.toLowerCase().includes(q) || s.homeUrl.toLowerCase().includes(q))
    );
  });

  const languagePills = [
    { label: 'All', value: 'all' },
    { label: 'English', value: 'en' },
    { label: 'Multi/All', value: 'all' },
    { label: 'Korean', value: 'ko' },
    { label: 'Japanese', value: 'ja' },
    { label: 'Spanish', value: 'es' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header
        title="Sources & Extensions"
        subtitle={
          activeTab === 'installed'
            ? `${installedExtensions.length} active providers`
            : `Keiyoushi Repository (${extensions.length} extensions)`
        }
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => loadCatalog(true)}
            style={[styles.refreshButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <RefreshCw size={18} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
        }
      />

      {installMessage ? (
        <View style={[styles.installBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.installBannerText, { color: colors.textSecondary }]}>{installMessage}</Text>
        </View>
      ) : null}

      {/* Mode Switcher Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'installed' && { backgroundColor: colors.surfaceElevated },
          ]}
          onPress={() => setActiveTab('installed')}
        >
          <Layers size={16} color={activeTab === 'installed' ? colors.accent : colors.textSecondary} />
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'installed' ? colors.accent : colors.textSecondary },
            ]}
          >
            Installed ({installedExtensions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'catalog' && { backgroundColor: colors.surfaceElevated },
          ]}
          onPress={() => setActiveTab('catalog')}
        >
          <Sparkles size={16} color={activeTab === 'catalog' ? colors.accent : colors.textSecondary} />
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'catalog' ? colors.accent : colors.textSecondary },
            ]}
          >
            Repository Catalog
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'catalog' && (
        <View style={styles.catalogFilterArea}>
          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search Asura, Flame, ComicK, Webtoons..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Language Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={languagePills}
            keyExtractor={(item) => item.value + item.label}
            contentContainerStyle={styles.langPillsContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.langPill,
                  {
                    backgroundColor: selectedLang === item.value ? colors.accent : colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
                onPress={() => setSelectedLang(item.value)}
              >
                <Text
                  style={[
                    styles.langPillText,
                    { color: selectedLang === item.value ? '#121318' : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {loading && extensions.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading Keiyoushi Extension Repository...
          </Text>
        </View>
      ) : activeTab === 'installed' ? (
        // Installed Extensions List
        <FlatList
          data={installedExtensions}
          keyExtractor={(item) => item.packageName}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            updatableExtensions.length > 0 ? (
              <View style={[styles.updatesBanner, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
                <View style={styles.updatesBannerTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color={colors.accent} />
                    <Text style={[styles.updatesBannerTitle, { color: colors.textPrimary }]}>
                      {updatableExtensions.length} Update{updatableExtensions.length > 1 ? 's' : ''} Available
                    </Text>
                  </View>
                  <Text style={[styles.updatesBannerSub, { color: colors.textSecondary }]}>
                    New fixes & scrapers available in repository
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.updateAllBtn, { backgroundColor: colors.accent }]}
                  onPress={handleUpdateAll}
                  disabled={updatingAll}
                >
                  {updatingAll ? (
                    <ActivityIndicator size="small" color="#121318" />
                  ) : (
                    <Text style={styles.updateAllBtnText}>Update All</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Extensions Installed</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Switch to the &ldquo;Repository Catalog&rdquo; tab to choose and install extensions.
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.accent }]}
                onPress={() => setActiveTab('catalog')}
              >
                <Text style={styles.emptyActionBtnText}>Browse Extension Catalog</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.extensionCard, { backgroundColor: colors.surface, borderColor: item.hasUpdate ? colors.accent : colors.surfaceBorder }]}>
              {item.iconUrl ? (
                <Image source={{ uri: item.iconUrl }} style={styles.extIcon} contentFit="contain" />
              ) : (
                <View style={[styles.extIconFallback, { backgroundColor: colors.surfaceElevated }]}>
                  <Globe size={22} color={colors.accent} />
                </View>
              )}

              <View style={styles.extInfo}>
                <View style={styles.extTopRow}>
                  <Text style={[styles.extName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.langBadgeText, { color: colors.textSecondary }]}>
                      {item.lang.toUpperCase()}
                    </Text>
                  </View>
                  {item.hasUpdate && (
                    <View style={[styles.updateBadge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.updateBadgeText}>UPDATE</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.extVersion, { color: colors.textMuted }]}>
                  {item.hasUpdate
                    ? `v${item.installedVersionName || item.versionName} ➔ v${item.latestVersionName}`
                    : `v${item.versionName}`} • {item.sources[0]?.homeUrl || item.packageName}
                </Text>

                {item.hasUpdate && (
                  <TouchableOpacity
                    style={[styles.updateCardBtn, { backgroundColor: colors.accent }]}
                    onPress={() => handleUpdate(item)}
                    disabled={updatingPkg === item.packageName}
                  >
                    {updatingPkg === item.packageName ? (
                      <ActivityIndicator size="small" color="#121318" />
                    ) : (
                      <>
                        <RefreshCw size={12} color="#121318" />
                        <Text style={styles.updateCardBtnText}>Update to v{item.latestVersionName}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.extActions}>
                <Switch
                  value={item.isEnabled}
                  onValueChange={() => handleToggleEnable(item)}
                  trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
                  thumbColor={item.isEnabled ? '#FFFFFF' : '#888888'}
                />

                <TouchableOpacity
                  onPress={() => handleUninstall(item)}
                  style={styles.trashBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        // Catalog Extensions List
        <FlatList
          data={catalogFiltered}
          keyExtractor={(item) => item.packageName}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching extensions</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try adjusting your search query or language filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.extensionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              {item.iconUrl ? (
                <Image source={{ uri: item.iconUrl }} style={styles.extIcon} contentFit="contain" />
              ) : (
                <View style={[styles.extIconFallback, { backgroundColor: colors.surfaceElevated }]}>
                  <Globe size={22} color={colors.accent} />
                </View>
              )}

              <View style={styles.extInfo}>
                <View style={styles.extTopRow}>
                  <Text style={[styles.extName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.langBadgeText, { color: colors.textSecondary }]}>
                      {item.lang.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.extVersion, { color: colors.textMuted }]} numberOfLines={1}>
                  v{item.versionName} • {item.sources[0]?.homeUrl?.replace(/^https?:\/\//, '') || item.packageName}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.installButton,
                  item.isInstalled
                    ? { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }
                    : { backgroundColor: colors.accent },
                ]}
                onPress={() => (item.isInstalled ? handleUninstall(item) : handleInstall(item))}
                disabled={downloadingPkg === item.packageName}
                activeOpacity={0.8}
              >
                {downloadingPkg === item.packageName ? (
                  <>
                    <ActivityIndicator size="small" color="#121318" />
                    <Text style={styles.installBtnText}>Downloading...</Text>
                  </>
                ) : item.isInstalled ? (
                  <>
                    <Check size={14} color={colors.success} />
                    <Text style={[styles.installedBtnText, { color: colors.textPrimary }]}>Installed</Text>
                  </>
                ) : (
                  <>
                    <Download size={14} color="#121318" />
                    <Text style={styles.installBtnText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  installBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  installBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    padding: 3,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catalogFilterArea: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  langPillsContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
    gap: Spacing.sm,
  },
  extensionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  extIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
  },
  extIconFallback: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extInfo: {
    flex: 1,
  },
  extTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extName: {
    fontSize: 14,
    fontWeight: '700',
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  langBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  extVersion: {
    fontSize: 11,
    marginTop: 2,
  },
  extActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trashBtn: {
    padding: 6,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  installBtnText: {
    color: '#121318',
    fontSize: 12,
    fontWeight: '700',
  },
  installedBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  emptyActionBtnText: {
    color: '#121318',
    fontSize: 13,
    fontWeight: '700',
  },
  updatesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 8,
  },
  updatesBannerTextCol: {
    flex: 1,
    gap: 2,
  },
  updatesBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  updatesBannerSub: {
    fontSize: 11,
  },
  updateAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateAllBtnText: {
    color: '#121318',
    fontSize: 12,
    fontWeight: '800',
  },
  updateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  updateBadgeText: {
    color: '#121318',
    fontSize: 9,
    fontWeight: '900',
  },
  updateCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    marginTop: 4,
  },
  updateCardBtnText: {
    color: '#121318',
    fontSize: 10,
    fontWeight: '800',
  },
});
