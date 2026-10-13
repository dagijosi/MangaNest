import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BookOpen,
  ChevronRight,
  Download,
  FolderOpen,
  Globe2,
  Moon,
  Settings as SettingsIcon,
  Sun,
} from 'lucide-react-native';
import { Header } from '../../components/common/Header';
import { useAppTheme, usePreferencesStore } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

export default function MoreScreen() {
  const { colors, isDark } = useAppTheme();
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  const menuItems = [
    {
      title: 'Sources',
      subtitle: 'Manage your content providers & extensions',
      icon: <Globe2 size={22} color={colors.accent} />,
      route: '/sources',
    },
    {
      title: 'Downloads',
      subtitle: 'Manage downloaded chapters & storage',
      icon: <Download size={22} color={colors.accent} />,
      route: '/downloads',
    },
    {
      title: 'Settings',
      subtitle: 'Reader preferences, themes & general settings',
      icon: <SettingsIcon size={22} color={colors.accent} />,
      route: '/settings',
    },
    {
      title: 'Local Files',
      subtitle: 'Access manga archives & folders from device',
      icon: <FolderOpen size={22} color={colors.accent} />,
      route: '/sources',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header title="More" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* MangaNest App Banner */}
        <View
          style={[
            styles.brandCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <View style={[styles.logoIconCircle, { backgroundColor: colors.accentSoft }]}>
            <BookOpen size={30} color={colors.accent} strokeWidth={2} />
          </View>
          <View style={styles.brandInfo}>
            <View style={styles.brandTitleRow}>
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>MangaNest</Text>
              <View style={[styles.versionBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.0.0</Text>
              </View>
            </View>
            <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>
              Your manga. Your sources. Your world.
            </Text>
          </View>
        </View>

        {/* Quick Theme Switcher Card */}
        <View
          style={[
            styles.themeCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <View style={styles.themeInfo}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Appearance</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
              {isDark ? 'Dark Theme (Default)' : 'Light Theme'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setThemeMode(isDark ? 'light' : 'dark')}
            activeOpacity={0.7}
            style={[styles.themeToggleButton, { backgroundColor: colors.surfaceElevated }]}
          >
            {isDark ? <Sun size={20} color={colors.accent} /> : <Moon size={20} color={colors.accent} />}
          </TouchableOpacity>
        </View>

        {/* Navigable Menu Sections */}
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
              style={[
                styles.menuItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceElevated }]}>
                {item.icon}
              </View>

              <View style={styles.menuTextWrapper}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>

              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* About & Info Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Local-first, privacy-respecting manga reader
          </Text>
        </View>
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
    paddingBottom: 32,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginVertical: Spacing.md,
  },
  logoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  brandTagline: {
    fontSize: 12,
    marginTop: 3,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  themeInfo: {
    flex: 1,
  },
  themeToggleButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuList: {
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrapper: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    fontSize: 12,
  },
});
