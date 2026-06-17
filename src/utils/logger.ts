import pino from 'pino';

// Base sensitive paths that should always be redacted
const baseRedactPaths = [
  'authorization',
  'token',
  'password',
  'headers.authorization',
  'req.headers.authorization',
];

// Dynamically scan environment variables for sensitive plugin keys at boot
const sensitiveEnvKeys = Object.keys(process.env).filter((key) => {
  const upperKey = key.toUpperCase();
  return upperKey.includes('SECRET') || 
         upperKey.includes('TOKEN') || 
         upperKey.includes('KEY') || 
         upperKey.includes('PASSWORD') ||
         upperKey.includes('AUTH');
});

// Combine defaults with dynamic keys
const redactPaths = [...new Set([...baseRedactPaths, ...sensitiveEnvKeys])];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactPaths,
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
