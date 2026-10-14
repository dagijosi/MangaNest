import React, { useMemo, useState } from 'react';
import {
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
  Share2,
  Star,
} from 'lucide-react-native';
import { MOCK_MANGA_LIST, generateMockChapters } from '../../providers/mock/mockData';
import { MangaRepository } from '../../db/repositories/mangaRepository';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

export default function MangaDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [inLibrary, setInLibrary] = useState(true);
  const [sortAscending, setSortAscending] = useState(false);

  // Find manga item or default to first
  const manga = useMemo(() => {
    return (
      MOCK_MANGA_LIST.find((m) => m.sourceId === id || m.id === id) ||
      MOCK_MANGA_LIST[0]
    );
  }, [id]);

  React.useEffect(() => {
    MangaRepository.getById(manga.id).then((saved) => {
      if (saved) {
        setInLibrary(saved.inLibrary ?? false);
      }
    });
  }, [manga.id]);

  const handleToggleLibrary = async () => {
    const next = !inLibrary;
    setInLibrary(next);
    await MangaRepository.setInLibrary(manga.id, next);
  };

  // Generate chapters for this manga
  const rawChapters = useMemo(() => {
    return generateMockChapters(manga.sourceId, 25);
  }, [manga.sourceId]);

  const chapters = useMemo(() => {
    const list = [...rawChapters];
    if (sortAscending) {
      return list.reverse();
    }
    return list;
  }, [rawChapters, sortAscending]);

  const latestChapter = rawChapters[0];
  const firstUnread = rawChapters.slice().reverse().find((c) => !c.isRead) || rawChapters[0];

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
          <TouchableOpacity
            onPress={() => router.push(`/reader/${firstUnread.id}`)}
            activeOpacity={0.8}
            style={[styles.readMainButton, { backgroundColor: colors.accent }]}
          >
            <Play size={18} color="#121318" fill="#121318" />
            <Text style={styles.readMainButtonText}>
              {`Resume Chapter ${firstUnread.chapterNumber}`}
            </Text>
          </TouchableOpacity>

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
              {latestChapter ? `Latest: Chapter ${latestChapter.chapterNumber}` : 'Chapters'}
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
          {chapters.map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              onPress={() => router.push(`/reader/${chapter.id}`)}
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
                  onPress={() => router.push(`/reader/${chapter.id}`)}
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
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
