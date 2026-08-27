import type { PrismaClient } from '@prisma/client';

export const catalogIds = {
  cities: {
    vladikavkaz: '85042e9d-c575-43b1-8ec5-239c07584ab7',
    beslan: 'efc1187b-1bc1-4dd7-9e57-b63af9abb071',
    mozdok: '134a8b19-e413-46ff-b28c-6792dd2dd5a6',
    alagir: 'ba158689-fd2f-47cf-b7fc-4e60f9b9d235',
    ardon: '5bb04513-11cf-48fd-9c1a-8789920d76cf',
    kazan: 'c5e1b60d-1730-44dc-9171-38c8f445476d',
  },
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
} as const;

export const cityDefinitions = [
  {
    id: catalogIds.cities.vladikavkaz,
    slug: 'vladikavkaz',
    name: 'Владикавказ',
    timeZone: 'Europe/Moscow',
    sortOrder: 10,
  },
  {
    id: catalogIds.cities.beslan,
    slug: 'beslan',
    name: 'Беслан',
    timeZone: 'Europe/Moscow',
    sortOrder: 20,
  },
  {
    id: catalogIds.cities.mozdok,
    slug: 'mozdok',
    name: 'Моздок',
    timeZone: 'Europe/Moscow',
    sortOrder: 30,
  },
  {
    id: catalogIds.cities.alagir,
    slug: 'alagir',
    name: 'Алагир',
    timeZone: 'Europe/Moscow',
    sortOrder: 40,
  },
  {
    id: catalogIds.cities.ardon,
    slug: 'ardon',
    name: 'Ардон',
    timeZone: 'Europe/Moscow',
    sortOrder: 50,
  },
  {
    id: catalogIds.cities.kazan,
    slug: 'kazan',
    name: 'Казань',
    timeZone: 'Europe/Moscow',
    sortOrder: 100,
  },
] as const;

export const categoryDefinitions = [
  {
    id: catalogIds.categories.sport,
    slug: 'sport',
    name: 'Спорт',
    sortOrder: 10,
  },
  {
    id: catalogIds.categories.walks,
    slug: 'walks',
    name: 'Прогулки',
    sortOrder: 20,
  },
  {
    id: catalogIds.categories.games,
    slug: 'games',
    name: 'Игры',
    sortOrder: 30,
  },
  {
    id: catalogIds.categories.culture,
    slug: 'culture',
    name: 'Кино и культура',
    sortOrder: 40,
  },
  {
    id: catalogIds.categories.music,
    slug: 'music',
    name: 'Музыка',
    sortOrder: 50,
  },
  {
    id: catalogIds.categories.social,
    slug: 'social',
    name: 'Общение',
    sortOrder: 60,
  },
  {
    id: catalogIds.categories.languages,
    slug: 'languages',
    name: 'Языковые встречи',
    sortOrder: 70,
  },
  {
    id: catalogIds.categories.other,
    slug: 'other',
    name: 'Другое',
    sortOrder: 80,
  },
] as const;

export async function seedCatalog(
  prisma: Pick<PrismaClient, 'city' | 'category'>,
): Promise<void> {
  for (const definition of cityDefinitions) {
    await prisma.city.upsert({
      where: { id: definition.id },
      update: {
        slug: definition.slug,
        name: definition.name,
        timeZone: definition.timeZone,
        isSupported: true,
        sortOrder: definition.sortOrder,
      },
      create: definition,
    });
  }

  for (const definition of categoryDefinitions) {
    await prisma.category.upsert({
      where: { id: definition.id },
      update: {
        slug: definition.slug,
        name: definition.name,
        isActive: true,
        sortOrder: definition.sortOrder,
      },
      create: definition,
    });
  }
}
