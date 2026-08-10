import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('catalog filters', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the seeded categories in display order', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/categories')
      .expect(200);

    expect(
      response.body.map((category: { slug: string }) => category.slug),
    ).toEqual([
      'sport',
      'walks',
      'games',
      'culture',
      'music',
      'social',
      'languages',
      'other',
    ]);
  });

  it('filters events by one or several categories', async () => {
    const city = await prisma.city.findFirstOrThrow({
      where: { isSupported: true },
    });
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'organizer@example.com', password: 'organizer-password' })
      .expect(200);
    const token = login.body.sessionToken as string;
    const categories = await prisma.category.findMany({
      where: { isActive: true, slug: { in: ['walks', 'games'] } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, slug: true },
    });
    const walks = categories.find((category) => category.slug === 'walks');
    const games = categories.find((category) => category.slug === 'games');
    expect(walks).toBeDefined();
    expect(games).toBeDefined();

    const oneCategory = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, categoryIds: walks!.id })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(oneCategory.body.items.length).toBeGreaterThan(0);
    expect(
      oneCategory.body.items.every(
        (item: { category: { id: string } }) => item.category.id === walks!.id,
      ),
    ).toBe(true);

    const severalCategories = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, categoryIds: `${walks!.id},${games!.id}` })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(severalCategories.body.items.length).toBeGreaterThanOrEqual(2);
    expect(
      severalCategories.body.items.every((item: { category: { id: string } }) =>
        [walks!.id, games!.id].includes(item.category.id),
      ),
    ).toBe(true);
  });
});
