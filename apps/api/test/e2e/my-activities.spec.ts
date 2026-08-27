import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/platform/database/prisma.service';

describe('my activities', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let cityId: string;
  let categoryId: string;
  const prefix = `my-activities-${Date.now()}`;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    cityId = (
      await prisma.city.findFirstOrThrow({ where: { isSupported: true } })
    ).id;
    categoryId = (
      await prisma.category.findFirstOrThrow({ where: { isActive: true } })
    ).id;
  });

  afterAll(async () => {
    await prisma.event.deleteMany({
      where: { organizer: { email: { startsWith: prefix } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  const register = async (name: string) => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: `${prefix}-${name}@example.com`,
        password: 'safe-test-password',
        birthDate: '1990-01-10',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/v1/me')
      .set('Authorization', `Bearer ${response.body.sessionToken as string}`)
      .send({ displayName: name, cityId, categoryIds: [categoryId] })
      .expect(200);
    return {
      token: response.body.sessionToken as string,
      userId: response.body.user.id as string,
    };
  };

  const create = async (
    token: string,
    title: string,
    mode: 'automatic' | 'approval_required' = 'automatic',
  ) =>
    request(app.getHttpServer())
      .post('/v1/events')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        title,
        categoryId,
        cityId,
        description: 'Описание для проверки списка моих активностей.',
        meetingPlace: 'У городского парка',
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        capacity: 4,
        participationMode: mode,
      })
      .expect(201);

  it('groups created events and applications without exposing private profile fields', async () => {
    const organizer = await register('Организатор');
    const applicant = await register('Заявитель');
    const created = await create(
      organizer.token,
      'С подтверждением',
      'approval_required',
    );
    const eventId = String(created.body.id);
    const me = await request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(me.body).toMatchObject({ createdEventsCount: 1 });

    await request(app.getHttpServer())
      .put(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${applicant.token}`)
      .expect(200);

    const own = await request(app.getHttpServer())
      .get('/v1/me/activities?scope=organizing')
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(own.body.items).toEqual(expect.arrayContaining([expect.anything()]));
    expect(own.body).toMatchObject({
      totalCount: 1,
      pendingIncomingApplicationsCount: 1,
    });
    const ownActivity = (own.body.items as Array<Record<string, unknown>>).find(
      (item) => item.id === eventId,
    );
    expect(ownActivity).toMatchObject({
      pendingApplicationsCount: 1,
      isOrganizer: true,
      availableActions: ['edit', 'cancel', 'reviewApplications'],
    });

    const organizerPlans = await request(app.getHttpServer())
      .get('/v1/me/activities?scope=plans')
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(organizerPlans.body).toMatchObject({ totalCount: 0 });
    expect(organizerPlans.body.items).toHaveLength(0);

    const applications = await request(app.getHttpServer())
      .get('/v1/me/applications')
      .set('Authorization', `Bearer ${applicant.token}`)
      .expect(200);
    const applicationActivity = (
      applications.body.items as Array<Record<string, unknown>>
    ).find((item) => item.id === eventId);
    expect(applicationActivity).toMatchObject({
      myParticipation: { status: 'pending' },
      isOrganizer: false,
      hasEventUpdates: false,
    });
    expect(applications.body).toMatchObject({
      totalCount: 1,
      pendingOutgoingApplicationsCount: 1,
      pendingIncomingApplicationsCount: 0,
    });
    expect(JSON.stringify(applications.body)).not.toContain('birthDate');

    const plansWhilePending = await request(app.getHttpServer())
      .get('/v1/me/activities?scope=plans')
      .set('Authorization', `Bearer ${applicant.token}`)
      .expect(200);
    expect(plansWhilePending.body.items).toHaveLength(0);
    expect(plansWhilePending.body.pendingOutgoingApplicationsCount).toBe(1);

    const repeatedApplications = await request(app.getHttpServer())
      .get('/v1/me/applications')
      .set('Authorization', `Bearer ${applicant.token}`)
      .expect(200);
    expect(repeatedApplications.body).toEqual(applications.body);

    await request(app.getHttpServer())
      .delete(`/v1/events/${eventId}/participation`)
      .set('Authorization', `Bearer ${applicant.token}`)
      .expect(200);

    const archive = await request(app.getHttpServer())
      .get('/v1/me/activities?scope=archive')
      .set('Authorization', `Bearer ${applicant.token}`)
      .expect(200);
    expect(archive.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: eventId,
          myParticipation: expect.objectContaining({ status: 'withdrawn' }),
        }),
      ]),
    );

    const organizerPlansArchive = await request(app.getHttpServer())
      .get('/v1/me/activities?scope=archive')
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(organizerPlansArchive.body.items).toHaveLength(0);

    await request(app.getHttpServer())
      .post(`/v1/events/${eventId}/cancel`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .set('Idempotency-Key', randomUUID())
      .expect(200);

    const organizerArchive = await request(app.getHttpServer())
      .get('/v1/me/activities?scope=organizing_archive')
      .set('Authorization', `Bearer ${organizer.token}`)
      .expect(200);
    expect(organizerArchive.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: eventId, isOrganizer: true }),
      ]),
    );
  });

  it('requires authentication for plan and pending application scopes', async () => {
    await request(app.getHttpServer()).get('/v1/me/activities').expect(401);
    await request(app.getHttpServer()).get('/v1/me/applications').expect(401);
  });
});
