
// Fix: Use named export for Dexie to ensure proper type resolution for the base class and its methods.
import { Dexie, type Table } from 'https://esm.sh/dexie@4.0.10';
import { AnalysisResult } from '../types';

export class DeepShieldDatabase extends Dexie {
  reports!: Table<AnalysisResult & { thumbnail?: string }>;

  constructor() {
    super('deepshield_db');
    // Fix: Using version() to define database schema version and store configurations.
    this.version(1).stores({
      reports: '++id, timestamp, fileName, classification, fileHash' // Primary key and indexes
    });
  }
}

export const db = new DeepShieldDatabase();

export const dbService = {
  async saveReport(result: AnalysisResult, thumbnail?: string) {
    return await db.reports.add({ ...result, thumbnail });
  },

  async getAllReports() {
    return await db.reports.orderBy('timestamp').reverse().toArray();
  },

  async getReportCount() {
    return await db.reports.count();
  },

  async deleteReport(id: string) {
    // Note: Our id in AnalysisResult is a string like "DS-XXXX", 
    // but Dexie uses the auto-increment id or we can filter by the DS string.
    const record = await db.reports.where('id').equals(id).first();
    if (record && (record as any).id) {
      return await db.reports.delete((record as any).id);
    }
  },

  async purgeDatabase() {
    return await db.reports.clear();
  },

  async getDatabaseSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usage: 0, quota: 0 };
  }
};
