import { PrismaClient } from '@prisma/client';
import { seedCatalog } from './catalog';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await seedCatalog(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
