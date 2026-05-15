// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Request, Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception.name === 'CastError' ||
          exception.name === 'ValidationError' ||
          exception.code === 'P2002' ||
          exception.code === 'P2003'
          ? 400
          : 500;

    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as
        | string
        | { message?: string | string[] };

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse.message) {
        message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message.join(', ')
          : exceptionResponse.message;
      }
    } else if (exception.code === 'P2002') {
      const field = exception.meta?.target || 'field';
      message = `Duplicate entry: User with this ${field} already exists`;
    } else if (exception.code === 'P2025') {
      message = exception.meta?.cause || 'Record not found';
      // status = 404; // Could optionally override status to 404 here
    } else if (exception.message?.includes('Expected Role')) {
      message = 'Invalid role value provided. Expected ADMIN or USER.';
    } else if (exception.name === 'CastError') {
      message = `Invalid format for field ${exception.path}: ${exception.value}`;
    } else if (exception.name === 'ValidationError') {
      message = Object.values(exception.errors)
        .map((err: any) => err.message)
        .join(', ');
    } else {
      // For other non-HttpExceptions, log the error
      this.logger.error('Unhandled Exception:', exception);
      Sentry.captureException(exception);

      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction
        ? 'Internal server error'
        : exception.message || 'An unexpected error occurred';
    }

    const reqAny = request as any;
    response.status(status).json({
      // Keep `status: 'error'` for backwards compatibility, but add `success: false`
      // to match the success envelope shape more closely.
      success: false,
      status: 'error',
      message: message,
      data: null,
      meta: {
        requestId: reqAny?.userContext?.requestId,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
