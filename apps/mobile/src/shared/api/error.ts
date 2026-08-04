export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toAppError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null) {
    const body = error as { code?: unknown; message?: unknown };
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return new AppError(body.code, body.message);
    }
  }
  return new AppError('NETWORK_ERROR', 'Не удалось связаться с сервером.');
}

export function responseError(response: unknown): unknown {
  if (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  ) {
    return response.error;
  }
  return undefined;
}
