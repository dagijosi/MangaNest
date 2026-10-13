import { create } from 'zustand';
import { ColorPalette, DarkTheme, LightTheme, ThemeMode } from '../theme/theme';

export type LibraryLayout = 'grid' | 'list';
export type LibrarySort = 'recentlyRead' | 'title' | 'lastUpdated' | 'dateAdded';
export type ReadingDirection = 'ltr' | 'rtl' | 'vertical' | 'webtoon';
export type ReadingMode = 'continuous' | 'paged';
export type ImageScaling = 'fitWidth' | 'fitHeight' | 'fitBoth';

interface PreferencesState {
  themeMode: ThemeMode;
  libraryLayout: LibraryLayout;
  librarySort: LibrarySort;
  readingDirection: ReadingDirection;
  readingMode: ReadingMode;
  autoMarkRead: boolean;
  pageSpacing: number;
  imageScaling: ImageScaling;
  readerBackground: 'black' | 'dark' | 'white';

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setLibraryLayout: (layout: LibraryLayout) => void;
  setLibrarySort: (sort: LibrarySort) => void;
  setReadingDirection: (dir: ReadingDirection) => void;
  setReadingMode: (mode: ReadingMode) => void;
  setAutoMarkRead: (autoMark: boolean) => void;
  setPageSpacing: (spacing: number) => void;
  setImageScaling: (scaling: ImageScaling) => void;
  setReaderBackground: (bg: 'black' | 'dark' | 'white') => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  themeMode: 'dark',
  libraryLayout: 'grid',
  librarySort: 'recentlyRead',
  readingDirection: 'vertical',
  readingMode: 'continuous',
  autoMarkRead: true,
  pageSpacing: 4,
  imageScaling: 'fitWidth',
  readerBackground: 'black',

  setThemeMode: (themeMode) => set({ themeMode }),
  setLibraryLayout: (libraryLayout) => set({ libraryLayout }),
  setLibrarySort: (librarySort) => set({ librarySort }),
  setReadingDirection: (readingDirection) => set({ readingDirection }),
  setReadingMode: (readingMode) => set({ readingMode }),
  setAutoMarkRead: (autoMarkRead) => set({ autoMarkRead }),
  setPageSpacing: (pageSpacing) => set({ pageSpacing }),
  setImageScaling: (imageScaling) => set({ imageScaling }),
  setReaderBackground: (readerBackground) => set({ readerBackground }),
}));

export const useAppTheme = (): { colors: ColorPalette; isDark: boolean; themeMode: ThemeMode } => {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  // Default to dark per design requirements
  const isDark = themeMode === 'light' ? false : true;
  const colors = isDark ? DarkTheme : LightTheme;
  return { colors, isDark, themeMode };
};
