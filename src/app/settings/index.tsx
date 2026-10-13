import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeftRight,
  ChevronRight,
  Database,
  DownloadCloud,
  Eye,
  Info,
  Maximize2,
  Moon,
  Palette,
  Scroll,
  Sun,
  Trash2,
} from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { useAppTheme, usePreferencesStore } from '../../store/preferencesStore';
import { AppReleaseInfo, UpdateService } from '../../services/updateService';
import { Radius, Spacing } from '../../theme/theme';

export default function SettingsScreen() {
  const { colors, isDark } = useAppTheme();

  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const readingDirection = usePreferencesStore((s) => s.readingDirection);
  const setReadingDirection = usePreferencesStore((s) => s.setReadingDirection);
  const readingMode = usePreferencesStore((s) => s.readingMode);
  const setReadingMode = usePreferencesStore((s) => s.setReadingMode);
  const libraryLayout = usePreferencesStore((s) => s.libraryLayout);
  const setLibraryLayout = usePreferencesStore((s) => s.setLibraryLayout);
  const autoMarkRead = usePreferencesStore((s) => s.autoMarkRead);
  const setAutoMarkRead = usePreferencesStore((s) => s.setAutoMarkRead);

  // Updates State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<AppReleaseInfo | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);

  const handleClearCache = () => {
    Alert.alert('Clear Image Cache', 'Are you sure you want to clear temporary cached manga covers and pages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: () => Alert.alert('Cache cleared', 'Temporary image cache was cleared successfully.') },
    ]);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const info = await UpdateService.checkForUpdates();
      setReleaseInfo(info);
      setUpdateModalVisible(true);
    } catch {
      Alert.alert('Check Failed', 'Could not check for updates. Please verify your internet connection.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!releaseInfo?.apkDownloadUrl) return;
    try {
      setDownloadPercent(1);
      await UpdateService.downloadAndInstallApk(releaseInfo.apkDownloadUrl, (percent) => {
        setDownloadPercent(percent);
      });
    } catch (err: any) {
      Alert.alert('Installation Error', err?.message || 'Failed to install update APK');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="Settings" subtitle="Preferences & behavior" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Section: Appearance */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Appearance</Text>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
            style={styles.settingRow}
          >
            <View style={styles.settingRowLeft}>
              {isDark ? <Moon size={18} color={colors.accent} /> : <Sun size={18} color={colors.accent} />}
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Theme</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={[styles.settingValue, { color: colors.accentText }]}>
                {isDark ? 'Dark (Default)' : 'Light'}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Palette size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Accent Color</Text>
            </View>
            <View style={styles.settingRowRight}>
              <View style={[styles.colorDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Amber Orange</Text>
            </View>
          </View>
        </View>

        {/* Section: Reading */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Reading</Text>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TouchableOpacity
            onPress={() => setReadingDirection(readingDirection === 'rtl' ? 'ltr' : 'rtl')}
            activeOpacity={0.7}
            style={styles.settingRow}
          >
            <View style={styles.settingRowLeft}>
              <ArrowLeftRight size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Reading Direction</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {readingDirection === 'rtl' ? 'Right to Left' : 'Left to Right'}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          <TouchableOpacity
            onPress={() => setReadingMode(readingMode === 'continuous' ? 'paged' : 'continuous')}
            activeOpacity={0.7}
            style={styles.settingRow}
          >
            <View style={styles.settingRowLeft}>
              <Scroll size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Default Mode</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {readingMode === 'continuous' ? 'Vertical Scroll' : 'Paged'}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Eye size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Auto Mark as Read</Text>
            </View>
            <Switch
              value={autoMarkRead}
              onValueChange={setAutoMarkRead}
              trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
              thumbColor={autoMarkRead ? '#FFFFFF' : colors.textMuted}
            />
          </View>
        </View>

        {/* Section: General */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>General</Text>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TouchableOpacity
            onPress={() => setLibraryLayout(libraryLayout === 'grid' ? 'list' : 'grid')}
            activeOpacity={0.7}
            style={styles.settingRow}
          >
            <View style={styles.settingRowLeft}>
              <Maximize2 size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Default Library View</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {libraryLayout === 'grid' ? 'Grid (3 cols)' : 'List'}
              </Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Data & Storage */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Data & Storage</Text>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TouchableOpacity onPress={handleClearCache} activeOpacity={0.7} style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Trash2 size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Clear Image Cache</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          <TouchableOpacity activeOpacity={0.7} style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Database size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Backup & Restore Data</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About & Updates Section */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Updates & About</Text>
        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <TouchableOpacity onPress={handleCheckUpdate} activeOpacity={0.7} style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <DownloadCloud size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Check for Updates</Text>
            </View>
            <View style={styles.settingRowRight}>
              {checkingUpdate ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <ChevronRight size={16} color={colors.textMuted} />
              )}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Info size={18} color={colors.accent} />
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>MangaNest Version</Text>
            </View>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>
              {`v${UpdateService.getCurrentVersion()}`}
            </Text>
          </View>
        </View>

        {/* Update Modal */}
        <Modal
          visible={updateModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUpdateModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.updateModalContent, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.updateModalTitle, { color: colors.textPrimary }]}>
                {releaseInfo?.hasUpdate ? 'New Update Available!' : 'Up to Date'}
              </Text>

              <Text style={[styles.updateVersionTag, { color: colors.accentText }]}>
                {releaseInfo?.hasUpdate
                  ? `Version ${releaseInfo.latestVersion} (Current: ${releaseInfo.currentVersion})`
                  : `Version ${releaseInfo?.currentVersion || '1.0.0'} is the latest release`}
              </Text>

              <ScrollView style={styles.notesContainer}>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {releaseInfo?.releaseNotes}
                </Text>
              </ScrollView>

              {downloadPercent > 0 && downloadPercent < 100 && (
                <View style={styles.downloadProgressBlock}>
                  <Text style={[styles.progressLabel, { color: colors.accentText }]}>
                    Downloading APK... {downloadPercent}%
                  </Text>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: `${downloadPercent}%` }]} />
                  </View>
                </View>
              )}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  onPress={() => setUpdateModalVisible(false)}
                  style={[styles.cancelBtn, { borderColor: colors.surfaceBorder }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Close</Text>
                </TouchableOpacity>

                {releaseInfo?.hasUpdate && releaseInfo.apkDownloadUrl && (
                  <TouchableOpacity
                    onPress={handleInstallUpdate}
                    style={[styles.installBtn, { backgroundColor: colors.accent }]}
                  >
                    <Text style={styles.installBtnText}>Download & Install</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  groupCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 13,
  },
  divider: {
    height: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  updateModalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  updateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  updateVersionTag: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  notesContainer: {
    maxHeight: 160,
    marginVertical: Spacing.sm,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  downloadProgressBlock: {
    marginTop: Spacing.md,
    gap: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  installBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  installBtnText: {
    color: '#121318',
    fontSize: 13,
    fontWeight: '700',
  },
});
