import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Grid, List, Search as SearchIcon, X } from 'lucide-react-native';
import { FilterChips } from '../../components/common/FilterChips';
import { Header } from '../../components/common/Header';
import { MangaCard } from '../../components/common/MangaCard';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { MangaRepository } from '../../db/repositories/mangaRepository';
import { MangaItem, MangaType } from '../../providers/types';
import { useAppTheme, usePreferencesStore } from '../../store/preferencesStore';

type FilterType = 'all' | MangaType;

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const libraryLayout = usePreferencesStore((s) => s.libraryLayout);
  const setLibraryLayout = usePreferencesStore((s) => s.setLibraryLayout);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [libraryItems, setLibraryItems] = useState<MangaItem[]>([]);

  // Filter options
  const filterOptions = [
    { label: 'All', value: 'all' as FilterType },
    { label: 'Manga', value: 'manga' as FilterType },
    { label: 'Manhwa', value: 'manhwa' as FilterType },
    { label: 'Manhua', value: 'manhua' as FilterType },
    { label: 'Webtoon', value: 'webtoon' as FilterType },
  ];

  const loadLibrary = useCallback(async () => {
    try {
      const items = await MangaRepository.getLibrary({
        type: activeFilter,
        searchQuery,
      });
      setLibraryItems(items);
    } catch (e) {
      console.warn('Failed to load library:', e);
    }
  }, [activeFilter, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [loadLibrary])
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCardPress = (item: MangaItem) => {
    if (isSelectionMode) {
      toggleSelect(item.id);
    } else {
      router.push(`/manga/${item.sourceId}`);
    }
  };

  const handleCardLongPress = (item: MangaItem) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([item.id]));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <Header
        title={isSelectionMode ? `${selectedIds.size} Selected` : 'Library'}
        subtitle={isSelectionMode ? 'Select items for bulk action' : `${libraryItems.length} titles`}
        rightAction={
          <View style={styles.headerActions}>
            {isSelectionMode ? (
              <TouchableOpacity
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                style={styles.iconButton}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setSearchOpen((prev) => !prev)}
                  style={styles.iconButton}
                >
                  <SearchIcon size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setLibraryLayout(libraryLayout === 'grid' ? 'list' : 'grid')}
                  style={styles.iconButton}
                >
                  {libraryLayout === 'grid' ? (
                    <List size={20} color={colors.textPrimary} />
                  ) : (
                    <Grid size={20} color={colors.textPrimary} />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />

      {/* Search Input if open */}
      {searchOpen && !isSelectionMode && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter library titles..."
          onClear={() => setSearchOpen(false)}
        />
      )}

      {/* Filter Chips */}
      <FilterChips
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={setActiveFilter}
      />

      {/* Manga Grid / List */}
      {libraryItems.length === 0 ? (
        <EmptyState
          title="No manga in this collection"
          description={
            searchQuery
              ? `No results matching "${searchQuery}". Try a different keyword.`
              : 'Add your favorite series from the Browse tab to build your library.'
          }
          actionLabel="Go to Browse"
          onAction={() => router.push('/browse')}
        />
      ) : (
        <FlatList
          key={libraryLayout} // Force re-render when switching columns
          data={libraryItems}
          keyExtractor={(item) => item.id}
          numColumns={libraryLayout === 'grid' ? 3 : 1}
          contentContainerStyle={[
            styles.listContent,
            libraryLayout === 'grid' && styles.gridPadding,
          ]}
          renderItem={({ item }) => (
            <MangaCard
              item={item}
              layout={libraryLayout}
              onPress={() => handleCardPress(item)}
              onLongPress={() => handleCardLongPress(item)}
              isSelected={selectedIds.has(item.id)}
            />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  listContent: {
    paddingBottom: 24,
  },
  gridPadding: {
    paddingHorizontal: 10,
  },
});
