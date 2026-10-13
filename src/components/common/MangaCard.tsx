import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { MangaItem } from '../../providers/types';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

interface MangaCardProps {
  item: MangaItem;
  layout?: 'grid' | 'list';
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
}

export function MangaCard({
  item,
  layout = 'grid',
  onPress,
  onLongPress,
  isSelected,
}: MangaCardProps) {
  const { colors } = useAppTheme();

  if (layout === 'list') {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={[
          styles.listContainer,
          {
            backgroundColor: isSelected ? colors.accentSoft : colors.surface,
            borderColor: isSelected ? colors.accent : colors.surfaceBorder,
          },
        ]}
      >
        <Image
          source={{ uri: item.coverUrl }}
          style={styles.listCover}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.listContent}>
          <View style={styles.listHeaderRow}>
            <Text style={[styles.listTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.listTypeBadge, { color: colors.accentText }]}>
              {item.type.toUpperCase()}
            </Text>
          </View>

          <Text style={[styles.listSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.author || item.genres.slice(0, 2).join(' • ')}
          </Text>

          <View style={styles.listFooter}>
            <Text style={[styles.listChapter, { color: colors.textMuted }]}>
              {item.totalChapters ? `${item.totalChapters} chapters` : 'Ongoing'}
            </Text>

            {typeof item.lastReadProgress === 'number' && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceElevated }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${item.lastReadProgress}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.accentText }]}>
                  {item.lastReadProgress}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {!!item.unreadCount && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Grid layout
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={[
        styles.gridContainer,
        isSelected && { borderColor: colors.accent, borderWidth: 2, borderRadius: Radius.md },
      ]}
    >
      <View style={[styles.gridImageWrapper, { backgroundColor: colors.surfaceElevated }]}>
        <Image
          source={{ uri: item.coverUrl }}
          style={styles.gridCover}
          contentFit="cover"
          transition={200}
        />

        {/* Progress badge at bottom left of cover */}
        {typeof item.lastReadProgress === 'number' && (
          <View style={[styles.badgePill, { backgroundColor: 'rgba(18, 19, 24, 0.85)' }]}>
            <Text style={[styles.badgePillText, { color: colors.accentText }]}>
              {item.lastReadProgress}%
            </Text>
          </View>
        )}

        {/* Unread count badge at top right */}
        {!!item.unreadCount && (
          <View style={[styles.gridUnreadBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.gridUnreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.gridTitle, { color: colors.textPrimary }]} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid Styles
  gridContainer: {
    flex: 1,
    margin: 6,
    maxWidth: '33.333%',
  },
  gridImageWrapper: {
    aspectRatio: 2 / 3,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 16,
  },
  badgePill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gridUnreadBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  gridUnreadText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#121318',
  },

  // List Styles
  listContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  listCover: {
    width: 60,
    height: 84,
    borderRadius: Radius.sm,
  },
  listContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.sm,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  listTypeBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listSub: {
    fontSize: 12,
    marginTop: 2,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingRight: Spacing.sm,
  },
  listChapter: {
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBarTrack: {
    width: 60,
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginRight: Spacing.xs,
  },
  unreadBadgeText: {
    color: '#121318',
    fontWeight: '800',
    fontSize: 11,
  },
});
