import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Укажите имя')
    .max(80, 'Не больше 80 символов'),
  bio: z.string().trim().max(500, 'Не больше 500 символов'),
  cityId: z.uuid('Выберите город'),
  categoryIds: z.array(z.uuid()).min(1, 'Выберите хотя бы один интерес'),
  showAge: z.boolean(),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export function profileValuesFromMe(me: {
  displayName?: string | null;
  bio?: string | null;
  city?: { id: string } | null;
  interests: { id: string }[];
  showAge: boolean;
}): ProfileValues {
  return {
    displayName: me.displayName ?? '',
    bio: me.bio ?? '',
    cityId: me.city?.id ?? '',
    categoryIds: me.interests.map((interest) => interest.id),
    showAge: me.showAge,
  };
}

export function profileRequestBody(values: ProfileValues) {
  return {
    ...values,
    bio: values.bio || null,
  };
}
