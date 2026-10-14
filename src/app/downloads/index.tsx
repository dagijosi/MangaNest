import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Pause, Play, Trash2 } from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { LocalFileManager } from '../../services/localFileManager';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

type DownloadTab = 'downloading' | 'completed';

interface DownloadItem {
  id: string;
  mangaTitle: string;
  chapterTitle: string;
  coverUrl: string;
  progress: number; // 0 to 100
  downloadedSize: string;
  totalSize: string;
  status: 'downloading' | 'paused' | 'completed';
}

export default function DownloadsScreen() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<DownloadTab>('downloading');
  const [items, setItems] = useState<DownloadItem[]>([]);

  const togglePause = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: item.status === 'downloading' ? 'paused' : 'downloading',
          };
        }
        return item;
      })
    );
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await LocalFileManager.deleteDownloadedChapter('manga', id);
  };

  const filteredItems = items.filter((item) =>
    activeTab === 'downloading' ? item.status !== 'completed' : item.status === 'completed'
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title="Downloads" subtitle="Offline chapter management" showBack />

      {/* Tabs */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          onPress={() => setActiveTab('downloading')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'downloading' ? colors.accent : colors.surface,
              borderColor: activeTab === 'downloading' ? colors.accent : colors.surfaceBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'downloading' ? '#121318' : colors.textSecondary,
                fontWeight: activeTab === 'downloading' ? '700' : '500',
              },
            ]}
          >
            Downloading
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('completed')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'completed' ? colors.accent : colors.surface,
              borderColor: activeTab === 'completed' ? colors.accent : colors.surfaceBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'completed' ? '#121318' : colors.textSecondary,
                fontWeight: activeTab === 'completed' ? '700' : '500',
              },
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Downloads List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />

            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.mangaTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {item.chapterTitle}
              </Text>

              {item.status !== 'completed' ? (
                <View style={styles.progressRow}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.accent,
                          width: `${item.progress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: colors.accentText }]}>
                    {`${item.progress}% • ${item.downloadedSize}`}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.completedText, { color: colors.success }]}>
                  {`Downloaded • ${item.totalSize}`}
                </Text>
              )}
            </View>

            {item.status !== 'completed' ? (
              <TouchableOpacity
                onPress={() => togglePause(item.id)}
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                {item.status === 'downloading' ? (
                  <Pause size={18} color={colors.textPrimary} />
                ) : (
                  <Play size={18} color={colors.accent} fill={colors.accent} />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => deleteItem(item.id)}
                style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <Trash2 size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Storage Breakdown Footer */}
      <View
        style={[
          styles.storageBar,
          { backgroundColor: colors.surface, borderTopColor: colors.surfaceBorder },
        ]}
      >
        <View style={styles.storageHeader}>
          <Text style={[styles.storageTitle, { color: colors.textPrimary }]}>Device Storage</Text>
          <Text style={[styles.storageValue, { color: colors.textSecondary }]}>8.4 GB / 32 GB</Text>
        </View>

        <View style={[styles.storageTrack, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.storageFillLibrary, { backgroundColor: colors.accent, width: '12%' }]} />
          <View style={[styles.storageFillDownloads, { backgroundColor: colors.warning, width: '22%' }]} />
        </View>

        <View style={styles.storageLegend}>
          <Text style={[styles.legendItem, { color: colors.textMuted }]}>
            ● Library: 2.1 GB
          </Text>
          <Text style={[styles.legendItem, { color: colors.textMuted }]}>
            ● Downloads: 6.3 GB
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressRow: {
    gap: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
    maxWidth: 160,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  storageValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  storageTrack: {
    height: 6,
    borderRadius: Radius.full,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  storageFillLibrary: {
    height: '100%',
  },
  storageFillDownloads: {
    height: '100%',
  },
  storageLegend: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  legendItem: {
    fontSize: 11,
  },
});
