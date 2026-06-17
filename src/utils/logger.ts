import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'authorization',
      'token',
      'password',
      'APCA_API_KEY_ID',
      'APCA_API_SECRET_KEY',
      'ALPACA_BROKER_API_SECRET',
      'ALPACA_BROKER_API_KEY',
      'headers.authorization',
      'req.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  },
});
