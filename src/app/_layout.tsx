import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useAppTheme } from '../store/preferencesStore';
import { MangaRepository } from '../db/repositories/mangaRepository';
import { HistoryRepository } from '../db/repositories/historyRepository';
import { MOCK_MANGA_LIST } from '../providers/mock/mockData';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    async function setupApp() {
      try {
        await MangaRepository.seedIfEmpty(MOCK_MANGA_LIST);
        // Seed initial history if empty
        const history = await HistoryRepository.getRecentHistory(1);
        if (history.length === 0) {
          await HistoryRepository.recordProgress('mock:solo-leveling', 'mock:solo-leveling:ch-200', 72, false);
          await HistoryRepository.recordProgress('mock:one-piece', 'mock:one-piece:ch-1114', 45, false);
          await HistoryRepository.recordProgress('mock:jujutsu-kaisen', 'mock:jujutsu-kaisen:ch-250', 30, false);
        }
      } catch (e) {
        console.warn('Failed to initialize database:', e);
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    setupApp();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="manga/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="reader/[chapterId]"
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen name="sources/index" options={{ headerShown: false }} />
          <Stack.Screen name="downloads/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
