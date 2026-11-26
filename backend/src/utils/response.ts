import { Response } from 'express';
import { ApiResponse } from '../types/api';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

