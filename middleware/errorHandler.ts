import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  errors?: any;
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  let error: { message: string; statusCode: number } = {
    message: err.message || 'Server Error',
    statusCode: err.statusCode || 500
  };

  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((error: any) => error.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Rate limiting error
  if (err.name === 'TooManyRequestsError') {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.name
    })
  });
};

export default errorHandler;