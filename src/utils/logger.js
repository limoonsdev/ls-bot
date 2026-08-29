/**
 * =====================================================
 * STRUCTURED LOGGING SERVICE - DREAMSHOP
 * =====================================================
 * Provides centralized logging with console output (stdout/stderr)
 * and file transports for Docker, Coolify, and local development.
 */

const fs = require('fs');
const path = require('path');

/**
 * Log levels with numeric values for filtering
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Color codes for console output
 */
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m'
};

/**
 * Logger class
 */
class Logger {
  constructor(options = {}) {
    this.logLevel = LOG_LEVELS[options.level?.toUpperCase() || 'INFO'] ?? LOG_LEVELS.INFO;
    this.isDev = options.isDev !== false;
    this.logsDir = options.logsDir || path.join(process.cwd(), 'logs');
    this.maxFileSize = options.maxFileSize || 10485760; // 10MB
    
    // Create logs directory if it doesn't exist
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (e) {
      // Silently continue if read-only filesystem
    }
  }

  /**
   * Format timestamp for logs
   */
  formatTimestamp() {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Get color for log level
   */
  getColorForLevel(level) {
    switch (level) {
    case 'ERROR': return COLORS.RED;
    case 'WARN': return COLORS.YELLOW;
    case 'INFO': return COLORS.BLUE;
    case 'DEBUG': return COLORS.CYAN;
    default: return COLORS.RESET;
    }
  }

  /**
   * Format log message
   */
  formatMessage(level, module, message, data) {
    const timestamp = this.formatTimestamp();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${module}]${dataStr} ${message}`;
  }

  /**
   * Write to console (Always active for Docker/Coolify stdout)
   */
  writeConsole(level, module, message, data) {
    const color = this.getColorForLevel(level);
    const formatted = this.formatMessage(level, module, message, data);
    
    if (level === 'ERROR') {
      console.error(`${color}${formatted}${COLORS.RESET}`);
    } else if (level === 'WARN') {
      console.warn(`${color}${formatted}${COLORS.RESET}`);
    } else {
      console.log(`${color}${formatted}${COLORS.RESET}`);
    }
  }

  /**
   * Write to file
   */
  writeFile(level, module, message, data) {
    try {
      const timestamp = this.formatTimestamp();
      const filename = `${timestamp.split('T')[0]}.log`;
      const filepath = path.join(this.logsDir, filename);
      const formatted = this.formatMessage(level, module, message, data);

      fs.appendFileSync(filepath, formatted + '\n');

      // Check file size and rotate if needed
      const stats = fs.statSync(filepath);
      if (stats.size > this.maxFileSize) {
        const backup = filepath.replace('.log', `-${Date.now()}.log`);
        fs.renameSync(filepath, backup);
      }
    } catch (error) {
      // Ignore file write errors in containers
    }
  }

  /**
   * Log with given level
   */
  log(level, module, message, data = null) {
    if (LOG_LEVELS[level] > this.logLevel) return;

    this.writeConsole(level, module, message, data);
    this.writeFile(level, module, message, data);
  }

  /**
   * Log error
   */
  error(module, message, data = null) {
    this.log('ERROR', module, message, data);
  }

  /**
   * Log warning
   */
  warn(module, message, data = null) {
    this.log('WARN', module, message, data);
  }

  /**
   * Log info
   */
  info(module, message, data = null) {
    this.log('INFO', module, message, data);
  }

  /**
   * Log debug
   */
  debug(module, message, data = null) {
    if (!this.isDev && this.logLevel < LOG_LEVELS.DEBUG) return;
    this.log('DEBUG', module, message, data);
  }
}

// Create singleton instance
let loggerInstance = null;

/**
 * Initialize logger
 */
function initLogger(options = {}) {
  loggerInstance = new Logger(options);
  return loggerInstance;
}

/**
 * Get logger instance
 */
function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

module.exports = {
  Logger,
  initLogger,
  getLogger,
  LOG_LEVELS
};
