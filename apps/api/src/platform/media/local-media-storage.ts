import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { readMediaConfig, ensureMediaRoot } from '../config/app-config';
import { DomainError } from '../http/domain.error';
import {
  MAX_MEDIA_DIMENSION,
  MAX_MEDIA_FILE_SIZE,
  NORMALIZED_MEDIA_CONTENT_TYPE,
  type MediaStorage,
  type MediaUpload,
  type ReadMedia,
  type StoredMedia,
} from './media-storage.port';

const mediaKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
const detectedMimeTypes: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@Injectable()
export class LocalMediaStorage implements MediaStorage {
  async store(upload: MediaUpload): Promise<StoredMedia> {
    if (
      upload.data.byteLength === 0 ||
      upload.data.byteLength > MAX_MEDIA_FILE_SIZE
    ) {
      this.invalid('Размер изображения не должен превышать 5 MiB.');
    }

    const normalized = await this.normalize(upload);
    if (normalized.byteLength > MAX_MEDIA_FILE_SIZE) {
      this.invalid('Изображение слишком велико после обработки.');
    }

    const mediaRoot = await this.mediaRoot();
    const temporaryDirectory = join(mediaRoot, '.tmp');
    const key = `${randomUUID()}.webp`;
    const target = this.pathFor(mediaRoot, key);
    const temporary = join(temporaryDirectory, `${randomUUID()}.upload`);

    try {
      await writeFile(temporary, normalized, { flag: 'wx' });
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }

    return { key, contentType: NORMALIZED_MEDIA_CONTENT_TYPE };
  }

  async read(key: string): Promise<ReadMedia> {
    const mediaRoot = await this.mediaRoot();
    try {
      const data = await readFile(this.pathFor(mediaRoot, key));
      return { data, contentType: NORMALIZED_MEDIA_CONTENT_TYPE };
    } catch (error) {
      if (this.isMissingFile(error)) {
        throw new DomainError(
          404,
          'RESOURCE_NOT_FOUND',
          'Изображение не найдено.',
        );
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    const mediaRoot = await this.mediaRoot();
    try {
      await unlink(this.pathFor(mediaRoot, key));
    } catch (error) {
      if (!this.isMissingFile(error)) throw error;
    }
  }

  private async normalize(upload: MediaUpload): Promise<Buffer> {
    let metadata: Metadata;
    try {
      metadata = await sharp(upload.data, {
        animated: true,
        failOn: 'error',
        limitInputPixels: MAX_MEDIA_DIMENSION ** 2,
      }).metadata();
    } catch {
      this.invalid('Файл не является допустимым изображением.');
    }

    const actualMimeType = metadata.format
      ? detectedMimeTypes[metadata.format]
      : undefined;
    const declaredMimeType = upload.mimeType.toLowerCase().trim();
    if (!actualMimeType || actualMimeType !== declaredMimeType) {
      this.invalid('Тип файла не соответствует содержимому изображения.');
    }
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_MEDIA_DIMENSION ||
      metadata.height > MAX_MEDIA_DIMENSION ||
      (metadata.pages !== undefined && metadata.pages > 1)
    ) {
      this.invalid(
        'Изображение превышает допустимые размеры или содержит анимацию.',
      );
    }

    try {
      return await sharp(upload.data, {
        failOn: 'error',
        limitInputPixels: MAX_MEDIA_DIMENSION ** 2,
      })
        .rotate()
        .resize({
          width: MAX_MEDIA_DIMENSION,
          height: MAX_MEDIA_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      this.invalid('Не удалось обработать изображение.');
    }
  }

  private async mediaRoot(): Promise<string> {
    const { mediaRoot } = readMediaConfig();
    await ensureMediaRoot(mediaRoot);
    const temporaryDirectory = join(mediaRoot, '.tmp');
    await ensureMediaRoot(temporaryDirectory);
    return mediaRoot;
  }

  private pathFor(mediaRoot: string, key: string): string {
    if (!mediaKeyPattern.test(key)) {
      this.invalid('Некорректный идентификатор изображения.');
    }
    const path = resolve(mediaRoot, key);
    if (dirname(path) !== mediaRoot || basename(path) !== key) {
      this.invalid('Некорректный идентификатор изображения.');
    }
    return path;
  }

  private invalid(message: string): never {
    throw new DomainError(400, 'VALIDATION_ERROR', message);
  }

  private isMissingFile(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
