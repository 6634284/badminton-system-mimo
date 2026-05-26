import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class AppException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, statusCode);
    this.errorCode = errorCode;
  }
}

export class BadRequestException extends AppException {
  constructor(message = '参数错误') {
    super(ErrorCode.PARAM_ERROR, message, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = '未授权') {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = '无权限') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundException extends AppException {
  constructor(message = '资源不存在') {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictException extends AppException {
  constructor(message = '状态冲突') {
    super(ErrorCode.STATUS_CONFLICT, message, HttpStatus.CONFLICT);
  }
}

export class RateLimitedException extends AppException {
  constructor(message = '请求过于频繁') {
    super(ErrorCode.RATE_LIMITED, message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class OutOfSeatsException extends AppException {
  constructor(message = '名额已满') {
    super(ErrorCode.OUT_OF_SEATS, message, HttpStatus.CONFLICT);
  }
}

export class InsufficientBalanceException extends AppException {
  constructor(message = '余额不足') {
    super(ErrorCode.INSUFFICIENT_BALANCE, message, HttpStatus.PAYMENT_REQUIRED);
  }
}

export class DuplicateRegistrationException extends AppException {
  constructor(message = '重复报名') {
    super(ErrorCode.DUPLICATE_REGISTRATION, message, HttpStatus.CONFLICT);
  }
}
