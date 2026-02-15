
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { AnalysisResult } from '../types';

// Forensic Evidence Database Engine
export class DeepShieldDatabase extends Dexie {
  reports!: Table<AnalysisResult & { thumbnail?: string }>;

  constructor() {
    super('deepshield_db');
    // Define the schema for our forensic reports
    // Fix: Using the correct Dexie versioning syntax within the constructor
    this.version(1).stores({
      reports: '++id, timestamp, fileName, classification, fileHash'
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
    // Some reports have internal 'id' from result, we match the database record
    const record = await db.reports.where('id').equals(id).first();
    if (record) {
      // In Dexie ++id creates an auto-incrementing primary key if not provided,
      // but we store our AnalysisResult.id in the 'id' property.
      const primaryKey = (record as any).id;
      return await db.reports.delete(primaryKey);
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
