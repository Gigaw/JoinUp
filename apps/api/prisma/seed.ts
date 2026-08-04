import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const ids = {
  city: 'c5e1b60d-1730-44dc-9171-38c8f445476d',
  category: 'd3ad02c2-508d-4cee-ae45-ac640c589ad6',
  organizer: '4f564fb0-20c2-4fa7-b553-f1f3da3ee0ae',
  event: '5b61f5a6-bc32-4f7f-bb51-24cebd154a39',
  participation: '91a64511-12c4-46a2-a8fd-cd66862a4365',
};

async function main(): Promise<void> {
  const city = await prisma.city.upsert({
    where: { id: ids.city },
    update: { isSupported: true },
    create: {
      id: ids.city,
      slug: 'kazan',
      name: 'Казань',
      timeZone: 'Europe/Moscow',
      sortOrder: 10,
    },
  });
  const category = await prisma.category.upsert({
    where: { id: ids.category },
    update: { isActive: true },
    create: {
      id: ids.category,
      slug: 'sport',
      name: 'Спорт',
      sortOrder: 10,
    },
  });
  const organizer = await prisma.user.upsert({
    where: { id: ids.organizer },
    update: { cityId: city.id },
    create: {
      id: ids.organizer,
      email: 'organizer@example.com',
      passwordHash: await hash('organizer-password', { type: 2 }),
      birthDate: new Date('1995-04-12T00:00:00.000Z'),
      displayName: 'Мария',
      cityId: city.id,
      onboardingCompleted: true,
    },
  });
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  startsAt.setUTCHours(16, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
  const event = await prisma.event.upsert({
    where: { id: ids.event },
    update: { startsAt, endsAt, status: 'published' },
    create: {
      id: ids.event,
      organizerId: organizer.id,
      cityId: city.id,
      categoryId: category.id,
      title: 'Волейбол вечером',
      description: 'Собираемся на дружескую игру, уровень подготовки не важен.',
      meetingPlace: 'Площадка у центрального парка',
      startsAt,
      endsAt,
      capacity: 8,
      participationMode: 'automatic',
    },
  });
  await prisma.eventParticipation.upsert({
    where: {
      eventId_userId: { eventId: event.id, userId: organizer.id },
    },
    update: { status: 'going' },
    create: {
      id: ids.participation,
      eventId: event.id,
      userId: organizer.id,
      status: 'going',
      seenEventVersion: event.contentVersion,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
