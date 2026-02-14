import Dexie from 'dexie';
import { dbLogger as logger } from '@/utils/logger';

/**
 * Singleton service for managing database instances.
 * Provides centralized database access and easy test injection.
 */
class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Dexie | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of DatabaseService
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database with a Dexie instance.
   * Call this once during app initialization.
   */
  setDatabase(database: Dexie): void {
    if (this.db && logger?.warn) {
      logger.warn('Database already initialized. Replacing with new instance.');
    }
    this.db = database;
    if (logger?.info) {
      logger.info('Database initialized via DatabaseService');
    }
  }

  /**
   * Get the current database instance.
   * Throws error if database not initialized.
   */
  getDatabase(): Dexie {
    if (!this.db) {
      throw new Error('Database not initialized. Call DatabaseService.getInstance().setDatabase() first.');
    }
    return this.db;
  }

  /**
   * Reset database instance (useful for testing)
   */
  reset(): void {
    this.db = null;
  }

  /**
   * Reset singleton instance (useful for testing)
   * This completely destroys the singleton and allows a fresh start
   */
  static resetInstance(): void {
    if (DatabaseService.instance) {
      DatabaseService.instance.db = null;
      DatabaseService.instance = null;
    }
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }
}

export default DatabaseService;
