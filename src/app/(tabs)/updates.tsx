import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { FilterChips } from '../../components/common/FilterChips';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { MOCK_MANGA_LIST } from '../../providers/mock/mockData';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

type UpdateFilter = 'all' | 'library' | 'sources';

export default function UpdatesScreen() {
  const { colors } = useAppTheme();
  const [activeFilter, setActiveFilter] = useState<UpdateFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filterOptions = [
    { label: 'All', value: 'all' as UpdateFilter },
    { label: 'Library', value: 'library' as UpdateFilter },
    { label: 'Sources', value: 'sources' as UpdateFilter },
  ];

  const updateItems = MOCK_MANGA_LIST.filter((item) => {
    if (activeFilter === 'library' && !item.inLibrary) return false;
    return !!item.unreadCount;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Updates"
        subtitle="Recent chapter releases"
        rightAction={
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <RefreshCw size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <FilterChips
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={setActiveFilter}
      />

      {updateItems.length === 0 ? (
        <EmptyState
          title="No recent updates"
          description="Check back later or manually refresh to pull the latest chapters from your enabled sources."
          actionLabel="Refresh Now"
          onAction={handleRefresh}
        />
      ) : (
        <FlatList
          data={updateItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/manga/${item.sourceId}`)}
              activeOpacity={0.7}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <Image
                source={{ uri: item.coverUrl }}
                style={styles.cover}
                contentFit="cover"
                transition={200}
              />

              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.chapterText, { color: colors.textSecondary }]}>
                  {`Chapter ${item.totalChapters ?? 1}`}
                </Text>
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  {item.updatedAt || 'Recent'}
                </Text>
              </View>

              {!!item.unreadCount && (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
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
  refreshButton: {
    padding: 6,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 24,
    gap: Spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cover: {
    width: 52,
    height: 72,
    borderRadius: Radius.sm,
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  chapterText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  badgeText: {
    color: '#121318',
    fontWeight: '800',
    fontSize: 12,
  },
});
