import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalMediaStorage } from './local-media-storage';

describe('LocalMediaStorage', () => {
  const originalMediaRoot = process.env.MEDIA_ROOT;
  let mediaRoot: string;

  beforeEach(() => {
    mediaRoot = join(tmpdir(), `vmeste-media-unit-${randomUUID()}`);
    process.env.MEDIA_ROOT = mediaRoot;
  });

  afterEach(async () => {
    await rm(mediaRoot, { recursive: true, force: true });
    if (originalMediaRoot === undefined) delete process.env.MEDIA_ROOT;
    else process.env.MEDIA_ROOT = originalMediaRoot;
  });

  it('validates the declared type and normalizes image bytes to WebP', async () => {
    const storage = new LocalMediaStorage();
    const input = await sharp({
      create: {
        width: 24,
        height: 16,
        channels: 3,
        background: '#2d6cdf',
      },
    })
      .png()
      .toBuffer();

    await expect(
      storage.store({ data: input, mimeType: 'image/jpeg' }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });

    const stored = await storage.store({ data: input, mimeType: 'image/png' });
    expect(stored.key).toMatch(/^[0-9a-f-]+\.webp$/);
    const read = await storage.read(stored.key);
    expect(read.contentType).toBe('image/webp');
    await expect(sharp(read.data).metadata()).resolves.toMatchObject({
      format: 'webp',
      width: 24,
      height: 16,
    });

    await expect(storage.read('../cover.webp')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});
