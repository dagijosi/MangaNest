import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Flame,
  Globe,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import { FilterChips } from '../../components/common/FilterChips';
import { MangaCard } from '../../components/common/MangaCard';
import { isProviderSupported } from '../../providers/createExtensionProvider';
import { providerRegistry } from '../../providers/registry';
import { MangaItem, MangaType, SourceProvider } from '../../providers/types';
import { UnsupportedExtensionProvider } from '../../providers/unsupported/unsupportedExtensionProvider';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

type ModeTab = 'popular' | 'latest';
type FilterType = 'all' | MangaType;

export default function SourceCatalogScreen() {
  const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: string }>();
  const { colors } = useAppTheme();

  const [provider, setProvider] = useState<SourceProvider | null>(null);
  const [activeTab, setActiveTab] = useState<ModeTab>(
    initialTab === 'latest' ? 'latest' : 'popular'
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [items, setItems] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  // Initialize Provider
  useEffect(() => {
    let active = true;
    const initProvider = async () => {
      if (!id) return;
      const decodedId = decodeURIComponent(id);
      const resolved = await providerRegistry.resolveProvider(decodedId);
      if (active) {
        setProvider(resolved);
      }
    };
    initProvider();
    return () => {
      active = false;
    };
  }, [id]);

  // Load Catalog Data
  const loadData = useCallback(
    async (targetPage = 1, refresh = false) => {
      if (!provider || loadingRef.current) return;
      loadingRef.current = true;

      if (refresh) {
        setRefreshing(true);
        pageRef.current = 1;
      } else if (targetPage === 1) {
        setLoading(true);
        pageRef.current = 1;
      } else {
        setLoadingMore(true);
      }

      try {
        let results: MangaItem[] = [];
        const q = searchQuery.trim();

        if (q) {
          results = await provider.search(q);
          setHasMore(false);
        } else if (activeTab === 'popular') {
          results = await provider.getPopular(targetPage);
          setHasMore(results.length > 0);
        } else {
          results = await provider.getLatestUpdates(targetPage);
          setHasMore(results.length > 0);
        }

        if (targetPage === 1) {
          setItems(results);
          pageRef.current = 1;
          setPage(1);
        } else {
          // Avoid duplicate items when paginating
          setItems((prev) => {
            const existingIds = new Set(prev.map((x) => x.id));
            const newItems = results.filter((x) => !existingIds.has(x.id));
            return [...prev, ...newItems];
          });
          pageRef.current = targetPage;
          setPage(targetPage);
        }
      } catch (err) {
        console.warn('Failed to load source catalog:', err);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [provider, activeTab, searchQuery]
  );

  const handleEndReached = () => {
    if (!loadingRef.current && hasMore && !searchQuery.trim()) {
      const nextPage = pageRef.current + 1;
      loadData(nextPage);
    }
  };

  useEffect(() => {
    if (provider) {
      const timer = setTimeout(() => {
        loadData(1);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [provider, activeTab, loadData]);

  const handleSearchSubmit = () => {
    loadData(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
    setTimeout(() => {
      loadData(1);
    }, 50);
  };

  const filterOptions = [
    { label: 'All', value: 'all' as FilterType },
    { label: 'Manga', value: 'manga' as FilterType },
    { label: 'Manhwa', value: 'manhwa' as FilterType },
    { label: 'Manhua', value: 'manhua' as FilterType },
    { label: 'Webtoon', value: 'webtoon' as FilterType },
  ];

  const filteredItems = items.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false;
    return true;
  });

  const unsupported =
    provider && !isProviderSupported(provider)
      ? (provider as UnsupportedExtensionProvider).unsupportedReason
      : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {unsupported ? (
        <View style={[styles.unsupportedBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.unsupportedTitle, { color: colors.textPrimary }]}>Extension not runnable yet</Text>
          <Text style={[styles.unsupportedText, { color: colors.textSecondary }]}>{unsupported}</Text>
          <Text style={[styles.unsupportedHint, { color: colors.textMuted }]}>
            MangaNest downloads the Mihon APK for your library, then uses a built-in engine (MangaDex, ComicK, Madara, Asura). Custom Kotlin-only sources need a future engine port.
          </Text>
        </View>
      ) : null}

      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {provider?.icon ? (
            <Image source={{ uri: provider.icon }} style={styles.headerIcon} contentFit="cover" />
          ) : (
            <View style={[styles.headerIconPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
              <Globe size={18} color={colors.accent} />
            </View>
          )}

          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {provider?.name || 'Source Catalog'}
            </Text>
            <View style={styles.headerMetaRow}>
              <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.langBadgeText, { color: colors.accent }]}>
                  {provider?.language?.toUpperCase() || 'EN'}
                </Text>
              </View>
              {provider?.version && (
                <Text style={[styles.versionText, { color: colors.textMuted }]}>
                  v{provider.version}
                </Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsSearchOpen((prev) => !prev)}
          style={[styles.searchToggleBtn, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <Search size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* In-Source Search Input */}
      {isSearchOpen && (
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={`Search in ${provider?.name || 'source'}...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Mode Tabs: Popular | Latest */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'popular' && [styles.tabBtnActive, { borderBottomColor: colors.accent }],
          ]}
          onPress={() => {
            setActiveTab('popular');
            setSearchQuery('');
          }}
          activeOpacity={0.75}
        >
          <Flame
            size={16}
            color={activeTab === 'popular' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'popular' ? colors.accent : colors.textSecondary },
            ]}
          >
            Popular
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'latest' && [styles.tabBtnActive, { borderBottomColor: colors.accent }],
          ]}
          onPress={() => {
            setActiveTab('latest');
            setSearchQuery('');
          }}
          activeOpacity={0.75}
        >
          <Sparkles
            size={16}
            color={activeTab === 'latest' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'latest' ? colors.accent : colors.textSecondary },
            ]}
          >
            Latest Updates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter Chips */}
      <FilterChips
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={setActiveFilter}
      />

      {/* Catalog Grid View */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading {activeTab === 'popular' ? 'popular titles' : 'latest updates'} from {provider?.name}...
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyHeading, { color: colors.textPrimary }]}>No Titles Found</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {searchQuery
              ? `No titles matched "${searchQuery}" in ${provider?.name}.`
              : `No titles found under the "${activeFilter}" filter in ${provider?.name}.`}
          </Text>
          <TouchableOpacity
            style={[styles.emptyActionBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              setSearchQuery('');
              setActiveFilter('all');
              loadData(1, true);
            }}
          >
            <Text style={styles.emptyActionBtnText}>Reset Filters & Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(1, true)}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <MangaCard
              item={item}
              layout="grid"
              onPress={() =>
                router.push({
                  pathname: '/manga/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.loadingMoreText, { color: colors.textSecondary }]}>
                  Loading more titles...
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  unsupportedBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 6,
  },
  unsupportedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  unsupportedText: {
    fontSize: 13,
    lineHeight: 18,
  },
  unsupportedHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
  },
  headerIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  langBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  versionText: {
    fontSize: 11,
  },
  searchToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 6,
  },
  emptyActionBtnText: {
    color: '#121318',
    fontSize: 13,
    fontWeight: '800',
  },
  footerWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadingMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
