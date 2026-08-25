import { Module } from '@nestjs/common';
import { LocalMediaStorage } from './local-media-storage';
import { MEDIA_STORAGE } from './media-storage.port';

@Module({
  providers: [
    LocalMediaStorage,
    { provide: MEDIA_STORAGE, useExisting: LocalMediaStorage },
  ],
  exports: [MEDIA_STORAGE],
})
export class MediaModule {}
