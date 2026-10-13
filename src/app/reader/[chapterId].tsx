import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
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
  ChevronLeft,
  ChevronRight,
  Columns,
  Scroll,
  Settings as SettingsIcon,
  X,
} from 'lucide-react-native';
import { MOCK_READER_PAGES } from '../../providers/mock/mockData';
import { ChapterPage } from '../../providers/types';
import { HistoryRepository } from '../../db/repositories/historyRepository';
import { useAppTheme, usePreferencesStore } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReaderScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const flatListRef = useRef<FlatList<ChapterPage>>(null);
  const pages = MOCK_READER_PAGES;

  const toggleControls = () => {
    setControlsVisible((prev) => !prev);
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const offsetX = event.nativeEvent.contentOffset.x;
      let index = 0;
      if (readingMode === 'continuous') {
        index = Math.min(
          pages.length - 1,
          Math.max(0, Math.floor(offsetY / (SCREEN_HEIGHT * 0.7)))
        );
      } else {
        index = Math.min(
          pages.length - 1,
          Math.max(0, Math.round(offsetX / SCREEN_WIDTH))
        );
      }
      setCurrentPageIndex(index);

      // Save progress to SQLite
      const progressPercent = Math.round(((index + 1) / pages.length) * 100);
      const isCompleted = index >= pages.length - 1;
      const chId = chapterId || 'mock:solo-leveling:ch-201';
      const parts = chId.split(':');
      const mangaId = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : 'mock:solo-leveling';
      HistoryRepository.recordProgress(mangaId, chId, progressPercent, isCompleted).catch(() => {});
    },
    [pages.length, readingMode, chapterId]
  );

  const jumpToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
      flatListRef.current?.scrollToIndex({ index, animated: true });
      const progressPercent = Math.round(((index + 1) / pages.length) * 100);
      const chId = chapterId || 'mock:solo-leveling:ch-201';
      const parts = chId.split(':');
      const mangaId = parts.length >= 2 ? `${parts[0]}:${parts[1]}` : 'mock:solo-leveling';
      HistoryRepository.recordProgress(mangaId, chId, progressPercent, index >= pages.length - 1).catch(() => {});
    }
  };

  const bgStyle = {
    backgroundColor:
      readerBackground === 'black'
        ? '#000000'
        : readerBackground === 'dark'
        ? '#121318'
        : '#FFFFFF',
  };

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
            <View
              style={[
                styles.pageWrapper,
                readingMode === 'continuous'
                  ? { marginBottom: pageSpacing, width: SCREEN_WIDTH }
                  : { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center' },
              ]}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={
                  readingMode === 'continuous'
                    ? { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 }
                    : { width: SCREEN_WIDTH, height: '100%' }
                }
                contentFit="contain"
                transition={150}
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              />
            </View>
          </TouchableWithoutFeedback>
        )}
      />

      {/* Top Overlay Bar */}
      {controlsVisible && (
        <SafeAreaView
          edges={['top']}
          style={[styles.topOverlay, { backgroundColor: colors.overlay }]}
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
              <Text style={styles.chapterTitle} numberOfLines={1}>
                {chapterId ? `Chapter ${chapterId.split('-').pop() || '1'}` : 'Chapter 201'}
              </Text>
              <Text style={styles.pageIndicator}>
                {currentPageIndex + 1} / {pages.length}
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

      {/* Bottom Overlay Bar */}
      {controlsVisible && (
        <SafeAreaView
          edges={['bottom']}
          style={[styles.bottomOverlay, { backgroundColor: colors.overlay }]}
        >
          {/* Quick Page Stepper */}
          <View style={styles.pageStepperRow}>
            <TouchableOpacity
              onPress={() => jumpToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              style={[styles.stepperButton, currentPageIndex === 0 && styles.disabledStepper]}
            >
              <ChevronLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.stepperText}>
              Page {currentPageIndex + 1} of {pages.length}
            </Text>

            <TouchableOpacity
              onPress={() => jumpToPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              style={[
                styles.stepperButton,
                currentPageIndex === pages.length - 1 && styles.disabledStepper,
              ]}
            >
              <ChevronRight size={20} color="#FFFFFF" />
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
              Page Spacing
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
  pageWrapper: {
    alignItems: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  iconButton: {
    padding: 8,
  },
  titleWrapper: {
    alignItems: 'center',
  },
  chapterTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pageIndicator: {
    color: '#A0A4B0',
    fontSize: 12,
    marginTop: 2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.sm,
  },
  pageStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xs,
  },
  stepperButton: {
    padding: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  disabledStepper: {
    opacity: 0.3,
  },
  stepperText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
