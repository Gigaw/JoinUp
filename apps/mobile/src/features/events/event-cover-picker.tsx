import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  colors,
  radius,
  spacing,
  touchTarget,
} from '../../shared/theme/tokens';

const MAX_PREPARED_DIMENSION = 2048;

export type EventCoverImage = {
  fileName: string;
  mimeType: 'image/jpeg';
  uri: string;
};

export function EventCoverPicker({
  onChange,
  value,
}: {
  onChange: (image: EventCoverImage | null) => void;
  value: EventCoverImage | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const prepareAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset.width || !asset.height) {
        setError('Не удалось определить размеры изображения.');
        return;
      }
      setPreparing(true);
      setError(null);
      try {
        const scale = Math.min(
          1,
          MAX_PREPARED_DIMENSION / Math.max(asset.width, asset.height),
        );
        const result = await manipulateAsync(
          asset.uri,
          [
            {
              resize: {
                width: Math.max(1, Math.round(asset.width * scale)),
                height: Math.max(1, Math.round(asset.height * scale)),
              },
            },
          ],
          { compress: 0.82, format: SaveFormat.JPEG },
        );
        onChange({
          uri: result.uri,
          mimeType: 'image/jpeg',
          fileName: 'event-cover.jpg',
        });
      } catch {
        setError('Не удалось подготовить изображение. Попробуйте другое.');
      } finally {
        setPreparing(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    let active = true;
    void ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (!active || !result || !isPickerSuccess(result)) {
          return;
        }
        const asset = result.assets[0];
        if (asset) void prepareAsset(asset);
      })
      .catch(() => {
        if (active) {
          setError('Не удалось восстановить выбранное изображение.');
        }
      });
    return () => {
      active = false;
    };
  }, [prepareAsset]);

  const pick = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Доступ к фото не разрешён. Можно продолжить без обложки.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    await prepareAsset(result.assets[0]);
  };

  return (
    <View style={styles.container}>
      {value ? (
        <>
          <Image
            accessibilityLabel="Выбранная обложка активности"
            source={{ uri: value.uri }}
            style={styles.preview}
            testID="event-image-preview"
          />
          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="Заменить изображение"
              accessibilityRole="button"
              disabled={preparing}
              onPress={() => void pick()}
              style={({ pressed }) => [
                styles.button,
                preparing && styles.buttonDisabled,
                pressed && !preparing && styles.pressed,
              ]}
              testID="event-image-picker"
            >
              {preparing ? <ActivityIndicator color={colors.surface} /> : null}
              <Text style={styles.buttonText}>
                {preparing ? 'Подготавливаем…' : 'Заменить изображение'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Убрать обложку"
              accessibilityRole="button"
              disabled={preparing}
              onPress={() => onChange(null)}
              style={({ pressed }) => [
                styles.removeButton,
                preparing && styles.buttonDisabled,
                pressed && !preparing && styles.pressed,
              ]}
              testID="event-image-remove"
            >
              <Text style={styles.removeText}>Убрать</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable
          accessibilityLabel="Добавить обложку"
          accessibilityRole="button"
          disabled={preparing}
          onPress={() => void pick()}
          style={({ pressed }) => [
            styles.emptyAction,
            preparing && styles.buttonDisabled,
            pressed && !preparing && styles.pressed,
          ]}
          testID="event-image-picker"
        >
          {preparing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons
              accessible={false}
              color={colors.primary}
              name="image-outline"
              size={24}
            />
          )}
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>
              {preparing ? 'Подготавливаем…' : 'Добавить обложку'}
            </Text>
            <Text style={styles.hint}>Необязательно</Text>
          </View>
          <Ionicons
            accessible={false}
            color={colors.primary}
            name="add-circle-outline"
            size={24}
          />
        </Pressable>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function isPickerSuccess(
  result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult,
): result is ImagePicker.ImagePickerSuccessResult {
  return 'canceled' in result && !result.canceled;
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  preview: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.small,
    height: 180,
    width: '100%',
  },
  emptyAction: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radius.small,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    padding: spacing.md,
  },
  emptyCopy: { flex: 1, gap: 2 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textMuted, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.small,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.65 },
  pressed: { opacity: 0.78 },
  buttonText: { color: colors.surface, fontWeight: '700' },
  removeButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
  },
  removeText: { color: colors.text, fontWeight: '700' },
  error: { color: colors.danger },
});
