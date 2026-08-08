import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import categoryGames from '../../../../assets/events/category-games.png';
import categorySport from '../../../../assets/events/category-sport.png';
import { getApiBaseUrl } from '../../../shared/api/config';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
} from '../../../shared/theme/tokens';
import {
  formatEventDate,
  getEventAccessibilityLabel,
  type EventSummary,
} from '../event-card-utils';

const categoryImages: Record<string, number> = {
  games: categoryGames,
  'board-games': categoryGames,
  sport: categorySport,
};

type EventCardProps = {
  event: EventSummary;
  children?: ReactNode;
  highlight?: boolean;
  onPress?: PressableProps['onPress'];
  testID?: string;
};

export function EventCard({
  event,
  children,
  highlight = false,
  onPress,
  testID,
}: EventCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackImage = getFallbackImage(event.category.slug);

  useEffect(() => {
    setImageFailed(false);
  }, [event.imageUrl]);

  const imageSource =
    event.imageUrl && !imageFailed
      ? { uri: resolveImageUrl(event.imageUrl) }
      : fallbackImage;

  return (
    <Pressable
      accessibilityHint="Открыть подробности активности"
      accessibilityLabel={getEventAccessibilityLabel(event)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlight && styles.highlighted,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Image
        accessible={false}
        defaultSource={fallbackImage}
        onError={() => setImageFailed(true)}
        source={imageSource}
        style={styles.thumbnail}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaIcon}>◷</Text>
            <Text style={styles.metaText}>
              {formatEventDate(event.startsAt, event.city.timeZone)}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.metaPill, styles.locationPill]}>
            <Text style={styles.metaIcon}>⌖</Text>
            <Text
              numberOfLines={2}
              style={[styles.metaText, styles.locationText]}
            >
              {event.meetingPlace}
            </Text>
          </View>
          <View
            style={[
              styles.metaPill,
              styles.occupancyPill,
              event.isFull && styles.fullPill,
            ]}
          >
            <ParticipantsIcon
              color={event.isFull ? colors.danger : colors.textMuted}
            />
            <Text style={[styles.metaText, event.isFull && styles.fullText]}>
              {event.participantsCount}/{event.capacity}
            </Text>
          </View>
        </View>
        {children ? <View style={styles.extra}>{children}</View> : null}
      </View>
    </Pressable>
  );
}

function getFallbackImage(categorySlug: string): number {
  return categoryImages[categorySlug] ?? categoryImages.games;
}

function resolveImageUrl(imageUrl: string): string {
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${getApiBaseUrl()}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

function ParticipantsIcon({ color }: { color: string }) {
  return (
    <View accessible={false} style={styles.participantsIcon}>
      <View
        style={[
          styles.personHead,
          styles.backPersonHead,
          { borderColor: color },
        ]}
      />
      <View
        style={[
          styles.personBody,
          styles.backPersonBody,
          { borderColor: color },
        ]}
      />
      <View style={[styles.personHead, { borderColor: color }]} />
      <View style={[styles.personBody, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  highlighted: { borderColor: colors.primary },
  pressed: { opacity: 0.78 },
  thumbnail: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.small,
    height: 84,
    width: 84,
  },
  content: { flex: 1, gap: spacing.sm, minWidth: 0 },
  title: { color: colors.text, ...typography.cardTitle },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: touchTarget - spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  locationPill: { flex: 1, minWidth: 0 },
  occupancyPill: { flexShrink: 0 },
  fullPill: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },
  metaIcon: { color: colors.textMuted, fontSize: 16, lineHeight: 18 },
  metaText: { color: colors.text, flexShrink: 0, fontSize: 13, lineHeight: 18 },
  locationText: { flex: 1, minWidth: 0 },
  fullText: { color: colors.danger },
  participantsIcon: { height: 18, position: 'relative', width: 20 },
  personHead: {
    borderRadius: 4,
    borderWidth: 1.5,
    height: 7,
    left: 2,
    position: 'absolute',
    top: 0,
    width: 7,
  },
  personBody: {
    borderRadius: 7,
    borderWidth: 1.5,
    bottom: 0,
    height: 8,
    left: 0,
    position: 'absolute',
    width: 12,
  },
  backPersonHead: { left: 11, top: 2 },
  backPersonBody: { left: 8, width: 12 },
  extra: { gap: spacing.sm, marginTop: spacing.xs },
});
