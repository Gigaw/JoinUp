export function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) {
    throw new Error('EXPO_PUBLIC_API_URL is required');
  }
  return value.replace(/\/$/, '');
}
