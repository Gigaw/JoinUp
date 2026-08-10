import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
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
import type { City } from '../use-cities';

type CityPickerSheetProps = {
  cities: City[];
  error: Error | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSelect: (cityId: string) => void;
  selectedCityId?: string;
};

export function CityPickerSheet({
  cities,
  error,
  isLoading,
  isOpen,
  onClose,
  onRetry,
  onSelect,
  selectedCityId,
}: CityPickerSheetProps) {
  return (
    <AppBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      testID="city-picker-sheet"
    >
      <Text style={styles.title}>Выберите город</Text>
      <Text style={styles.subtitle}>
        Город влияет только на список активностей в каталоге.
      </Text>

      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Загружаем города…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error.message}</Text>
          <Pressable
            accessibilityLabel="Повторить загрузку городов"
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      ) : cities.length > 0 ? (
        <FlatList
          data={cities}
          keyExtractor={(city) => city.id}
          renderItem={({ item: city }) => {
            const selected = city.id === selectedCityId;
            return (
              <Pressable
                accessibilityLabel={`Город ${city.name}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onSelect(city.id)}
                style={({ pressed }) => [
                  styles.cityOption,
                  selected && styles.cityOptionSelected,
                  pressed && styles.pressed,
                ]}
                testID={`city-option-${city.slug}`}
              >
                <Ionicons
                  accessible={false}
                  color={selected ? colors.primary : colors.textMuted}
                  name="location-outline"
                  size={22}
                />
                <Text style={styles.cityName}>{city.name}</Text>
                <Ionicons
                  accessible={false}
                  color={colors.primary}
                  name={
                    selected ? 'checkmark-circle' : 'checkmark-circle-outline'
                  }
                  size={22}
                />
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
          style={styles.cityList}
        />
      ) : (
        <View style={styles.state}>
          <Text style={styles.stateText}>Поддерживаемых городов пока нет.</Text>
        </View>
      )}
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
  cityList: { marginTop: spacing.lg },
  cityOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cityOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cityName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700' },
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
});
