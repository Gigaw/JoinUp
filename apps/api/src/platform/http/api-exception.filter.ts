import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { DomainError } from './domain.error';
import type { RequestWithId } from './request-id.interceptor';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const reply = http.getResponse<FastifyReply>();

    if (error instanceof DomainError) {
      void reply.status(error.status).send({
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId: request.requestId,
      });
      return;
    }

    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      const details =
        typeof response === 'object' && response !== null
          ? response
          : undefined;
      void reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Проверьте введённые данные.',
        ...(details ? { details } : {}),
        requestId: request.requestId,
      });
      return;
    }

    if (error instanceof HttpException) {
      void reply.status(error.getStatus()).send({
        code: 'HTTP_ERROR',
        message: error.message,
        requestId: request.requestId,
      });
      return;
    }

    console.error(error);
    void reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Произошла внутренняя ошибка.',
      requestId: request.requestId,
    });
  }
}
