import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronRight,
  Flame,
  Globe,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { MangaCard } from '../../components/common/MangaCard';
import { SearchBar } from '../../components/common/SearchBar';
import { providerRegistry } from '../../providers/registry';
import { MangaItem, SourceProvider } from '../../providers/types';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

export default function BrowseScreen() {
  const { colors } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [installedProviders, setInstalledProviders] = useState<SourceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchResults, setSearchResults] = useState<MangaItem[]>([]);
  const [searching, setSearching] = useState(false);

  const loadSources = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const providers = await providerRegistry.getInstalledProviders();
      setInstalledProviders(providers);
    } catch (err) {
      console.warn('Failed to load installed sources:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSources();
    }, [loadSources])
  );

  // Global search across installed extensions
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const providers = await providerRegistry.getInstalledProviders();
        if (providers.length === 0) {
          setSearchResults([]);
          setSearching(false);
          return;
        }

        const searchPromises = providers.map((p) => p.search(q).catch(() => []));
        const results = await Promise.all(searchPromises);
        setSearchResults(results.flat());
      } catch (err) {
        console.warn('Global search failed:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header Bar */}
      <Header
        title="Sources"
        subtitle={
          installedProviders.length > 0
            ? `${installedProviders.length} Installed Extension${installedProviders.length > 1 ? 's' : ''}`
            : 'No Extensions Installed'
        }
        rightAction={
          <TouchableOpacity
            style={[styles.manageExtBadge, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            onPress={() => router.push('/sources')}
            activeOpacity={0.7}
          >
            <Layers size={15} color={colors.accent} />
            <Text style={[styles.manageExtBadgeText, { color: colors.accent }]}>+ Extensions</Text>
          </TouchableOpacity>
        }
      />

      {/* Global Search across installed extensions */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={
          installedProviders.length > 0
            ? 'Search titles across installed sources...'
            : 'Install extensions to search...'
        }
      />

      {/* Main Content Area */}
      {searchQuery.trim().length > 0 ? (
        // Search Results
        <View style={styles.resultsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {searching
                ? 'Searching installed sources...'
                : `Search Results (${searchResults.length})`}
            </Text>
            {searching && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          {searching && searchResults.length === 0 ? (
            <View style={styles.centerSpinner}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.centerEmpty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No titles found matching &ldquo;{searchQuery}&rdquo; in your installed sources.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/sources')}
              >
                <Text style={styles.actionBtnText}>Browse Extension Repository</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.gridContent}
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
            />
          )}
        </View>
      ) : loading && installedProviders.length === 0 ? (
        <View style={styles.centerSpinner}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading installed sources...
          </Text>
        </View>
      ) : installedProviders.length === 0 ? (
        // Empty State: No Extensions Installed
        <View style={styles.noExtContainer}>
          <View style={[styles.noExtIconBox, { backgroundColor: colors.surfaceElevated }]}>
            <Layers size={36} color={colors.accent} />
          </View>
          <Text style={[styles.noExtTitle, { color: colors.textPrimary }]}>
            No Extensions Installed
          </Text>
          <Text style={[styles.noExtDesc, { color: colors.textSecondary }]}>
            Install extensions from the Keiyoushi repository to view and read manga from sources like Asura Scans, ComicK, MangaDex, and more.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/sources')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>Choose & Install Extensions</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // List of Installed Sources (Requirement: Click source to see full catalog, Popular, Latest)
        <FlatList
          data={installedProviders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.sourceListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadSources(true)}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item: source }) => (
            <TouchableOpacity
              style={[
                styles.sourceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/sources/[id]',
                  params: { id: source.id },
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.sourceCardMain}>
                {source.icon ? (
                  <Image source={{ uri: source.icon }} style={styles.sourceIcon} contentFit="cover" />
                ) : (
                  <View style={[styles.sourceIconPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
                    <Globe size={22} color={colors.accent} />
                  </View>
                )}

                <View style={styles.sourceInfo}>
                  <View style={styles.sourceTitleRow}>
                    <Text style={[styles.sourceName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {source.name}
                    </Text>
                    <View style={[styles.langPill, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.langText, { color: colors.accent }]}>
                        {source.language?.toUpperCase() || 'EN'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.sourceVersion, { color: colors.textMuted }]}>
                    {source.version ? `v${source.version}` : 'Latest extension'}
                  </Text>
                </View>

                <ChevronRight size={20} color={colors.textMuted} />
              </View>

              {/* Direct Filter Shortcuts on Source Card */}
              <View style={[styles.shortcutRow, { borderTopColor: colors.surfaceBorder }]}>
                <TouchableOpacity
                  style={[styles.shortcutBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() =>
                    router.push({
                      pathname: '/sources/[id]',
                      params: { id: source.id, initialTab: 'popular' },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Flame size={13} color={colors.accent} />
                  <Text style={[styles.shortcutBtnText, { color: colors.textPrimary }]}>
                    Popular
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shortcutBtn, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() =>
                    router.push({
                      pathname: '/sources/[id]',
                      params: { id: source.id, initialTab: 'latest' },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Sparkles size={13} color={colors.accent} />
                  <Text style={[styles.shortcutBtnText, { color: colors.textPrimary }]}>
                    Latest
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
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
  manageExtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  manageExtBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centerSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  actionBtnText: {
    color: '#121318',
    fontWeight: '800',
    fontSize: 13,
  },
  noExtContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  noExtIconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  noExtTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  noExtDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  sourceListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
    gap: 12,
  },
  sourceCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sourceCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  sourceIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '800',
  },
  langPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  langText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sourceVersion: {
    fontSize: 12,
    marginTop: 2,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.sm,
    gap: 6,
  },
  shortcutBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
