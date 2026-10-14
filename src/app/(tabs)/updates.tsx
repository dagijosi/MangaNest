import React, { useCallback, useState } from 'react';
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
  Calendar,
  Download,
  Play,
  RefreshCw,
} from 'lucide-react-native';
import { FilterChips } from '../../components/common/FilterChips';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { MangaRepository } from '../../db/repositories/mangaRepository';
import { providerRegistry } from '../../providers/registry';
import { MangaItem } from '../../providers/types';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

interface ChapterUpdateCardItem {
  id: string; // Chapter ID
  mangaId: string;
  sourceId: string;
  mangaTitle: string;
  mangaCover: string;
  providerId: string;
  providerName: string;
  chapterNumber: number;
  chapterTitle?: string;
  releaseDate?: string;
  isRead?: boolean;
  expectedNextRelease: string;
  cadence: string;
}

type UpdateFilter = 'all' | 'unread' | 'library';

/**
 * Calculates release interval cadence and predicts next chapter release
 */
function estimateReleaseSchedule(chapters: { releaseDate?: string }[]): {
  expectedNextRelease: string;
  cadence: string;
} {
  const dates = chapters
    .map((c) => (c.releaseDate ? new Date(c.releaseDate).getTime() : NaN))
    .filter((t) => !isNaN(t) && t > 0);

  if (dates.length < 2) {
    return {
      expectedNextRelease: 'Next expected in ~3 days (Weekly)',
      cadence: 'Weekly',
    };
  }

  const diffDays = Math.max(1, Math.round(Math.abs(dates[0] - dates[1]) / (1000 * 60 * 60 * 24)));

  let cadence = 'Weekly';
  let cadenceDays = 7;
  if (diffDays >= 20) {
    cadence = 'Monthly';
    cadenceDays = 30;
  } else if (diffDays >= 11) {
    cadence = 'Bi-weekly';
    cadenceDays = 14;
  } else if (diffDays <= 3) {
    cadence = 'Semi-weekly';
    cadenceDays = 3;
  }

  const daysSinceLast = Math.max(0, Math.round((Date.now() - dates[0]) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(1, cadenceDays - daysSinceLast);

  return {
    expectedNextRelease: `Next in ~${daysRemaining}d (${cadence})`,
    cadence,
  };
}

export default function UpdatesScreen() {
  const { colors } = useAppTheme();
  const [activeFilter, setActiveFilter] = useState<UpdateFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [checkingNew, setCheckingNew] = useState(false);
  const [updateItems, setUpdateItems] = useState<ChapterUpdateCardItem[]>([]);

  const fetchLatestUpdates = useCallback(async () => {
    try {
      const library = await MangaRepository.getLibrary();
      const providers = await providerRegistry.getInstalledProviders();

      let targetManga: MangaItem[] = library;

      // If library is empty, also sample popular from installed providers
      if (targetManga.length === 0 && providers.length > 0) {
        const samplePromises = providers.slice(0, 2).map((p) => p.getPopular(1).catch(() => []));
        const sampleResults = await Promise.all(samplePromises);
        targetManga = sampleResults.flat().slice(0, 5);
      }

      if (targetManga.length === 0) {
        setUpdateItems([]);
        return;
      }

      const updates: ChapterUpdateCardItem[] = [];

      for (const manga of targetManga) {
        try {
          const provider = await providerRegistry.resolveProvider(manga.providerId);
          const chapters = await provider.getChapters(manga.sourceId);
          if (chapters && chapters.length > 0) {
            const schedule = estimateReleaseSchedule(chapters);
            const latestChapters = chapters.slice(0, 2);

            for (const ch of latestChapters) {
              updates.push({
                id: ch.id,
                mangaId: manga.id,
                sourceId: manga.sourceId,
                mangaTitle: manga.title,
                mangaCover: manga.coverUrl,
                providerId: manga.providerId,
                providerName: manga.providerName || (manga.providerId === 'comick' ? 'ComicK' : manga.providerId === 'mangadex' ? 'MangaDex' : manga.providerId),
                chapterNumber: ch.chapterNumber,
                chapterTitle: ch.title,
                releaseDate: ch.releaseDate || 'Recent',
                isRead: ch.isRead,
                expectedNextRelease: schedule.expectedNextRelease,
                cadence: schedule.cadence,
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch chapters for ${manga.title}:`, e);
        }
      }

      setUpdateItems(updates);
    } catch (err) {
      console.warn('Failed to fetch updates:', err);
      setUpdateItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLatestUpdates();
    }, [fetchLatestUpdates])
  );

  const handlePullRefresh = async () => {
    setRefreshing(true);
    setCheckingNew(true);
    try {
      await fetchLatestUpdates();
    } finally {
      setRefreshing(false);
      setCheckingNew(false);
    }
  };

  const filterOptions = [
    { label: 'All Updates', value: 'all' as UpdateFilter },
    { label: 'Unread', value: 'unread' as UpdateFilter },
    { label: 'Library Only', value: 'library' as UpdateFilter },
  ];

  const filteredUpdates = updateItems.filter((item) => {
    if (activeFilter === 'unread' && item.isRead) return false;
    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <Header
        title="Updates"
        subtitle={
          checkingNew
            ? 'Checking for new chapters...'
            : 'Double-tap Updates tab for Downloads'
        }
        rightAction={
          <View style={styles.headerActions}>
            {/* Quick access to Downloads */}
            <TouchableOpacity
              onPress={() => router.push('/downloads')}
              style={[styles.downloadHeaderBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
              activeOpacity={0.7}
            >
              <Download size={16} color={colors.accent} />
              <Text style={[styles.downloadHeaderBtnText, { color: colors.accent }]}>Downloads</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePullRefresh}
              style={[styles.refreshIconBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
            >
              {checkingNew ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <RefreshCw size={17} color={colors.textPrimary} />
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filter Chips */}
      <FilterChips
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={setActiveFilter}
      />

      {/* Chapter Updates Feed with Pull-to-Refresh */}
      {filteredUpdates.length === 0 ? (
        <EmptyState
          title="No recent chapter updates"
          description="Pull down to refresh and check your library manga for newly released chapters from your installed extensions."
          actionLabel="Pull to Refresh"
          onAction={handlePullRefresh}
        />
      ) : (
        <FlatList
          data={filteredUpdates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/manga/${encodeURIComponent(item.mangaId)}`)}
              activeOpacity={0.75}
              style={[
                styles.updateCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <Image
                source={{ uri: item.mangaCover }}
                style={styles.coverImage}
                contentFit="cover"
                transition={200}
              />

              <View style={styles.cardInfo}>
                <View style={styles.topInfoRow}>
                  <Text style={[styles.mangaTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.mangaTitle}
                  </Text>
                  <View style={[styles.sourceBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.sourceBadgeText, { color: colors.accent }]}>
                      {item.providerName}
                    </Text>
                  </View>
                </View>

                {/* Chapter details */}
                <Text style={[styles.chapterTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.chapterTitle || `Chapter ${item.chapterNumber}`}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={[styles.releaseDate, { color: colors.textMuted }]}>
                    {item.releaseDate}
                  </Text>
                  <Text style={styles.dot}>•</Text>
                  {/* Estimated next release schedule */}
                  <View style={styles.scheduleRow}>
                    <Calendar size={11} color={colors.accent} />
                    <Text style={[styles.scheduleText, { color: colors.accent }]}>
                      {item.expectedNextRelease}
                    </Text>
                  </View>
                </View>

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.readNowBtn, { backgroundColor: colors.accent }]}
                    onPress={() =>
                      router.push({
                        pathname: '/reader/[chapterId]',
                        params: {
                          chapterId: item.id,
                          mangaId: item.mangaId,
                          chapterTitle: item.chapterTitle,
                          chapterNumber: String(item.chapterNumber),
                          mangaTitle: item.mangaTitle,
                        },
                      })
                    }
                  >
                    <Play size={12} color="#121318" fill="#121318" />
                    <Text style={styles.readNowBtnText}>Read Chapter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: colors.surfaceElevated }]}
                    onPress={() => router.push('/downloads')}
                  >
                    <Download size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  downloadHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  updateCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  coverImage: {
    width: 64,
    height: 92,
    borderRadius: Radius.md,
    backgroundColor: '#1E2029',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  mangaTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  chapterTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  releaseDate: {
    fontSize: 11,
  },
  dot: {
    color: '#666666',
    fontSize: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 8,
  },
  readNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  readNowBtnText: {
    color: '#121318',
    fontSize: 11,
    fontWeight: '800',
  },
  downloadBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
