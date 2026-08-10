import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppBottomSheet } from '../../../shared/ui/bottom-sheet';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';
import type { Category } from '../../categories/use-categories';

type FilterBottomSheetProps = {
  categories: Category[];
  error: Error | null;
  isLoading: boolean;
  isOpen: boolean;
  onApply: (categoryIds: string[]) => void;
  onClose: () => void;
  onRetry: () => void;
  selectedCategoryIds: string[];
};

export function FilterBottomSheet({
  categories,
  error,
  isLoading,
  isOpen,
  onApply,
  onClose,
  onRetry,
  selectedCategoryIds,
}: FilterBottomSheetProps) {
  const [draftCategoryIds, setDraftCategoryIds] =
    useState<string[]>(selectedCategoryIds);

  useEffect(() => {
    if (isOpen) setDraftCategoryIds(selectedCategoryIds);
  }, [isOpen, selectedCategoryIds]);

  const toggleCategory = (categoryId: string) => {
    setDraftCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  return (
    <AppBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      testID="filter-bottom-sheet"
    >
      <Text style={styles.title}>Фильтры</Text>
      <Text style={styles.subtitle}>
        Выберите одну или несколько категорий.
      </Text>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Загружаем категории…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error.message}</Text>
          <Pressable
            accessibilityLabel="Повторить загрузку категорий"
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      ) : categories.length > 0 ? (
        <View style={styles.options}>
          {categories.map((category) => {
            const selected = draftCategoryIds.includes(category.id);
            return (
              <Pressable
                accessibilityLabel={`Категория ${category.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={category.id}
                onPress={() => toggleCategory(category.id)}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
                testID={`filter-category-${category.slug}`}
              >
                <Ionicons
                  accessible={false}
                  color={selected ? colors.primary : colors.textMuted}
                  name="pricetag-outline"
                  size={21}
                />
                <Text style={styles.optionLabel}>{category.name}</Text>
                <Ionicons
                  accessible={false}
                  color={selected ? colors.primary : colors.textMuted}
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.state}>
          <Text style={styles.stateText}>Категорий пока нет.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Сбросить фильтры"
          accessibilityRole="button"
          accessibilityState={{ disabled: draftCategoryIds.length === 0 }}
          disabled={draftCategoryIds.length === 0}
          onPress={() => setDraftCategoryIds([])}
          style={({ pressed }) => [
            styles.resetButton,
            draftCategoryIds.length === 0 && styles.disabledButton,
            pressed && styles.pressed,
          ]}
          testID="filter-reset-button"
        >
          <Text style={styles.resetButtonText}>Сбросить</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Применить фильтры"
          accessibilityRole="button"
          onPress={() => onApply(draftCategoryIds)}
          style={({ pressed }) => [
            styles.applyButton,
            pressed && styles.pressed,
          ]}
          testID="filter-apply-button"
        >
          <Text style={styles.applyButtonText}>
            {draftCategoryIds.length > 0
              ? `Применить (${draftCategoryIds.length})`
              : 'Применить'}
          </Text>
        </Pressable>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, ...typography.sectionTitle },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  options: { gap: spacing.sm, marginTop: spacing.lg },
  option: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionLabel: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  state: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  stateText: { color: colors.textMuted, lineHeight: 20, textAlign: 'center' },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: { color: colors.surface, fontWeight: '800' },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  resetButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  resetButtonText: { color: colors.text, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  applyButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    flex: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  applyButtonText: { color: colors.surface, fontWeight: '800' },
});
