/**
 * Shared structured logger for server-side code.
 * Follows Fastify/pino pattern with JSON output.
 */

type LogData = Record<string, unknown>;

export const log = {
  info: (data: LogData, msg: string): void => {
    console.log(JSON.stringify({ level: 'info', ...data, msg }));
  },
  warn: (data: LogData, msg: string): void => {
    console.warn(JSON.stringify({ level: 'warn', ...data, msg }));
  },
  error: (data: LogData, msg: string): void => {
    console.error(JSON.stringify({ level: 'error', ...data, msg }));
  },
};
