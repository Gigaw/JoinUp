import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов').max(128),
});

export type LoginValues = z.infer<typeof loginSchema>;
