/**
 * lib/logger.ts
 * Production-safe logger that suppresses noisy console output in production builds.
 */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (!isProd) {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (!isProd) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (!isProd) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // In production, keep critical error reports or send to monitoring service
    if (!isProd) {
      console.error(...args);
    }
  },
};
