import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bookmark, Check, ChevronRight, Globe, Link2, Sparkles, X } from 'lucide-react-native';
import { MangaRepository } from '../../db/repositories/mangaRepository';
import { PRESET_TEST_URLS, ResolvedMangaResult, UrlResolver } from '../../services/urlResolver';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

interface AddByUrlModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (mangaId: string) => void;
}

export function AddByUrlModal({ visible, onClose, onSuccess }: AddByUrlModalProps) {
  const { colors } = useAppTheme();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedMangaResult | null>(null);
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(false);

  const handleClear = () => {
    setUrlInput('');
    setError(null);
    setResolved(null);
    setIsSavedToLibrary(false);
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setUrlInput(text.trim());
        setError(null);
      }
    } catch {
      // Ignore clipboard error
    }
  };

  const handleSelectPreset = (url: string) => {
    setUrlInput(url);
    setError(null);
    handleFetch(url);
  };

  const handleFetch = async (targetUrl?: string) => {
    const url = (targetUrl ?? urlInput).trim();
    if (!url) {
      setError('Please enter or paste a manga URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResolved(null);
    setIsSavedToLibrary(false);

    try {
      const result = await UrlResolver.resolve(url);
      setResolved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch manga from URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!resolved) return;
    try {
      await MangaRepository.upsert({
        ...resolved.item,
        inLibrary: true,
      });
      setIsSavedToLibrary(true);
      if (onSuccess) {
        onSuccess(resolved.item.sourceId);
      }
    } catch (err) {
      setError('Failed to save to library');
      console.warn(err);
    }
  };

  const handleOpenDetails = () => {
    if (!resolved) return;
    onClose();
    router.push(`/manga/${resolved.item.sourceId}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Link2 size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Get Manga by URL</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  Paste any MangaDex link to inspect chapters
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceElevated }]}>
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
            {/* Input & Paste Row */}
            <View style={[styles.inputContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="https://mangadex.org/title/..."
                placeholderTextColor={colors.textMuted}
                value={urlInput}
                onChangeText={(text) => {
                  setUrlInput(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {urlInput.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.inlineButton}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handlePaste} style={[styles.pasteButton, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pasteButtonText, { color: colors.accent }]}>Paste</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsSection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QUICK TEST PRESETS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                {PRESET_TEST_URLS.map((preset) => (
                  <TouchableOpacity
                    key={preset.title}
                    style={[styles.presetChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}
                    onPress={() => handleSelectPreset(preset.url)}
                    disabled={loading}
                  >
                    <Sparkles size={12} color={colors.accent} />
                    <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>{preset.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Fetch Button */}
            <TouchableOpacity
              style={[
                styles.fetchButton,
                { backgroundColor: colors.accent },
                loading && styles.buttonDisabled,
              ]}
              onPress={() => handleFetch()}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#121318" />
                  <Text style={styles.fetchButtonTextDark}>Resolving Manga & Chapters...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Globe size={18} color="#121318" />
                  <Text style={styles.fetchButtonTextDark}>Fetch Manga Details</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorCard, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30' }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Resolved Preview Card */}
            {resolved && (
              <View style={[styles.previewCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
                <View style={styles.previewTopRow}>
                  <Image
                    source={{ uri: resolved.item.coverUrl }}
                    style={styles.previewCover}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.previewInfo}>
                    <View style={styles.previewBadgeRow}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.accent + '25' }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.accent }]}>
                          {resolved.item.status.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>
                          {resolved.item.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {resolved.item.title}
                    </Text>

                    {resolved.item.author && (
                      <Text style={[styles.previewAuthor, { color: colors.textSecondary }]}>
                        By {resolved.item.author}
                      </Text>
                    )}

                    <View style={styles.chaptersCountBadge}>
                      <Text style={[styles.chaptersCountText, { color: colors.accent }]}>
                        ✓ {resolved.chapters.length} Chapters Available
                      </Text>
                    </View>
                  </View>
                </View>

                {resolved.item.description ? (
                  <Text style={[styles.previewDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                    {resolved.item.description}
                  </Text>
                ) : null}

                {/* Actions */}
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButtonSecondary,
                      {
                        backgroundColor: isSavedToLibrary ? colors.accent + '25' : colors.surface,
                        borderColor: isSavedToLibrary ? colors.accent : colors.surfaceBorder,
                      },
                    ]}
                    onPress={handleSaveToLibrary}
                    activeOpacity={0.8}
                  >
                    {isSavedToLibrary ? (
                      <>
                        <Check size={16} color={colors.accent} />
                        <Text style={[styles.actionButtonSecondaryText, { color: colors.accent }]}>
                          Saved to Library
                        </Text>
                      </>
                    ) : (
                      <>
                        <Bookmark size={16} color={colors.textPrimary} />
                        <Text style={[styles.actionButtonSecondaryText, { color: colors.textPrimary }]}>
                          Add to Library
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButtonPrimary, { backgroundColor: colors.accent }]}
                    onPress={handleOpenDetails}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonPrimaryText}>Open & Read</Text>
                    <ChevronRight size={16} color="#121318" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '88%',
    paddingBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  inlineButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  pasteButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  pasteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsSection: {
    marginTop: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fetchButton: {
    marginTop: Spacing.md,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fetchButtonTextDark: {
    color: '#121318',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 12,
    lineHeight: 18,
  },
  previewCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  previewTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  previewCover: {
    width: 80,
    height: 115,
    borderRadius: Radius.sm,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  previewAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  chaptersCountBadge: {
    marginTop: 6,
  },
  chaptersCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: Spacing.sm,
  },
  previewActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButtonSecondary: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonPrimary: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionButtonPrimaryText: {
    color: '#121318',
    fontSize: 12,
    fontWeight: '700',
  },
});
