import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
        case 11000:
            Logger.error("Duplicate insertion, MongoDB", 'MongoExceptionFilter');
            response.status(HttpStatus.CONFLICT).json({
                statusCode: HttpStatus.CONFLICT,
                description: "Duplicate folder error"
            })
        break;
        default: 
            response.status(HttpStatus.NOT_ACCEPTABLE).json({
                statusCode: HttpStatus.NOT_ACCEPTABLE,
                exceptionCode: exception.code,
                description: "Unknown database error"
            })
        break;
    }
  }
}