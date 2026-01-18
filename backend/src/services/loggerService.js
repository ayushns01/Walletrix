import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = path.join(__dirname, '../../logs');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

const transports = [];

transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  })
);

if (process.env.NODE_ENV !== 'test') {

  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: logFormat,
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: logFormat,
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxFiles: '7d',
      maxSize: '20m',
      format: logFormat,
    })
  );
}

const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

export function logRequest(req, res, responseTime) {
  const { method, originalUrl, ip, headers } = req;
  const userId = req.userId || req.user?.id || 'anonymous';
  const userAgent = headers['user-agent'] || 'unknown';

  logger.http('API Request', {
    method,
    url: originalUrl,
    userId,
    ip,
    userAgent,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
  });
}

export function logBlockchain(operation, network, data) {
  logger.info('Blockchain Operation', {
    operation,
    network,
    ...data,
  });
}

export function logWallet(operation, userId, data) {
  logger.info('Wallet Operation', {
    operation,
    userId,
    ...data,
  });
}

export function logTransaction(type, network, txHash, data) {
  logger.info('Transaction', {
    type,
    network,
    txHash,
    ...data,
  });
}

export function logAuth(event, userId, data = {}) {
  logger.info('Authentication', {
    event,
    userId,
    ...data,
  });
}

export function logSecurity(event, severity, data) {
  const logLevel = severity === 'critical' ? 'error' : 'warn';
  logger[logLevel]('Security Event', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

export function logDatabase(operation, table, data) {
  logger.debug('Database Operation', {
    operation,
    table,
    ...data,
  });
}

export function logExternalAPI(service, endpoint, data) {
  logger.debug('External API Call', {
    service,
    endpoint,
    ...data,
  });
}

export function logPerformance(operation, duration, data = {}) {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level]('Performance', {
    operation,
    duration: `${duration}ms`,
    ...data,
  });
}

export function logError(error, context = {}) {
  logger.error('Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    errorCode: error.errorCode,
    statusCode: error.statusCode,
    ...context,
  });
}

export function createChildLogger(metadata) {
  return logger.child(metadata);
}

export const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export default logger;
