import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpDown,
  Bookmark,
  Check,
  Download,
  Play,
  RotateCcw,
  Share2,
  Star,
} from 'lucide-react-native';
import { providerRegistry } from '../../providers/registry';
import { ChapterItem, MangaItem } from '../../providers/types';
import { MangaRepository } from '../../db/repositories/mangaRepository';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

export default function MangaDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const [manga, setManga] = useState<MangaItem | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [sortAscending, setSortAscending] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const decodedId = decodeURIComponent(id);
      let providerId = 'mangadex';
      let sourceId = decodedId;

      if (decodedId.includes(':')) {
        const colonIdx = decodedId.indexOf(':');
        providerId = decodedId.substring(0, colonIdx);
        sourceId = decodedId.substring(colonIdx + 1);
      }

      // Check SQLite first
      let item = await MangaRepository.getById(decodedId);
      if (!item && sourceId !== decodedId) {
        item = await MangaRepository.getById(sourceId);
      }
      if (item?.providerId) {
        providerId = item.providerId;
      }

      const provider = await providerRegistry.resolveProvider(providerId);

      // Fetch fresh details from provider if needed
      if (!item && provider) {
        item = await provider.getMangaDetails(sourceId);
      }

      if (item) {
        setManga(item);
        setInLibrary(item.inLibrary ?? false);
      }

      // Fetch chapters
      if (provider) {
        const chList = await provider.getChapters(sourceId);
        setChapters(chList);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load manga details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleToggleLibrary = async () => {
    if (!manga) return;
    const next = !inLibrary;
    setInLibrary(next);
    await MangaRepository.upsert({
      ...manga,
      inLibrary: next,
    });
  };

  const sortedChapters = useMemo(() => {
    const list = [...chapters];
    if (sortAscending) {
      return list.reverse();
    }
    return list;
  }, [chapters, sortAscending]);

  const latestChapter = chapters[0];
  const firstUnread = chapters.slice().reverse().find((c) => !c.isRead) || chapters[0];

  const openChapter = (ch: ChapterItem) => {
    router.push({
      pathname: '/reader/[chapterId]',
      params: {
        chapterId: ch.id,
        sourceChapterId: ch.sourceChapterId,
        providerId: ch.providerId || manga?.providerId || 'mangadex',
        mangaId: manga?.id || ch.mangaId,
        chapterTitle: ch.title || `Chapter ${ch.chapterNumber}`,
        chapterNumber: String(ch.chapterNumber),
        sourceMangaId: manga?.sourceId || id,
        mangaTitle: manga?.title || '',
      },
    });
  };

  if (loading && !manga) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading manga details...</Text>
      </SafeAreaView>
    );
  }

  if (error && !manga) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.errorHeading, { color: colors.textPrimary }]}>Could Not Load Manga</Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
          onPress={loadData}
        >
          <RotateCcw size={16} color="#121318" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={[styles.backLinkText, { color: colors.textMuted }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!manga) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[styles.navIconButton, { backgroundColor: colors.surface }]}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topNavActions}>
          <TouchableOpacity
            onPress={handleToggleLibrary}
            activeOpacity={0.7}
            style={[styles.navIconButton, { backgroundColor: colors.surface }]}
          >
            <Bookmark
              size={20}
              color={inLibrary ? colors.accent : colors.textPrimary}
              fill={inLibrary ? colors.accent : 'none'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.navIconButton, { backgroundColor: colors.surface }]}
          >
            <Share2 size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: manga.coverUrl }}
            style={styles.heroCover}
            contentFit="cover"
            transition={300}
          />

          <View style={styles.heroInfo}>
            <View style={styles.typeRow}>
              <View style={[styles.sourceBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
                <Text style={[styles.sourceText, { color: colors.accent }]}>
                  {manga.providerName || (manga.providerId === 'comick' ? 'ComicK' : manga.providerId === 'mangadex' ? 'MangaDex' : manga.providerId)}
                </Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.typeText, { color: colors.accentText }]}>
                  {manga.type.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>
                  {manga.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {manga.title}
            </Text>

            <Text style={[styles.author, { color: colors.textSecondary }]}>
              {manga.author} {manga.artist ? `• ${manga.artist}` : ''}
            </Text>

            <View style={styles.ratingRow}>
              <Star size={16} color={colors.warning} fill={colors.warning} />
              <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
                {manga.rating || 4.8}
              </Text>
              <Text style={[styles.ratingCount, { color: colors.textMuted }]}>
                ({manga.ratingCount ? `${(manga.ratingCount / 1000).toFixed(1)}k` : '12.4k'})
              </Text>
            </View>
          </View>
        </View>

        {/* Genre Tags */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genresContainer}
        >
          {manga.genres.map((genre) => (
            <View
              key={genre}
              style={[
                styles.genreChip,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <Text style={[styles.genreText, { color: colors.textSecondary }]}>{genre}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Synopsis / Description */}
        <View style={styles.sectionBlock}>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={descriptionExpanded ? undefined : 3}
          >
            {manga.description}
          </Text>
          <TouchableOpacity
            onPress={() => setDescriptionExpanded((prev) => !prev)}
            style={styles.expandButton}
          >
            <Text style={[styles.expandText, { color: colors.accentText }]}>
              {descriptionExpanded ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Read / Resume Button */}
        <View style={styles.ctaRow}>
          {firstUnread && (
            <TouchableOpacity
              onPress={() => openChapter(firstUnread)}
              activeOpacity={0.8}
              style={[styles.readMainButton, { backgroundColor: colors.accent }]}
            >
              <Play size={18} color="#121318" fill="#121318" />
              <Text style={styles.readMainButtonText}>
                {`Read Chapter ${firstUnread.chapterNumber}`}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleToggleLibrary}
            activeOpacity={0.8}
            style={[
              styles.libraryButton,
              {
                backgroundColor: inLibrary ? colors.accentSoft : colors.surface,
                borderColor: inLibrary ? colors.accent : colors.surfaceBorder,
              },
            ]}
          >
            {inLibrary ? (
              <Check size={18} color={colors.accentText} />
            ) : (
              <Bookmark size={18} color={colors.textPrimary} />
            )}
            <Text
              style={[
                styles.libraryButtonText,
                { color: inLibrary ? colors.accentText : colors.textPrimary },
              ]}
            >
              {inLibrary ? 'In Library' : 'Add to Library'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chapters Header */}
        <View style={styles.chaptersHeader}>
          <View>
            <Text style={[styles.chaptersTitle, { color: colors.textPrimary }]}>Chapters</Text>
            <Text style={[styles.chaptersSubtitle, { color: colors.textSecondary }]}>
              {latestChapter ? `Latest: Chapter ${latestChapter.chapterNumber}` : `${chapters.length} Chapters`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setSortAscending((prev) => !prev)}
            activeOpacity={0.7}
            style={[
              styles.sortButton,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <ArrowUpDown size={15} color={colors.textSecondary} />
            <Text style={[styles.sortButtonText, { color: colors.textSecondary }]}>
              {sortAscending ? 'Oldest First' : 'Latest First'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chapter List */}
        <View style={styles.chapterListContainer}>
          {loading && chapters.length === 0 ? (
            <View style={styles.loadingChaptersBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.loadingChaptersText, { color: colors.textMuted }]}>
                Loading chapters...
              </Text>
            </View>
          ) : sortedChapters.length === 0 ? (
            <View style={[styles.emptyChaptersCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.emptyChaptersText, { color: colors.textSecondary }]}>
                No English chapters found for this title.
              </Text>
            </View>
          ) : (
            sortedChapters.map((chapter) => (
              <TouchableOpacity
                key={chapter.id}
                onPress={() => openChapter(chapter)}
                activeOpacity={0.7}
                style={[
                  styles.chapterCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <View style={styles.chapterCardLeft}>
                  <Text
                    style={[
                      styles.chapterCardTitle,
                      { color: chapter.isRead ? colors.textMuted : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {chapter.title || `Chapter ${chapter.chapterNumber}`}
                  </Text>
                  <Text style={[styles.chapterCardMeta, { color: colors.textMuted }]}>
                    {chapter.releaseDate || 'Recently'} • {chapter.scanlator || 'Official'}
                  </Text>
                </View>

                <View style={styles.chapterCardRight}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.chapterActionIcon}
                    onPress={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Download size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openChapter(chapter)}
                    activeOpacity={0.8}
                    style={[
                      styles.readTag,
                      {
                        backgroundColor: chapter.isRead
                          ? colors.surfaceElevated
                          : colors.accentSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.readTagText,
                        { color: chapter.isRead ? colors.textMuted : colors.accentText },
                      ]}
                    >
                      {chapter.isRead ? 'Read' : 'Read'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  errorHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  retryButtonText: {
    color: '#121318',
    fontWeight: '700',
    fontSize: 14,
  },
  backLink: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  backLinkText: {
    fontSize: 12,
  },
  loadingChaptersBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  loadingChaptersText: {
    fontSize: 14,
  },
  emptyChaptersCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  emptyChaptersText: {
    fontSize: 12,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  navIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  heroCover: {
    width: 120,
    height: 170,
    borderRadius: Radius.md,
  },
  heroInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
    justifyContent: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  sourceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 12,
  },
  genresContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionBlock: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  expandButton: {
    marginTop: 4,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  readMainButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.full,
    gap: 8,
  },
  readMainButtonText: {
    color: '#121318',
    fontWeight: '800',
    fontSize: 14,
  },
  libraryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  libraryButtonText: {
    fontWeight: '700',
    fontSize: 13,
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chaptersTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  chaptersSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chapterListContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  chapterCardLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  chapterCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  chapterCardMeta: {
    fontSize: 11,
  },
  chapterCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  chapterActionIcon: {
    padding: 4,
  },
  readTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  readTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
