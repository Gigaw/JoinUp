import { describe, expect, it } from 'vitest';
import { responseError, toAppError } from './error';

describe('API error mapping', () => {
  it('keeps the stable API code and safe message', () => {
    const body = { code: 'EVENT_FULL', message: 'Мест больше нет.' };
    expect(toAppError(responseError({ error: body }))).toMatchObject(body);
  });
});
