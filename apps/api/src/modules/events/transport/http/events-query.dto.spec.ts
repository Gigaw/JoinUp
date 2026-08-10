import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { EventsQueryDto } from './events-query.dto';

const cityId = '00000000-0000-4000-8000-000000000001';
const firstCategoryId = '00000000-0000-4000-8000-000000000002';
const secondCategoryId = '00000000-0000-4000-8000-000000000003';

describe('EventsQueryDto', () => {
  it('parses comma-separated and repeated category ids', () => {
    const query = plainToInstance(EventsQueryDto, {
      cityId,
      categoryIds: [` ${firstCategoryId},${secondCategoryId} `],
    });

    expect(query.categoryIds).toEqual([firstCategoryId, secondCategoryId]);
    expect(validateSync(query)).toEqual([]);
  });

  it('treats an empty category filter as no filter', () => {
    const query = plainToInstance(EventsQueryDto, {
      cityId,
      categoryIds: '',
    });

    expect(query.categoryIds).toBeUndefined();
    expect(validateSync(query)).toEqual([]);
  });

  it('normalizes whitespace in the full-text query', () => {
    const query = plainToInstance(EventsQueryDto, {
      cityId,
      q: '  настольные   игры  ',
    });

    expect(query.q).toBe('настольные игры');
    expect(validateSync(query)).toEqual([]);
  });

  it('treats an empty full-text query as no filter', () => {
    const query = plainToInstance(EventsQueryDto, {
      cityId,
      q: '   ',
    });

    expect(query.q).toBeUndefined();
    expect(validateSync(query)).toEqual([]);
  });

  it('rejects a full-text query longer than 100 characters', () => {
    const query = plainToInstance(EventsQueryDto, {
      cityId,
      q: 'а'.repeat(101),
    });

    expect(validateSync(query).map((error) => error.property)).toContain('q');
  });

  it('rejects duplicate or invalid category ids', () => {
    const query = plainToInstance(EventsQueryDto, {
      cityId,
      categoryIds: `${firstCategoryId},${firstCategoryId},not-a-uuid`,
    });

    expect(validateSync(query).map((error) => error.property)).toContain(
      'categoryIds',
    );
  });
});
