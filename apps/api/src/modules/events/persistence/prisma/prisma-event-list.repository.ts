import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import {
  type EventListFilters,
  type EventListPage,
  type EventListRepository,
  InvalidEventCursorError,
  normalizeEventSearchQuery,
} from '../../application/event-list.port';

type EventListRow = {
  id: string;
  starts_at: Date;
  rank: number;
};

type EventListSort = 'startsAt' | 'rank';

type EventListCursorScope = {
  version: 1;
  cityId: string;
  categoryIds: string[];
  q: string | null;
  sort: EventListSort;
};

type EventListCursor = {
  scope: EventListCursorScope;
  last: {
    id: string;
    startsAt: string;
    rank?: number;
  };
};

@Injectable()
export class PrismaEventListRepository implements EventListRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(filters: EventListFilters): Promise<EventListPage> {
    const categoryIds = [...new Set(filters.categoryIds)].sort();
    const q = normalizeEventSearchQuery(filters.q) ?? null;
    const scope: EventListCursorScope = {
      version: 1,
      cityId: filters.cityId,
      categoryIds,
      q,
      sort: q ? 'rank' : 'startsAt',
    };
    const cursor = this.decodeCursor(filters.cursor, scope);
    const rows = q
      ? await this.searchRows(
          filters.cityId,
          categoryIds,
          q,
          cursor,
          filters.limit,
        )
      : await this.timeRows(filters.cityId, categoryIds, cursor, filters.limit);
    const pageRows = rows.slice(0, filters.limit);
    const hasNextPage = rows.length > filters.limit;
    const lastRow = pageRows.at(-1);

    return {
      eventIds: pageRows.map((row) => row.id),
      nextCursor:
        hasNextPage && lastRow
          ? this.encodeCursor(scope, {
              id: lastRow.id,
              startsAt: this.toDate(lastRow.starts_at).toISOString(),
              ...(q ? { rank: lastRow.rank } : {}),
            })
          : null,
    };
  }

  private async timeRows(
    cityId: string,
    categoryIds: string[],
    cursor: EventListCursor['last'] | undefined,
    limit: number,
  ): Promise<EventListRow[]> {
    const categoryFilter = this.categoryFilter(categoryIds);
    const cursorFilter = cursor
      ? Prisma.sql`
          AND (
            e.starts_at > ${this.toDate(cursor.startsAt)}
            OR (
              e.starts_at = ${this.toDate(cursor.startsAt)}
              AND e.id > ${cursor.id}::uuid
            )
          )
        `
      : Prisma.empty;

    return this.prisma.$queryRaw<EventListRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.starts_at,
        0::double precision AS rank
      FROM events AS e
      WHERE e.city_id = ${cityId}::uuid
        AND e.status = 'published'
        AND e.starts_at > CURRENT_TIMESTAMP
        ${categoryFilter}
        ${cursorFilter}
      ORDER BY e.starts_at ASC, e.id ASC
      LIMIT CAST(${limit + 1} AS INTEGER)
    `);
  }

  private async searchRows(
    cityId: string,
    categoryIds: string[],
    q: string,
    cursor: EventListCursor['last'] | undefined,
    limit: number,
  ): Promise<EventListRow[]> {
    const categoryFilter = this.categoryFilter(categoryIds);
    const eventVector = Prisma.sql`(
      setweight(to_tsvector('russian', coalesce(e.title, '')), 'A') ||
      setweight(to_tsvector('russian', coalesce(e.description, '')), 'B') ||
      setweight(to_tsvector('russian', coalesce(e.meeting_place, '')), 'B')
    )`;
    const categoryVector = Prisma.sql`(
      setweight(to_tsvector('russian', coalesce(c.name, '')), 'A')
    )`;
    const tsQuery = Prisma.sql`plainto_tsquery('russian', ${q})`;
    const rankExpression = Prisma.sql`(
      ts_rank_cd(${eventVector}, ${tsQuery}) +
      ts_rank_cd(${categoryVector}, ${tsQuery})
    )::double precision`;
    const cursorFilter = cursor
      ? Prisma.sql`
          WHERE
            ranked.rank < ${cursor.rank}
            OR (
              ranked.rank = ${cursor.rank}
              AND ranked.starts_at > ${this.toDate(cursor.startsAt)}
            )
            OR (
              ranked.rank = ${cursor.rank}
              AND ranked.starts_at = ${this.toDate(cursor.startsAt)}
              AND ranked.id > ${cursor.id}::uuid
            )
        `
      : Prisma.empty;
    const matchedEventIds = Prisma.sql`
      SELECT e.id
      FROM events AS e
      WHERE ${eventVector} @@ ${tsQuery}
      UNION
      SELECT e.id
      FROM events AS e
      INNER JOIN categories AS c ON c.id = e.category_id
      WHERE ${categoryVector} @@ ${tsQuery}
    `;

    return this.prisma.$queryRaw<EventListRow[]>(Prisma.sql`
      WITH matched_event_ids AS (
        ${matchedEventIds}
      ), ranked AS (
        SELECT
          e.id,
          e.starts_at,
          ${rankExpression} AS rank
        FROM events AS e
        INNER JOIN categories AS c ON c.id = e.category_id
        INNER JOIN matched_event_ids AS matched ON matched.id = e.id
        WHERE e.city_id = ${cityId}::uuid
          AND e.status = 'published'
          AND e.starts_at > CURRENT_TIMESTAMP
          ${categoryFilter}
      )
      SELECT ranked.id, ranked.starts_at, ranked.rank
      FROM ranked
      ${cursorFilter}
      ORDER BY ranked.rank DESC, ranked.starts_at ASC, ranked.id ASC
      LIMIT CAST(${limit + 1} AS INTEGER)
    `);
  }

  private categoryFilter(categoryIds: string[]): Prisma.Sql {
    if (categoryIds.length === 0) return Prisma.empty;
    return Prisma.sql`
      AND e.category_id IN (${Prisma.join(
        categoryIds.map((categoryId) => Prisma.sql`${categoryId}::uuid`),
      )})
    `;
  }

  private encodeCursor(
    scope: EventListCursorScope,
    last: EventListCursor['last'],
  ): string {
    const payload: EventListCursor = { scope, last };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodeCursor(
    value: string | undefined,
    expectedScope: EventListCursorScope,
  ): EventListCursor['last'] | undefined {
    if (!value) return undefined;

    try {
      const decoded = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as unknown;
      if (!this.isCursor(decoded)) throw new InvalidEventCursorError();
      if (JSON.stringify(decoded.scope) !== JSON.stringify(expectedScope)) {
        throw new InvalidEventCursorError();
      }
      const startsAt = this.toDate(decoded.last.startsAt);
      if (
        !this.isUuid(decoded.last.id) ||
        Number.isNaN(startsAt.getTime()) ||
        (expectedScope.sort === 'rank' &&
          (typeof decoded.last.rank !== 'number' ||
            !Number.isFinite(decoded.last.rank)))
      ) {
        throw new InvalidEventCursorError();
      }
      return {
        id: decoded.last.id,
        startsAt: startsAt.toISOString(),
        ...(expectedScope.sort === 'rank' ? { rank: decoded.last.rank } : {}),
      };
    } catch (error) {
      if (error instanceof InvalidEventCursorError) throw error;
      throw new InvalidEventCursorError();
    }
  }

  private isCursor(value: unknown): value is EventListCursor {
    if (!value || typeof value !== 'object') return false;
    const cursor = value as Partial<EventListCursor>;
    return Boolean(cursor.scope && cursor.last);
  }

  private toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
