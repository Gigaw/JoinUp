import { z } from 'zod';

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Укажите имя')
    .max(80, 'Не больше 80 символов'),
  cityId: z.uuid('Выберите город'),
  categoryIds: z.array(z.uuid()).min(1, 'Выберите хотя бы один интерес'),
  showAge: z.boolean(),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
