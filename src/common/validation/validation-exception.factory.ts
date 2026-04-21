import { HttpStatus, ValidationError } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';

export function validationExceptionFactory(errors: ValidationError[]) {
  const details = flattenValidationErrors(errors);

  return new AppException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    'Validation failed',
    details,
  );
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath?: string,
  details: Record<string, string> = {},
) {
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      details[path] = Object.values(error.constraints)[0];
    }

    if (error.children?.length) {
      flattenValidationErrors(error.children, path, details);
    }
  }

  return details;
}
