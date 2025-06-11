import type { DataFunctionArgs } from '@remix-run/node';
import type { ZodError } from 'zod';

import { customLog } from './logger';

export function logParseError(request: DataFunctionArgs['request'], zodError: ZodError, providedData: any) {
  customLog('info', 'Failed to parse input', {
    method: request.method,
    url: request.url,
    errors: zodError,
    data: providedData,
  });
}

export function logActionData(request: DataFunctionArgs['request'], data: any) {
  customLog('info', 'Received action data', {
    method: request.method,
    url: request.url,
    data,
  });
}

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';
export function customServerLog(level: LogLevel, message: string, meta: Record<string, any>, request: DataFunctionArgs['request']) {
  customLog(level, message, {
    ...meta,
    method: request.method,
    url: request.url,
  });
}
