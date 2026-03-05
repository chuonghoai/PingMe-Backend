/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    if (exceptionResponse && exceptionResponse.success === false && exceptionResponse.error) {
      return response.status(status).json(exceptionResponse);
    }

    const message = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message[0]
      : exceptionResponse.message || exception.message;

    response.status(status).json({
      success: false,
      error: {
        code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : 'SYSTEM_ERROR',
        message: message,
      },
    });
  }
}