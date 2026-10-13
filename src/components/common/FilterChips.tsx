import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../store/preferencesStore';
import { Radius, Spacing } from '../../theme/theme';

interface FilterChipsProps<T extends string> {
  options: { label: string; value: T; count?: number }[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

export function FilterChips<T extends string>({ options, selectedValue, onSelect }: FilterChipsProps<T>) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((opt) => {
          const isSelected = opt.value === selectedValue;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                  borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#121318' : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {opt.label}
              </Text>
              {typeof opt.count === 'number' && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected ? 'rgba(0,0,0,0.15)' : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      { color: isSelected ? '#121318' : colors.textMuted },
                    ]}
                  >
                    {opt.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
