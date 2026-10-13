import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Play, Trash2 } from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { EmptyState } from '../../components/common/EmptyState';
import { HistoryRecord, HistoryRepository } from '../../db/repositories/historyRepository';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

type HistoryTab = 'manga' | 'chapters';

export default function HistoryScreen() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<HistoryTab>('manga');
  const [items, setItems] = useState<HistoryRecord[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const records = await HistoryRepository.getRecentHistory();
      setItems(records);
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Reading History',
      'Are you sure you want to clear your reading history? Your library entries and downloaded chapters will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await HistoryRepository.clearAll();
            setItems([]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="History"
        subtitle="Resume your recent reads"
        rightAction={
          items.length > 0 ? (
            <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton}>
              <Trash2 size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Manga / Chapters Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          onPress={() => setActiveTab('manga')}
          activeOpacity={0.8}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'manga' ? colors.accent : colors.surface,
              borderColor: activeTab === 'manga' ? colors.accent : colors.surfaceBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'manga' ? '#121318' : colors.textSecondary,
                fontWeight: activeTab === 'manga' ? '700' : '500',
              },
            ]}
          >
            Manga
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('chapters')}
          activeOpacity={0.8}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'chapters' ? colors.accent : colors.surface,
              borderColor: activeTab === 'chapters' ? colors.accent : colors.surfaceBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'chapters' ? '#121318' : colors.textSecondary,
                fontWeight: activeTab === 'chapters' ? '700' : '500',
              },
            ]}
          >
            Chapters
          </Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="No reading history yet"
          description="Read chapters from your library or explore new titles in Browse to start tracking your progress."
          actionLabel="Browse Titles"
          onAction={() => router.push('/browse')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/manga/${item.mangaId}`)}
              activeOpacity={0.7}
              style={[
                styles.card,
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

              <View style={styles.info}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.mangaTitle}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {`Chapter ${item.chapterNumber} • ${new Date(item.readAt).toLocaleDateString()}`}
                </Text>

                {/* Progress bar */}
                <View style={styles.progressRow}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.accent,
                          width: `${item.progress || 0}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressValue, { color: colors.accentText }]}>
                    {`${item.progress || 0}%`}
                  </Text>
                </View>
              </View>

              {/* Resume Play Button */}
              <TouchableOpacity
                onPress={() => router.push(`/reader/${item.chapterId}`)}
                activeOpacity={0.8}
                style={[styles.resumeButton, { backgroundColor: colors.accentSoft }]}
              >
                <Play size={18} color={colors.accentText} fill={colors.accentText} />
              </TouchableOpacity>
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
  clearButton: {
    padding: 6,
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tabButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 24,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cover: {
    width: 52,
    height: 74,
    borderRadius: Radius.sm,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
    maxWidth: 120,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  resumeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
