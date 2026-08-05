import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppError } from '../../shared/api/error';
import { createIdempotencyKey } from './idempotency-key';

const keyPrefix = 'vmeste.pending-mutation.';

export type PendingMutation = {
  operation: string;
  requestHash: string;
  idempotencyKey: string;
  payload: unknown;
};

export async function beginPendingMutation(
  operation: string,
  payload: unknown,
): Promise<PendingMutation> {
  const requestHash = stableStringify(payload);
  const storageKey = `${keyPrefix}${operation}`;
  const stored = parsePendingMutation(await AsyncStorage.getItem(storageKey));
  if (stored?.requestHash === requestHash) return stored;

  const mutation: PendingMutation = {
    operation,
    requestHash,
    idempotencyKey: createIdempotencyKey(),
    payload,
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(mutation));
  return mutation;
}

export async function getPendingMutation(
  operation: string,
): Promise<PendingMutation | null> {
  return parsePendingMutation(
    await AsyncStorage.getItem(`${keyPrefix}${operation}`),
  );
}

export async function completePendingMutation(
  operation: string,
  idempotencyKey: string,
): Promise<void> {
  const storageKey = `${keyPrefix}${operation}`;
  const stored = parsePendingMutation(await AsyncStorage.getItem(storageKey));
  if (stored?.idempotencyKey === idempotencyKey) {
    await AsyncStorage.removeItem(storageKey);
  }
}

export function shouldKeepPendingMutation(error: AppError): boolean {
  return [
    'NETWORK_ERROR',
    'INTERNAL_ERROR',
    'RATE_LIMITED',
    'IDEMPOTENCY_IN_PROGRESS',
  ].includes(error.code);
}

function parsePendingMutation(value: string | null): PendingMutation | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PendingMutation>;
    return typeof parsed.operation === 'string' &&
      typeof parsed.requestHash === 'string' &&
      typeof parsed.idempotencyKey === 'string' &&
      'payload' in parsed
      ? (parsed as PendingMutation)
      : null;
  } catch {
    return null;
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}
