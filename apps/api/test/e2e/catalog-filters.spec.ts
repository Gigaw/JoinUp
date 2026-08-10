import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

type EventListBody = {
  items: Array<{ id: string }>;
  nextCursor: string | null;
};

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
      where: { isSupported: true, slug: 'kazan' },
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

  it('searches Russian text across event content and category, with cursor pagination', async () => {
    const city = await prisma.city.findFirstOrThrow({
      where: { isSupported: true, slug: 'kazan' },
    });
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'organizer@example.com', password: 'organizer-password' })
      .expect(200);
    const token = login.body.sessionToken as string;

    const titleMatch = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, q: '  ВОЛЕЙБОЛ  ' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(titleMatch.body.items).toHaveLength(1);
    expect(titleMatch.body.items[0].title).toBe('Волейбол вечером');

    const inflectedWordMatch = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, q: 'набережная' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      inflectedWordMatch.body.items.map(
        (item: { title: string }) => item.title,
      ),
    ).toEqual(
      expect.arrayContaining(['Прогулка по набережной', 'Бег по набережной']),
    );

    const descriptionMatch = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, q: 'уровень подготовки' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(descriptionMatch.body.items[0].title).toBe('Волейбол вечером');

    const meetingPlaceMatch = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, q: 'Оазис' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meetingPlaceMatch.body.items[0].title).toBe('Настольные игры');

    const categoryMatch = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, q: 'спорт' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(categoryMatch.body.items.length).toBeGreaterThan(0);
    expect(
      categoryMatch.body.items.every(
        (item: { category: { name: string } }) =>
          item.category.name === 'Спорт',
      ),
    ).toBe(true);

    const walks = await prisma.category.findUniqueOrThrow({
      where: { slug: 'walks' },
      select: { id: true },
    });
    const incompatibleFilters = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, categoryIds: walks.id, q: 'волейбол' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(incompatibleFilters.body.items).toEqual([]);

    const firstPage = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, limit: 2 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const firstPageBody = firstPage.body as EventListBody;
    expect(firstPageBody.items).toHaveLength(2);
    expect(firstPageBody.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(app.getHttpServer())
      .get('/v1/events')
      .query({
        cityId: city.id,
        limit: 2,
        cursor: firstPageBody.nextCursor,
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const secondPageBody = secondPage.body as EventListBody;
    expect(secondPageBody.items).toHaveLength(2);
    const firstPageIds = firstPageBody.items.map((item) => item.id);
    const secondPageIds = secondPageBody.items.map((item) => item.id);
    expect(secondPageIds.some((id: string) => firstPageIds.includes(id))).toBe(
      false,
    );

    const mismatchedCursor = await request(app.getHttpServer())
      .get('/v1/events')
      .query({
        cityId: city.id,
        q: 'волейбол',
        cursor: firstPageBody.nextCursor,
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(mismatchedCursor.body.code).toBe('INVALID_CURSOR');

    const malformedCursor = await request(app.getHttpServer())
      .get('/v1/events')
      .query({ cityId: city.id, cursor: 'not-a-cursor' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(malformedCursor.body.code).toBe('INVALID_CURSOR');
  });
});
