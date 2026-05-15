export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

export function successResponse<T>(
  data: T,
  message = 'Operation successful',
): ApiResponse<T> {
  return {
    status: 'success',
    message,
    data,
  };
}

export function errorResponse(message: string): ApiResponse<null> {
  return {
    status: 'error',
    message,
  };
}
