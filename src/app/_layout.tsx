import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useAppTheme } from '../store/preferencesStore';
import { getDatabase } from '../db/database';

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
        await getDatabase();
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
