/**
 * Unit tests for src/utils/logger.ts
 */

import { Logger, LogLevel, setLogLevel } from '@/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('Test');
    setLogLevel(LogLevel.DEBUG);
  });

  describe('formatMessage', () => {
    it('prepends prefix to messages', () => {
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      logger.debug('hello');
      expect(spy).toHaveBeenCalledWith('[Test] hello');
      spy.mockRestore();
    });
  });

  describe('log levels', () => {
    it('outputs debug when level is DEBUG', () => {
      setLogLevel(LogLevel.DEBUG);
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      logger.debug('debug msg');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('outputs info when level is INFO', () => {
      setLogLevel(LogLevel.INFO);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('info msg');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('outputs warn when level is WARN', () => {
      setLogLevel(LogLevel.WARN);
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('warn msg');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('outputs error when level is ERROR', () => {
      setLogLevel(LogLevel.ERROR);
      const spy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('error msg');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('skips debug when level is INFO', () => {
      setLogLevel(LogLevel.INFO);
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      logger.debug('debug msg');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('skips info when level is WARN', () => {
      setLogLevel(LogLevel.WARN);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('info msg');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('skips warn when level is ERROR', () => {
      setLogLevel(LogLevel.ERROR);
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('warn msg');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('error with Error object', () => {
    it('includes error message and stack when Error is passed', () => {
      setLogLevel(LogLevel.ERROR);
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const err = new Error('test error');
      logger.error('failed', err);
      expect(spy).toHaveBeenCalledWith('[Test] failed', {
        error: 'test error',
        stack: expect.any(String),
      });
      spy.mockRestore();
    });

    it('accepts optional data object', () => {
      setLogLevel(LogLevel.ERROR);
      const spy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('failed', undefined, { userId: '123' });
      expect(spy).toHaveBeenCalledWith('[Test] failed', { userId: '123' });
      spy.mockRestore();
    });
  });

  describe('log with data object', () => {
    it('passes data to console for debug', () => {
      setLogLevel(LogLevel.DEBUG);
      const spy = jest.spyOn(console, 'debug').mockImplementation();
      logger.debug('msg', { key: 'value' });
      expect(spy).toHaveBeenCalledWith('[Test] msg', { key: 'value' });
      spy.mockRestore();
    });
  });
});

describe('setLogLevel', () => {
  it('changes global log level', () => {
    const logger = new Logger('Test');
    setLogLevel(LogLevel.ERROR);
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
    logger.debug('should not log');
    expect(debugSpy).not.toHaveBeenCalled();

    setLogLevel(LogLevel.DEBUG);
    logger.debug('should log');
    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();
  });
});
