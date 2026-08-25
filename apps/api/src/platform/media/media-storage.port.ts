export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_MEDIA_DIMENSION = 4096;
export const NORMALIZED_MEDIA_CONTENT_TYPE = 'image/webp' as const;

export type MediaUpload = {
  data: Buffer;
  mimeType: string;
};

export type StoredMedia = {
  key: string;
  contentType: typeof NORMALIZED_MEDIA_CONTENT_TYPE;
};

export type ReadMedia = {
  data: Buffer;
  contentType: typeof NORMALIZED_MEDIA_CONTENT_TYPE;
};

export interface MediaStorage {
  store(upload: MediaUpload): Promise<StoredMedia>;
  read(key: string): Promise<ReadMedia>;
  remove(key: string): Promise<void>;
}
