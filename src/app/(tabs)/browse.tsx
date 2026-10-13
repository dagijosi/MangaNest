import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Database, FolderArchive, Globe, Sparkles } from 'lucide-react-native';
import { FilterChips } from '../../components/common/FilterChips';
import { Header } from '../../components/common/Header';
import { MangaCard } from '../../components/common/MangaCard';
import { SearchBar } from '../../components/common/SearchBar';
import { MOCK_MANGA_LIST } from '../../providers/mock/mockData';
import { MangaType } from '../../providers/types';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

type FilterType = 'all' | MangaType;

interface SourcePreviewItem {
  id: string;
  name: string;
  subtitle: string;
  iconType: 'mangadex' | 'webtoon' | 'local' | 'anilist';
  enabled: boolean;
}

const FEATURED_SOURCES: SourcePreviewItem[] = [
  { id: 'mangadex', name: 'MangaDex', subtitle: '1000+ series', iconType: 'mangadex', enabled: true },
  { id: 'webtoon', name: 'Webtoon', subtitle: '500+ series', iconType: 'webtoon', enabled: true },
  { id: 'local', name: 'Local Files', subtitle: 'Your device', iconType: 'local', enabled: true },
  { id: 'anilist', name: 'AniList (Mock)', subtitle: '2000+ series', iconType: 'anilist', enabled: true },
];

export default function BrowseScreen() {
  const { colors } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filterOptions = [
    { label: 'All', value: 'all' as FilterType },
    { label: 'Manga', value: 'manga' as FilterType },
    { label: 'Manhwa', value: 'manhwa' as FilterType },
    { label: 'Manhua', value: 'manhua' as FilterType },
    { label: 'Webtoon', value: 'webtoon' as FilterType },
  ];

  const filteredManga = useMemo(() => {
    return MOCK_MANGA_LIST.filter((item) => {
      if (activeFilter !== 'all' && item.type !== activeFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.altTitles && item.altTitles.some((alt) => alt.toLowerCase().includes(q))) ||
        (item.author && item.author.toLowerCase().includes(q))
      );
    });
  }, [activeFilter, searchQuery]);

  const renderSourceIcon = (type: SourcePreviewItem['iconType']) => {
    switch (type) {
      case 'mangadex':
        return <Globe size={20} color="#FF6740" />;
      case 'webtoon':
        return <Sparkles size={20} color="#00DC64" />;
      case 'local':
        return <FolderArchive size={20} color="#38BDF8" />;
      case 'anilist':
        return <Database size={20} color="#02A9FF" />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Browse" subtitle="Discover across sources & local files" />

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search manga, manhwa, manhua..."
      />

      <FilterChips
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={setActiveFilter}
      />

      {searchQuery ? (
        // Search Results Grid
        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginHorizontal: Spacing.lg }]}>
            Search Results ({filteredManga.length})
          </Text>
          <FlatList
            data={filteredManga}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => (
              <MangaCard
                item={item}
                layout="grid"
                onPress={() => router.push(`/manga/${item.sourceId}`)}
              />
            )}
          />
        </View>
      ) : (
        // Standard Browse Feed
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Featured Sources */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Featured Sources</Text>
            <TouchableOpacity onPress={() => router.push('/sources')}>
              <Text style={[styles.viewAllText, { color: colors.accentText }]}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sourcesList}>
            {FEATURED_SOURCES.map((source) => (
              <TouchableOpacity
                key={source.id}
                onPress={() => router.push('/sources')}
                activeOpacity={0.7}
                style={[
                  styles.sourceCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <View style={[styles.sourceIconWrapper, { backgroundColor: colors.surfaceElevated }]}>
                  {renderSourceIcon(source.iconType)}
                </View>
                <View style={styles.sourceTextWrapper}>
                  <Text style={[styles.sourceName, { color: colors.textPrimary }]}>{source.name}</Text>
                  <Text style={[styles.sourceSubtitle, { color: colors.textSecondary }]}>
                    {source.subtitle}
                  </Text>
                </View>
                <View style={[styles.enabledBadge, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.enabledText, { color: colors.accentText }]}>Enabled</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Popular This Week */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Popular This Week</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: colors.accentText }]}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridRow}>
            {filteredManga.slice(0, 6).map((item) => (
              <MangaCard
                key={item.id}
                item={item}
                layout="grid"
                onPress={() => router.push(`/manga/${item.sourceId}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  resultsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sourcesList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  sourceIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTextWrapper: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sourceSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  enabledBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  enabledText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
});
