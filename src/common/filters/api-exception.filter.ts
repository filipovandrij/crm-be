import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const { status, body } = this.normalizeException(exception);
    response.status(status).json(body);
  }

  private normalizeException(exception: unknown): {
    status: number;
    body: ErrorBody;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (this.isAppPayload(response)) {
        return {
          status,
          body: {
            error: response,
          },
        };
      }

      if (typeof response === 'string') {
        return {
          status,
          body: {
            error: {
              code: this.codeFromStatus(status),
              message: response,
            },
          },
        };
      }

      if (this.isRecord(response)) {
        const message = Array.isArray(response.message)
          ? response.message.join(', ')
          : typeof response.message === 'string'
            ? response.message
            : this.defaultMessageForStatus(status);

        const details =
          this.isRecord(response.details) && Object.keys(response.details).length > 0
            ? response.details
            : undefined;

        return {
          status,
          body: {
            error: {
              code: this.codeFromStatus(status),
              message,
              ...(details ? { details } : {}),
            },
          },
        };
      }

      return {
        status,
        body: {
          error: {
            code: this.codeFromStatus(status),
            message: this.defaultMessageForStatus(status),
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
    };
  }

  private codeFromStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_ERROR';
    }
  }

  private defaultMessageForStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Resource not found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Internal server error';
    }
  }

  private isAppPayload(value: unknown): value is {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    return (
      this.isRecord(value) &&
      typeof value.code === 'string' &&
      typeof value.message === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
}
