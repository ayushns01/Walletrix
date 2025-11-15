/**
 * Monitoring and Metrics Middleware
 * Tracks API performance and system metrics
 */

import logger, { logRequest, logPerformance, logSecurity } from '../services/loggerService.js';

/**
 * Request tracking middleware
 * Logs all API requests with timing information
 */
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logRequest(req, res, responseTime);
    
    // Warn on slow requests
    if (responseTime > 1000) {
      logPerformance('Slow Request', responseTime, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
      });
    }
  });
  
  next();
}

/**
 * Performance tracking for specific operations
 */
export class PerformanceTracker {
  constructor(operation) {
    this.operation = operation;
    this.startTime = Date.now();
    this.checkpoints = [];
  }
  
  checkpoint(name) {
    const duration = Date.now() - this.startTime;
    this.checkpoints.push({ name, duration });
  }
  
  end(metadata = {}) {
    const duration = Date.now() - this.startTime;
    logPerformance(this.operation, duration, {
      checkpoints: this.checkpoints,
      ...metadata,
    });
    return duration;
  }
}

/**
 * Track API metrics
 */
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {},
    byMethod: {},
  },
  performance: {
    averageResponseTime: 0,
    slowestRequests: [],
  },
  errors: {
    total: 0,
    byType: {},
  },
};

/**
 * Metrics collection middleware
 */
export function metricsCollector(req, res, next) {
  const startTime = Date.now();
  
  // Increment total requests
  metrics.requests.total++;
  
  // Track by method
  metrics.requests.byMethod[req.method] = 
    (metrics.requests.byMethod[req.method] || 0) + 1;
  
  // Track by endpoint
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  metrics.requests.byEndpoint[endpoint] = 
    (metrics.requests.byEndpoint[endpoint] || 0) + 1;
  
  // Log on response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }
    
    // Update average response time
    metrics.performance.averageResponseTime = 
      (metrics.performance.averageResponseTime * (metrics.requests.total - 1) + responseTime) / 
      metrics.requests.total;
    
    // Track slowest requests (keep top 10)
    if (metrics.performance.slowestRequests.length < 10 || 
        responseTime > metrics.performance.slowestRequests[9]?.duration) {
      metrics.performance.slowestRequests.push({
        method: req.method,
        url: req.originalUrl,
        duration: responseTime,
        timestamp: new Date().toISOString(),
      });
      metrics.performance.slowestRequests.sort((a, b) => b.duration - a.duration);
      metrics.performance.slowestRequests = metrics.performance.slowestRequests.slice(0, 10);
    }
  });
  
  next();
}

/**
 * Get current metrics
 */
export function getMetrics() {
  return {
    ...metrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
  metrics.requests.total = 0;
  metrics.requests.successful = 0;
  metrics.requests.failed = 0;
  metrics.requests.byEndpoint = {};
  metrics.requests.byMethod = {};
  metrics.performance.averageResponseTime = 0;
  metrics.performance.slowestRequests = [];
  metrics.errors.total = 0;
  metrics.errors.byType = {};
}

/**
 * Log metrics summary (called periodically)
 */
export function logMetricsSummary() {
  const summary = getMetrics();
  
  logger.info('Metrics Summary', {
    totalRequests: summary.requests.total,
    successRate: ((summary.requests.successful / summary.requests.total) * 100).toFixed(2) + '%',
    averageResponseTime: summary.performance.averageResponseTime.toFixed(2) + 'ms',
    uptime: (summary.uptime / 3600).toFixed(2) + 'h',
    memoryUsage: (summary.memory.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
  });
}

/**
 * Security event tracking
 */
const securityEvents = {
  failedLogins: [],
  suspiciousActivity: [],
  rateLimitHits: [],
};

/**
 * Track security event
 */
export function trackSecurityEvent(type, data) {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };
  
  switch (type) {
    case 'failed_login':
      securityEvents.failedLogins.push(event);
      // Keep only last 100
      if (securityEvents.failedLogins.length > 100) {
        securityEvents.failedLogins.shift();
      }
      
      // Check for brute force
      const recentFailures = securityEvents.failedLogins.filter(
        e => e.ip === data.ip && 
        Date.now() - new Date(e.timestamp).getTime() < 300000 // 5 minutes
      );
      
      if (recentFailures.length >= 5) {
        logSecurity('Possible Brute Force Attack', 'critical', {
          ip: data.ip,
          attempts: recentFailures.length,
        });
      }
      break;
      
    case 'rate_limit':
      securityEvents.rateLimitHits.push(event);
      if (securityEvents.rateLimitHits.length > 100) {
        securityEvents.rateLimitHits.shift();
      }
      break;
      
    case 'suspicious':
      securityEvents.suspiciousActivity.push(event);
      if (securityEvents.suspiciousActivity.length > 100) {
        securityEvents.suspiciousActivity.shift();
      }
      logSecurity('Suspicious Activity Detected', 'high', data);
      break;
  }
}

/**
 * Get security events
 */
export function getSecurityEvents() {
  return securityEvents;
}

/**
 * Health check with detailed status
 */
export function getHealthStatus() {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      formatted: `${(uptime / 3600).toFixed(2)}h`,
    },
    memory: {
      heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      rss: (memory.rss / 1024 / 1024).toFixed(2) + ' MB',
    },
    metrics: {
      totalRequests: metrics.requests.total,
      successRate: metrics.requests.total > 0 
        ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%'
        : '0%',
      averageResponseTime: metrics.performance.averageResponseTime.toFixed(2) + 'ms',
    },
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Start periodic metrics logging
 */
export function startMetricsLogging(intervalMinutes = 60) {
  setInterval(() => {
    logMetricsSummary();
  }, intervalMinutes * 60 * 1000);
  
  logger.info('Metrics logging started', {
    interval: `${intervalMinutes} minutes`,
  });
}

export default {
  requestLogger,
  metricsCollector,
  PerformanceTracker,
  getMetrics,
  resetMetrics,
  logMetricsSummary,
  trackSecurityEvent,
  getSecurityEvents,
  getHealthStatus,
  startMetricsLogging,
};
