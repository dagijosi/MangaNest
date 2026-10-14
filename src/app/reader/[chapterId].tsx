import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  GestureResponderEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns,
  RotateCcw,
  Scroll,
  Settings as SettingsIcon,
  Sparkles,
  X,
} from 'lucide-react-native';
import { providerRegistry } from '../../providers/registry';
import { ChapterPage } from '../../providers/types';
import { HistoryRepository } from '../../db/repositories/historyRepository';
import { useAppTheme, usePreferencesStore } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Equalized Page Image Component:
 * Dynamically calculates true aspect ratio from natural image dimensions
 * to eliminate awkward black letterboxing and ensure seamless full-width viewing.
 */
function AutoSizedPageImage({
  item,
  readingMode,
  pageSpacing,
}: {
  item: ChapterPage;
  readingMode: 'continuous' | 'paged';
  pageSpacing: number;
}) {
  const [aspectRatio, setAspectRatio] = useState<number>(() => {
    if (item.width && item.height && item.height > 0) {
      return item.width / item.height;
    }
    return 0.7; // default manga 2:3 ratio
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <View
      style={[
        styles.pageWrapper,
        { backgroundColor: '#0e1015' },
        readingMode === 'continuous'
          ? { width: SCREEN_WIDTH, minHeight: SCREEN_HEIGHT * 0.6, marginBottom: pageSpacing }
          : { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={
          readingMode === 'continuous'
            ? { width: SCREEN_WIDTH, aspectRatio }
            : { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }
        }
        contentFit={readingMode === 'continuous' ? 'cover' : 'contain'}
        onLoad={(e) => {
          setImageLoaded(true);
          if (e.source.width && e.source.height && e.source.height > 0) {
            setAspectRatio(e.source.width / e.source.height);
          }
        }}
        onError={() => {
          setImageError(true);
        }}
        transition={150}
      />
      {!imageLoaded && !imageError && (
        <View style={styles.imageLoadingOverlay}>
          <ActivityIndicator size="small" color="#FF7A00" />
          <Text style={styles.imageLoadingText}>Page {item.pageNumber}</Text>
        </View>
      )}
      {imageError && (
        <View style={styles.imageLoadingOverlay}>
          <Text style={styles.imageErrorText}>Failed to load page {item.pageNumber}</Text>
        </View>
      )}
    </View>
  );
}

export default function ReaderScreen() {
  const params = useLocalSearchParams<{
    chapterId: string;
    sourceChapterId?: string;
    providerId?: string;
    mangaId?: string;
    chapterTitle?: string;
    chapterNumber?: string;
    sourceMangaId?: string;
    mangaTitle?: string;
  }>();
  const chapterId = params.chapterId;
  const { colors } = useAppTheme();

  const readingMode = usePreferencesStore((s) => s.readingMode);
  const setReadingMode = usePreferencesStore((s) => s.setReadingMode);
  const readingDirection = usePreferencesStore((s) => s.readingDirection);
  const setReadingDirection = usePreferencesStore((s) => s.setReadingDirection);
  const pageSpacing = usePreferencesStore((s) => s.pageSpacing);
  const setPageSpacing = usePreferencesStore((s) => s.setPageSpacing);
  const readerBackground = usePreferencesStore((s) => s.readerBackground);
  const setReaderBackground = usePreferencesStore((s) => s.setReaderBackground);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(240);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState('Manga');

  const flatListRef = useRef<FlatList<ChapterPage>>(null);

  const loadPages = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    try {
      const decodedChapterId = decodeURIComponent(chapterId);
      let providerId = params.providerId || 'mangadex';
      let sourceChapterId = params.sourceChapterId || '';
      // If sourceChapterId was not directly passed in params:
      if (!sourceChapterId) {
        if (decodedChapterId.includes('::')) {
          const parts = decodedChapterId.split('::');
          providerId = parts[0] || providerId;
          const mangaPart = parts[1] || params.sourceMangaId || '';
          const chPart = parts.slice(2).join('::');
          sourceChapterId = mangaPart ? `${mangaPart}___${chPart}` : chPart;
        } else if (decodedChapterId.includes(':')) {
          const parts = decodedChapterId.split(':');
          if (parts.length >= 3) {
            providerId = parts[0];
            const mangaPart = parts[1] || params.sourceMangaId || '';
            const chPart = parts.slice(2).join(':');
            sourceChapterId = mangaPart ? `${mangaPart}___${chPart}` : chPart;
          } else if (parts.length === 2) {
            providerId = parts[0];
            sourceChapterId = parts[1];
          } else {
            sourceChapterId = decodedChapterId;
          }
        } else {
          sourceChapterId = decodedChapterId;
        }
      }

      // If sourceChapterId doesn't have manga info but params has sourceMangaId
      if (!sourceChapterId.includes('___') && params.sourceMangaId) {
        sourceChapterId = `${params.sourceMangaId}___${sourceChapterId}`;
      }

      // Clean any accidental prefix (e.g. "manga-slug:actualChapterId")
      if (sourceChapterId.includes(':') && !sourceChapterId.includes(':::') && !sourceChapterId.includes('___')) {
        const lastPart = sourceChapterId.split(':').pop();
        if (lastPart) sourceChapterId = lastPart;
      }

      setProviderLabel(
        providerId === 'comick'
          ? 'ComicK'
          : providerId === 'mangadex'
          ? 'MangaDex'
          : providerId.split('.').pop() || 'Manga'
      );

      const provider = await providerRegistry.resolveProvider(providerId);
      const pageList = await provider.getPageList(sourceChapterId);
      if (pageList.length === 0) {
        throw new Error('No pages found for this chapter');
      }
      setPages(pageList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapter images');
    } finally {
      setLoading(false);
    }
  }, [chapterId, params.providerId, params.sourceChapterId, params.sourceMangaId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPages();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPages]);

  const toggleControls = () => {
    setControlsVisible((prev) => !prev);
  };

  const jumpToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
      setScrubIndex(index);
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      } catch {
        // Fallback offset
      }
      const progressPercent = Math.round(((index + 1) / pages.length) * 100);
      const chId = chapterId || 'chapter';
      const mId =
        params.mangaId ||
        (params.sourceMangaId ? `${params.providerId || 'manga'}:${params.sourceMangaId}` : 'manga');
      HistoryRepository.recordProgress(mId, chId, progressPercent, index >= pages.length - 1).catch(() => {});
    }
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pages.length === 0 || isScrubbing) return;
      const offsetY = event.nativeEvent.contentOffset.y;
      const offsetX = event.nativeEvent.contentOffset.x;
      let index = 0;
      if (readingMode === 'continuous') {
        index = Math.min(
          pages.length - 1,
          Math.max(0, Math.floor(offsetY / (SCREEN_HEIGHT * 0.75)))
        );
      } else {
        index = Math.min(
          pages.length - 1,
          Math.max(0, Math.round(offsetX / SCREEN_WIDTH))
        );
      }
      setCurrentPageIndex(index);
      setScrubIndex(index);

      // Save progress to SQLite
      const progressPercent = Math.round(((index + 1) / pages.length) * 100);
      const isCompleted = index >= pages.length - 1;
      const chId = chapterId || 'chapter';
      const mId =
        params.mangaId ||
        (params.sourceMangaId ? `${params.providerId || 'manga'}:${params.sourceMangaId}` : 'manga');
      HistoryRepository.recordProgress(mId, chId, progressPercent, isCompleted).catch(() => {});
    },
    [pages.length, readingMode, chapterId, isScrubbing, params.mangaId, params.sourceMangaId, params.providerId]
  );

  // Scrubber touch handlers
  const handleScrubberTouch = (e: GestureResponderEvent) => {
    if (trackWidth <= 0 || pages.length <= 1) return;
    const x = Math.max(0, Math.min(e.nativeEvent.locationX, trackWidth));
    const targetIdx = Math.round((x / trackWidth) * (pages.length - 1));
    setScrubIndex(targetIdx);
  };

  const bgStyle = {
    backgroundColor:
      readerBackground === 'black'
        ? '#000000'
        : readerBackground === 'dark'
        ? '#121318'
        : '#FFFFFF',
  };

  if (loading && pages.length === 0) {
    const rawChapter = chapterId ? decodeURIComponent(chapterId).split(':').pop() || 'Chapter' : 'Chapter';
    const isNum = !isNaN(parseFloat(rawChapter));
    const fallbackTitle = isNum ? `Chapter ${rawChapter}` : rawChapter.replace(/[-_]/g, ' ');
    const displayChapter = params.chapterTitle || (params.chapterNumber ? `Chapter ${params.chapterNumber}` : fallbackTitle);

    return (
      <View style={[styles.container, styles.loadingContainer, bgStyle]}>
        <View style={styles.loadingAura} />

        <View style={styles.loadingCard}>
          <View style={styles.loadingIconRing}>
            <BookOpen size={34} color={colors.accent} />
          </View>

          <View style={styles.loadingBadge}>
            <Sparkles size={12} color={colors.accent} />
            <Text style={[styles.loadingBadgeText, { color: colors.accent }]}>
              {providerLabel.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.loadingTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {displayChapter}
          </Text>

          <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
            Retrieving high-definition pages...
          </Text>

          <View style={styles.loadingBarTrack}>
            <View style={[styles.loadingBarFill, { backgroundColor: colors.accent }]} />
          </View>

          <View style={styles.tipsBox}>
            <Text style={styles.tipTitle}>READER TIP</Text>
            <Text style={styles.tipText}>
              Tap the center of your screen while reading to toggle controls, reader settings, and page slider.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error && pages.length === 0) {
    return (
      <View style={[styles.container, styles.centerBox, bgStyle]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Failed to Load Chapter</Text>
        <Text style={[styles.errorDesc, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accent }]} onPress={loadPages}>
          <RotateCcw size={16} color="#121318" />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: colors.textMuted }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activePageDisplay = (isScrubbing ? scrubIndex : currentPageIndex) + 1;
  const progressRatio = pages.length > 1 ? (isScrubbing ? scrubIndex : currentPageIndex) / (pages.length - 1) : 0;

  return (
    <View style={[styles.container, bgStyle]}>
      {/* Tap layer to toggle controls */}
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none" />
      </TouchableWithoutFeedback>

      {/* Reader Pages FlatList */}
      <FlatList
        ref={flatListRef}
        data={pages}
        keyExtractor={(item) => `page-${item.pageNumber}`}
        horizontal={readingMode === 'paged'}
        inverted={readingMode === 'paged' && readingDirection === 'rtl'}
        pagingEnabled={readingMode === 'paged'}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableWithoutFeedback onPress={toggleControls}>
            <View>
              <AutoSizedPageImage
                item={item}
                readingMode={readingMode}
                pageSpacing={pageSpacing}
              />
            </View>
          </TouchableWithoutFeedback>
        )}
      />

      {/* Vertical Quick-Scrubber Pill (Continuous Mode) */}
      {readingMode === 'continuous' && pages.length > 1 && (
        <View style={styles.verticalTrackContainer}>
          <View style={[styles.verticalThumb, { top: `${Math.round(progressRatio * 85)}%`, backgroundColor: colors.accent }]}>
            <Text style={styles.verticalThumbText}>{currentPageIndex + 1}</Text>
          </View>
        </View>
      )}

      {/* Top Overlay Bar */}
      {controlsVisible && (
        <SafeAreaView
          edges={['top']}
          style={[styles.topOverlay, { backgroundColor: 'rgba(18, 19, 24, 0.92)' }]}
        >
          <View style={styles.topBarContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.titleWrapper}>
              <View style={styles.titleRow}>
                <Text style={styles.chapterTitle} numberOfLines={1}>
                  {params.chapterTitle || (params.chapterNumber ? `Chapter ${params.chapterNumber}` : `Chapter ${chapterId?.split(':').pop() || '1'}`)}
                </Text>
                <View style={[styles.providerPill, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.providerPillText, { color: colors.accent }]}>
                    {providerLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.pageIndicator}>
                {params.mangaTitle ? `${params.mangaTitle} • ` : ''}Page {activePageDisplay} of {pages.length}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsBookmarked((prev) => !prev)}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Bookmark
                size={22}
                color={isBookmarked ? colors.accent : '#FFFFFF'}
                fill={isBookmarked ? colors.accent : 'none'}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Bottom Overlay Bar with Interactive Scrubber (Requirement 6) */}
      {controlsVisible && (
        <SafeAreaView
          edges={['bottom']}
          style={[styles.bottomOverlay, { backgroundColor: 'rgba(18, 19, 24, 0.95)' }]}
        >
          {/* Interactive Page Scrubber Slider ("scroll thing") */}
          <View style={styles.scrubberSection}>
            {/* Quick jump -5 */}
            <TouchableOpacity
              style={styles.quickStepBtn}
              onPress={() => jumpToPage(currentPageIndex - 5)}
              disabled={currentPageIndex === 0}
            >
              <Text style={[styles.quickStepText, { color: currentPageIndex === 0 ? '#555555' : '#FFFFFF' }]}>
                -5
              </Text>
            </TouchableOpacity>

            {/* Stepper Left */}
            <TouchableOpacity
              onPress={() => jumpToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              style={[styles.stepperButton, currentPageIndex === 0 && styles.disabledStepper]}
            >
              <ChevronLeft size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Interactive Slider Bar */}
            <View
              style={styles.sliderTrackContainer}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                setIsScrubbing(true);
                handleScrubberTouch(e);
              }}
              onResponderMove={handleScrubberTouch}
              onResponderRelease={(e) => {
                setIsScrubbing(false);
                handleScrubberTouch(e);
                jumpToPage(scrubIndex);
              }}
            >
              {/* Background Track */}
              <View style={[styles.sliderTrack, { backgroundColor: '#333544' }]}>
                {/* Active Progress Fill */}
                <View
                  style={[
                    styles.sliderProgress,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>

              {/* Slider Draggable Thumb */}
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${Math.max(0, Math.min(progressRatio * 100, 96))}%`,
                    backgroundColor: colors.accent,
                  },
                ]}
              />

              {/* Live Scrubbing Tooltip */}
              {isScrubbing && (
                <View
                  style={[
                    styles.scrubTooltip,
                    {
                      left: `${Math.max(10, Math.min(progressRatio * 100, 80))}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                >
                  <Text style={styles.scrubTooltipText}>Page {activePageDisplay}</Text>
                </View>
              )}
            </View>

            {/* Stepper Right */}
            <TouchableOpacity
              onPress={() => jumpToPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              style={[
                styles.stepperButton,
                currentPageIndex === pages.length - 1 && styles.disabledStepper,
              ]}
            >
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Quick jump +5 */}
            <TouchableOpacity
              style={styles.quickStepBtn}
              onPress={() => jumpToPage(currentPageIndex + 5)}
              disabled={currentPageIndex >= pages.length - 1}
            >
              <Text
                style={[
                  styles.quickStepText,
                  { color: currentPageIndex >= pages.length - 1 ? '#555555' : '#FFFFFF' },
                ]}
              >
                +5
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Icons Row */}
          <View style={styles.actionsRow}>
            {/* Mode Toggle */}
            <TouchableOpacity
              onPress={() => setReadingMode(readingMode === 'continuous' ? 'paged' : 'continuous')}
              style={styles.actionItem}
            >
              {readingMode === 'continuous' ? (
                <Scroll size={20} color={colors.accent} />
              ) : (
                <Columns size={20} color={colors.accent} />
              )}
              <Text style={[styles.actionLabel, { color: colors.accentText }]}>
                {readingMode === 'continuous' ? 'Webtoon' : 'Paged'}
              </Text>
            </TouchableOpacity>

            {/* Direction Toggle */}
            <TouchableOpacity
              onPress={() => setReadingDirection(readingDirection === 'rtl' ? 'ltr' : 'rtl')}
              style={styles.actionItem}
            >
              <ArrowLeftRight size={20} color="#FFFFFF" />
              <Text style={styles.actionLabel}>
                {readingDirection.toUpperCase()}
              </Text>
            </TouchableOpacity>

            {/* Reader Settings Modal Trigger */}
            <TouchableOpacity
              onPress={() => setSettingsModalOpen(true)}
              style={styles.actionItem}
            >
              <SettingsIcon size={20} color="#FFFFFF" />
              <Text style={styles.actionLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Reader Settings Modal */}
      <Modal
        visible={settingsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Reader Settings
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalOpen(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Background Color Setting */}
            <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
              Background Color
            </Text>
            <View style={styles.optionsRow}>
              {(['black', 'dark', 'white'] as const).map((bg) => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setReaderBackground(bg)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        readerBackground === bg ? colors.accent : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: readerBackground === bg ? '#121318' : colors.textPrimary },
                    ]}
                  >
                    {bg.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Page Spacing Setting */}
            <Text style={[styles.settingLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
              Page Spacing (Webtoon Mode)
            </Text>
            <View style={styles.optionsRow}>
              {[0, 4, 8, 16].map((space) => (
                <TouchableOpacity
                  key={space}
                  onPress={() => setPageSpacing(space)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        pageSpacing === space ? colors.accent : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: pageSpacing === space ? '#121318' : colors.textPrimary },
                    ]}
                  >
                    {space}px
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    position: 'relative',
  },
  loadingAura: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 122, 0, 0.08)',
    top: '30%',
    alignSelf: 'center',
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(26, 29, 38, 0.85)',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingIconRing: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 122, 0, 0.25)',
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  loadingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  loadingBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  loadingBarFill: {
    width: '70%',
    height: '100%',
    borderRadius: Radius.full,
  },
  tipsBox: {
    width: '100%',
    backgroundColor: 'rgba(18, 19, 24, 0.65)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  tipTitle: {
    color: '#8A8F9E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  tipText: {
    color: '#B0B5C5',
    fontSize: 12,
    lineHeight: 17,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e1015',
    gap: 8,
  },
  imageLoadingText: {
    color: '#8A8F9E',
    fontSize: 12,
    fontWeight: '600',
  },
  imageErrorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  statusText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  errorDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  retryBtnText: {
    color: '#121318',
    fontWeight: '700',
    fontSize: 14,
  },
  backBtn: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  backBtnText: {
    fontSize: 14,
  },
  pageWrapper: {
    overflow: 'hidden',
  },
  verticalTrackContainer: {
    position: 'absolute',
    right: 4,
    top: 80,
    bottom: 80,
    width: 24,
    zIndex: 10,
    pointerEvents: 'none',
  },
  verticalThumb: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    opacity: 0.85,
  },
  verticalThumbText: {
    color: '#121318',
    fontSize: 9,
    fontWeight: '800',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chapterTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  providerPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  providerPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pageIndicator: {
    color: '#A0A4B8',
    fontSize: 12,
    marginTop: 2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingTop: Spacing.sm,
  },
  scrubberSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    gap: 8,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  sliderProgress: {
    height: '100%',
    borderRadius: Radius.full,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginTop: -5,
  },
  scrubTooltip: {
    position: 'absolute',
    top: -30,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    zIndex: 30,
  },
  scrubTooltipText: {
    color: '#121318',
    fontSize: 10,
    fontWeight: '800',
  },
  stepperButton: {
    padding: 6,
  },
  disabledStepper: {
    opacity: 0.3,
  },
  quickStepBtn: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: '#262833',
  },
  quickStepText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
    minWidth: 60,
  },
  actionLabel: {
    color: '#CCD0E0',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
