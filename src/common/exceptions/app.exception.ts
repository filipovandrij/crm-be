import { HttpException, HttpStatus } from '@nestjs/common';

type AppExceptionPayload = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    const payload: AppExceptionPayload = { code, message };

    if (details && Object.keys(details).length > 0) {
      payload.details = details;
    }

    super(payload, status);
  }
}
