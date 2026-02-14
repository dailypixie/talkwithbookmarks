/**
 * Structured logger with severity levels and prefixes
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Global log level - can be changed for debugging
let globalLogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  globalLogLevel = level;
}

export class Logger {
  constructor(private prefix: string) {}

  private shouldLog(level: LogLevel): boolean {
    return level >= globalLogLevel;
  }

  private formatMessage(msg: string): string {
    return `[${this.prefix}] ${msg}`;
  }

  debug(msg: string, data?: object): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      if (data) {
        console.debug(this.formatMessage(msg), data);
      } else {
        console.debug(this.formatMessage(msg));
      }
    }
  }

  info(msg: string, data?: object): void {
    if (this.shouldLog(LogLevel.INFO)) {
      if (data) {
        console.log(this.formatMessage(msg), data);
      } else {
        console.log(this.formatMessage(msg));
      }
    }
  }

  warn(msg: string, data?: object): void {
    if (this.shouldLog(LogLevel.WARN)) {
      if (data) {
        console.warn(this.formatMessage(msg), data);
      } else {
        console.warn(this.formatMessage(msg));
      }
    }
  }

  error(msg: string, error?: Error, data?: object): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errInfo = error ? { error: error.message, stack: error.stack } : {};
      const combined = { ...errInfo, ...data };
      if (Object.keys(combined).length > 0) {
        console.error(this.formatMessage(msg), combined);
      } else {
        console.error(this.formatMessage(msg));
      }
    }
  }
}

// Pre-configured loggers for common modules
export const indexingLogger = new Logger('Indexing');
export const dbLogger = new Logger('Database');
export const backgroundLogger = new Logger('Background');
export const bookmarksLogger = new Logger('Bookmarks');
export const pipelineLogger = new Logger('Pipeline');
