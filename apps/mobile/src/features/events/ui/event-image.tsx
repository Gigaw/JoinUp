import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import categoryGames from '../../../../assets/events/category-games.png';
import categorySport from '../../../../assets/events/category-sport.png';
import { getApiBaseUrl } from '../../../shared/api/config';
import { useSession } from '../../../shared/session/session-context';

const categoryImages: Record<string, number> = {
  games: categoryGames,
  'board-games': categoryGames,
  sport: categorySport,
};

type EventImageProps = {
  categorySlug: string;
  imageUrl?: string | null;
  style: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function EventImage({
  categorySlug,
  imageUrl,
  style,
  accessibilityLabel,
}: EventImageProps) {
  const { token } = useSession();
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackImage = getEventFallbackImage(categorySlug);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      defaultSource={fallbackImage}
      onError={() => setImageFailed(true)}
      source={
        imageUrl && !imageFailed
          ? {
              uri: resolveEventImageUrl(imageUrl),
              ...(token
                ? { headers: { Authorization: `Bearer ${token}` } }
                : {}),
            }
          : fallbackImage
      }
      style={style}
    />
  );
}

export function getEventFallbackImage(categorySlug: string): number {
  return categoryImages[categorySlug] ?? categoryImages.games;
}

function resolveEventImageUrl(imageUrl: string): string {
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${getApiBaseUrl()}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
