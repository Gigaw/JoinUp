import { DomainError } from '../../../platform/http/domain.error';

export class AgePolicy {
  static assertAdult(birthDate: string, now = new Date()): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      throw new DomainError(
        400,
        'VALIDATION_ERROR',
        'Укажите корректную дату рождения.',
      );
    }

    const parsed = new Date(`${birthDate}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== birthDate
    ) {
      throw new DomainError(
        400,
        'VALIDATION_ERROR',
        'Укажите корректную дату рождения.',
      );
    }

    const threshold = new Date(
      Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()),
    );
    if (parsed > threshold) {
      throw new DomainError(
        422,
        'AGE_RESTRICTION',
        'Приложение доступно пользователям от 18 лет.',
      );
    }
    return parsed;
  }
}
