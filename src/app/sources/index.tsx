import React, { useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, FolderArchive, Globe, Sparkles } from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { FilterChips } from '../../components/common/FilterChips';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

interface SourceMeta {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  enabled: boolean;
  iconType: 'mangadex' | 'webtoon' | 'local' | 'anilist';
}

const INITIAL_SOURCES: SourceMeta[] = [
  {
    id: 'mangadex',
    name: 'MangaDex',
    description: 'Manga • 1000+ series • Multi-language',
    version: 'v1.4.2',
    type: 'manga',
    enabled: true,
    iconType: 'mangadex',
  },
  {
    id: 'webtoon',
    name: 'Webtoon',
    description: 'Webtoon • 500+ official originals',
    version: 'v1.1.0',
    type: 'webtoon',
    enabled: true,
    iconType: 'webtoon',
  },
  {
    id: 'local',
    name: 'Local Files & Archives',
    description: 'Local • Device storage (CBZ, CBR, Folders)',
    version: 'v2.0.0',
    type: 'all',
    enabled: true,
    iconType: 'local',
  },
  {
    id: 'anilist',
    name: 'AniList (Mock Provider)',
    description: 'Manga & Manhwa • 2000+ series',
    version: 'v1.0.0',
    type: 'all',
    enabled: true,
    iconType: 'anilist',
  },
];

export default function SourcesScreen() {
  const { colors } = useAppTheme();
  const [sources, setSources] = useState<SourceMeta[]>(INITIAL_SOURCES);
  const [activeFilter, setActiveFilter] = useState('all');

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Manga', value: 'manga' },
    { label: 'Manhwa', value: 'manhwa' },
    { label: 'Manhua', value: 'manhua' },
  ];

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const enabledCount = sources.filter((s) => s.enabled).length;

  const renderIcon = (type: SourceMeta['iconType']) => {
    switch (type) {
      case 'mangadex':
        return <Globe size={22} color="#FF6740" />;
      case 'webtoon':
        return <Sparkles size={22} color="#00DC64" />;
      case 'local':
        return <FolderArchive size={22} color="#38BDF8" />;
      case 'anilist':
        return <Database size={22} color="#02A9FF" />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title="Sources" subtitle="Manage content providers & permissions" showBack />

      <FilterChips
        options={filterOptions}
        selectedValue={activeFilter}
        onSelect={setActiveFilter}
      />

      <FlatList
        data={sources}
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
            <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceElevated }]}>
              {renderIcon(item.iconType)}
            </View>

            <View style={styles.textWrapper}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.version, { color: colors.textMuted }]}>{item.version}</Text>
              </View>
              <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>

            <Switch
              value={item.enabled}
              onValueChange={() => toggleSource(item.id)}
              trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
              thumbColor={item.enabled ? '#FFFFFF' : colors.textMuted}
            />
          </View>
        )}
      />

      {/* Bottom Counter Bar */}
      <View style={[styles.footerBar, { backgroundColor: colors.surface, borderTopColor: colors.surfaceBorder }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {`${enabledCount} of ${sources.length} sources enabled`}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 24,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    fontSize: 11,
  },
  desc: {
    fontSize: 12,
    marginTop: 2,
  },
  footerBar: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
