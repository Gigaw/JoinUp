import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const ids = {
  city: 'c5e1b60d-1730-44dc-9171-38c8f445476d',
  organizer: '4f564fb0-20c2-4fa7-b553-f1f3da3ee0ae',
  categories: {
    sport: 'd3ad02c2-508d-4cee-ae45-ac640c589ad6',
    walks: '2d4f1c57-4c9c-4f31-9fb2-0ca28e9bcbd4',
    games: '8b6c6c5a-2af1-42b4-bbd8-a1b5f65a2e91',
    culture: 'f0d9ab7b-2b6f-4fc4-8ea3-6cd604f84d72',
    music: '9eac5f19-8f8d-46fb-9d5c-3dbb0f78a241',
    social: '6b43e8f0-3d13-40e8-8d1b-1f1f3c915ec2',
    languages: '5fa4d3b2-a2f2-47c6-bc89-4d4bd77a5b0f',
    other: '1c8e76f2-7f6b-4b6b-a3a6-2de3f7ec9f03',
  },
  events: {
    sport: '5b61f5a6-bc32-4f7f-bb51-24cebd154a39',
    walks: '2c2fb7a0-56e5-4cf1-9a70-e7cddf2fb7a1',
    games: 'd7ed1d58-7e96-48cb-8c82-7edbcf2a8b42',
    culture: 'a64b4a73-8c20-4a70-9440-31bb176aa53d',
    music: 'e03d59ac-5981-4d1e-bc0c-83a2fbf66f70',
    social: '6e1a9e7d-8bc4-4a53-a7c8-2d4f4a0a0c16',
    languages: 'f64e6d0b-b2e7-4bb8-9d16-0c9fc3e77af9',
    other: 'c33f1d8e-df0b-47a4-9ae2-3c2b4d1ce5a7',
  },
  participations: {
    sport: '91a64511-12c4-46a2-a8fd-cd66862a4365',
    walks: 'd4a88d0d-8e59-4b94-b8c0-45f7f06db7b1',
    games: '8a9c3b4e-c9d8-4d5f-82b1-1f4a6e7b8c90',
    culture: 'b7e2c9f4-3a8d-4e1b-95c6-0d7f2a4b6c8e',
    music: '4e6f8a1c-2b3d-4f5a-9c7e-0b1d3f5a7c9e',
    social: '9d2c4b6a-8e1f-4a3c-b5d7-0f2e4c6a8b1d',
    languages: '7c5e3a1f-9b8d-4f6c-a2e4-0d7b5c3a1f9e',
    other: '3f7b1d5a-9c2e-4a6f-b8d0-1e3c5a7f9b2d',
  },
};

const categoryDefinitions = [
  { slug: 'sport', name: 'Спорт', sortOrder: 10 },
  { slug: 'walks', name: 'Прогулки', sortOrder: 20 },
  { slug: 'games', name: 'Игры', sortOrder: 30 },
  { slug: 'culture', name: 'Кино и культура', sortOrder: 40 },
  { slug: 'music', name: 'Музыка', sortOrder: 50 },
  { slug: 'social', name: 'Общение', sortOrder: 60 },
  { slug: 'languages', name: 'Языковые встречи', sortOrder: 70 },
  { slug: 'other', name: 'Другое', sortOrder: 80 },
] as const;

const eventDefinitions = [
  {
    key: 'sport',
    categorySlug: 'sport',
    title: 'Волейбол вечером',
    description: 'Собираемся на дружескую игру, уровень подготовки не важен.',
    meetingPlace: 'Площадка у центрального парка',
    daysFromNow: 7,
    startsAtHourUtc: 16,
    durationHours: 2,
    capacity: 8,
  },
  {
    key: 'walks',
    categorySlug: 'walks',
    title: 'Прогулка по набережной',
    description: 'Спокойно пройдёмся по набережной и познакомимся.',
    meetingPlace: 'Вход в парк у Кремля',
    daysFromNow: 2,
    startsAtHourUtc: 10,
    durationHours: 2,
    capacity: 10,
  },
  {
    key: 'games',
    categorySlug: 'games',
    title: 'Настольные игры',
    description: 'Сыграем в несколько настольных игр, опыт не требуется.',
    meetingPlace: 'Антикафе «Оазис»',
    daysFromNow: 3,
    startsAtHourUtc: 16,
    durationHours: 3,
    capacity: 8,
  },
  {
    key: 'culture',
    categorySlug: 'culture',
    title: 'Вечер кино',
    description: 'Выберем фильм вместе и обсудим его после просмотра.',
    meetingPlace: 'Кинотеатр в центре',
    daysFromNow: 4,
    startsAtHourUtc: 17,
    durationHours: 3,
    capacity: 6,
  },
  {
    key: 'music',
    categorySlug: 'music',
    title: 'Живая музыка',
    description: 'Послушаем местную группу и пообщаемся после концерта.',
    meetingPlace: 'Музыкальный бар «Ритм»',
    daysFromNow: 5,
    startsAtHourUtc: 15,
    durationHours: 3,
    capacity: 10,
  },
  {
    key: 'social',
    categorySlug: 'social',
    title: 'Кофе и новые знакомства',
    description: 'Неформальная встреча для тех, кто хочет познакомиться.',
    meetingPlace: 'Кофейня на Баумана',
    daysFromNow: 6,
    startsAtHourUtc: 12,
    durationHours: 2,
    capacity: 8,
  },
  {
    key: 'languages',
    categorySlug: 'languages',
    title: 'Разговорный английский',
    description: 'Поговорим на английском в дружеской компании.',
    meetingPlace: 'Библиотека имени Лобачевского',
    daysFromNow: 8,
    startsAtHourUtc: 16,
    durationHours: 2,
    capacity: 8,
  },
  {
    key: 'other',
    categorySlug: 'other',
    title: 'Идеи для выходных',
    description: 'Соберёмся и вместе придумаем, чем заняться в выходные.',
    meetingPlace: 'Коворкинг «Точка»',
    daysFromNow: 10,
    startsAtHourUtc: 11,
    durationHours: 2,
    capacity: 12,
  },
] as const;

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
  const categories = new Map<string, { id: string }>();
  for (const definition of categoryDefinitions) {
    const category = await prisma.category.upsert({
      where: { id: ids.categories[definition.slug] },
      update: {
        name: definition.name,
        isActive: true,
        sortOrder: definition.sortOrder,
      },
      create: {
        id: ids.categories[definition.slug],
        slug: definition.slug,
        name: definition.name,
        sortOrder: definition.sortOrder,
      },
    });
    categories.set(definition.slug, category);
  }
  const organizer = await prisma.user.upsert({
    where: { id: ids.organizer },
    update: { cityId: city.id, onboardingCompletedAt: new Date() },
    create: {
      id: ids.organizer,
      email: 'organizer@example.com',
      emailNormalized: 'organizer@example.com',
      passwordHash: await hash('organizer-password', { type: 2 }),
      birthDate: new Date('1995-04-12T00:00:00.000Z'),
      displayName: 'Мария',
      cityId: city.id,
      onboardingCompletedAt: new Date(),
    },
  });
  for (const definition of eventDefinitions) {
    const category = categories.get(definition.categorySlug);
    if (!category)
      throw new Error(`Unknown category: ${definition.categorySlug}`);

    const startsAt = new Date(
      Date.now() + definition.daysFromNow * 24 * 60 * 60 * 1000,
    );
    startsAt.setUTCHours(definition.startsAtHourUtc, 0, 0, 0);
    const endsAt = new Date(
      startsAt.getTime() + definition.durationHours * 60 * 60 * 1000,
    );
    const event = await prisma.event.upsert({
      where: { id: ids.events[definition.key] },
      update: {
        categoryId: category.id,
        title: definition.title,
        description: definition.description,
        meetingPlace: definition.meetingPlace,
        startsAt,
        endsAt,
        capacity: definition.capacity,
        participationMode: 'automatic',
        status: 'published',
      },
      create: {
        id: ids.events[definition.key],
        organizerId: organizer.id,
        cityId: city.id,
        categoryId: category.id,
        title: definition.title,
        description: definition.description,
        meetingPlace: definition.meetingPlace,
        startsAt,
        endsAt,
        capacity: definition.capacity,
        participationMode: 'automatic',
      },
    });
    await prisma.eventParticipation.upsert({
      where: {
        eventId_userId: { eventId: event.id, userId: organizer.id },
      },
      update: { status: 'going', seenEventVersion: event.contentVersion },
      create: {
        id: ids.participations[definition.key],
        eventId: event.id,
        userId: organizer.id,
        status: 'going',
        seenEventVersion: event.contentVersion,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
