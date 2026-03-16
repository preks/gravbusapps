/**
 * Spreadsheet App Service
 *
 * Handles storage, retrieval, and management of spreadsheet apps.
 * Initially uses localStorage for file-based apps, with the ability
 * to promote to GraphQL entities.
 */

import type {
  SpreadsheetApp,
  SpreadsheetAppSummary,
  SpreadsheetAppStorage,
  SpreadsheetSheet,
  AppStatus
} from '../types'

const STORAGE_KEY = 'newwork_spreadsheet_apps'

/**
 * Service for managing spreadsheet apps
 */
export class SpreadsheetAppService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Get all spreadsheet apps for the current user
   */
  async getApps(): Promise<SpreadsheetAppSummary[]> {
    const storage = this.getStorage()
    return storage.apps.map(app => this.toSummary(app))
  }

  /**
   * Get a single app by ID
   */
  async getApp(id: string): Promise<SpreadsheetApp | null> {
    const storage = this.getStorage()
    return storage.apps.find(app => app.id === id) || null
  }

  /**
   * Create a new spreadsheet app
   */
  async createApp(app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpreadsheetApp> {
    const storage = this.getStorage()

    const newApp: SpreadsheetApp = {
      ...app,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    storage.apps.push(newApp)
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return newApp
  }

  /**
   * Update an existing app
   */
  async updateApp(id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp | null> {
    const storage = this.getStorage()
    const index = storage.apps.findIndex(app => app.id === id)

    if (index === -1) {
      return null
    }

    const updatedApp: SpreadsheetApp = {
      ...storage.apps[index],
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString()
    }

    storage.apps[index] = updatedApp
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return updatedApp
  }

  /**
   * Delete an app
   */
  async deleteApp(id: string): Promise<boolean> {
    const storage = this.getStorage()
    const index = storage.apps.findIndex(app => app.id === id)

    if (index === -1) {
      return false
    }

    storage.apps.splice(index, 1)
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return true
  }

  /**
   * Update sheet data within an app
   */
  async updateSheetData(
    appId: string,
    sheetId: string,
    data: Record<string, unknown>[]
  ): Promise<SpreadsheetSheet | null> {
    const storage = this.getStorage()
    const app = storage.apps.find(a => a.id === appId)

    if (!app) {
      return null
    }

    const sheet = app.sheets.find(s => s.id === sheetId)
    if (!sheet) {
      return null
    }

    sheet.data = data
    app.updatedAt = new Date().toISOString()
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return sheet
  }

  /**
   * Add a row to a sheet
   */
  async addRow(appId: string, sheetId: string, row: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const storage = this.getStorage()
    const app = storage.apps.find(a => a.id === appId)

    if (!app) {
      return null
    }

    const sheet = app.sheets.find(s => s.id === sheetId)
    if (!sheet) {
      return null
    }

    const newRow = {
      ...row,
      _id: this.generateId(),
      _createdAt: new Date().toISOString()
    }

    sheet.data.push(newRow)
    app.updatedAt = new Date().toISOString()
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return newRow
  }

  /**
   * Update a row in a sheet
   */
  async updateRow(
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const storage = this.getStorage()
    const app = storage.apps.find(a => a.id === appId)

    if (!app) {
      return null
    }

    const sheet = app.sheets.find(s => s.id === sheetId)
    if (!sheet) {
      return null
    }

    const rowIndex = sheet.data.findIndex(r => r._id === rowId)
    if (rowIndex === -1) {
      return null
    }

    const updatedRow = {
      ...sheet.data[rowIndex],
      ...updates,
      _id: rowId, // Preserve ID
      _updatedAt: new Date().toISOString()
    }

    sheet.data[rowIndex] = updatedRow
    app.updatedAt = new Date().toISOString()
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return updatedRow
  }

  /**
   * Delete a row from a sheet
   */
  async deleteRow(appId: string, sheetId: string, rowId: string): Promise<boolean> {
    const storage = this.getStorage()
    const app = storage.apps.find(a => a.id === appId)

    if (!app) {
      return false
    }

    const sheet = app.sheets.find(s => s.id === sheetId)
    if (!sheet) {
      return false
    }

    const rowIndex = sheet.data.findIndex(r => r._id === rowId)
    if (rowIndex === -1) {
      return false
    }

    sheet.data.splice(rowIndex, 1)
    app.updatedAt = new Date().toISOString()
    storage.lastUpdated = new Date().toISOString()
    this.saveStorage(storage)

    return true
  }

  /**
   * Update app status
   */
  async updateStatus(appId: string, status: AppStatus): Promise<SpreadsheetApp | null> {
    return this.updateApp(appId, { status })
  }

  /**
   * Duplicate an app
   */
  async duplicateApp(id: string, newName?: string): Promise<SpreadsheetApp | null> {
    const original = await this.getApp(id)
    if (!original) {
      return null
    }

    const duplicate: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'> = {
      ...original,
      name: newName || `${original.name} (Copy)`,
      status: 'draft'
    }

    return this.createApp(duplicate)
  }

  /**
   * Export app data as JSON
   */
  async exportApp(id: string): Promise<string | null> {
    const app = await this.getApp(id)
    if (!app) {
      return null
    }

    return JSON.stringify(app, null, 2)
  }

  /**
   * Import app from JSON
   */
  async importApp(jsonData: string): Promise<SpreadsheetApp | null> {
    try {
      const imported = JSON.parse(jsonData) as SpreadsheetApp
      // Reset IDs and timestamps
      const appData: Partial<SpreadsheetApp> = { ...imported }
      delete appData.id
      delete appData.createdAt
      delete appData.updatedAt
      return this.createApp({
        ...appData,
        status: 'draft'
      } as Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>)
    } catch {
      console.error('Failed to import app')
      return null
    }
  }

  // Private helpers

  private getStorage(): SpreadsheetAppStorage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Migration check could go here
        return parsed
      }
    } catch {
      console.error('Failed to read spreadsheet apps from storage')
    }

    return {
      apps: [],
      lastUpdated: new Date().toISOString()
    }
  }

  private saveStorage(storage: SpreadsheetAppStorage): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Failed to save spreadsheet apps to storage:', error)
    }
  }

  private generateId(): string {
    return `ssa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private toSummary(app: SpreadsheetApp): SpreadsheetAppSummary {
    const totalRows = app.sheets.reduce((sum, sheet) => sum + sheet.data.length, 0)

    return {
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      sheetCount: app.sheets.length,
      rowCount: totalRows,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      createdBy: app.createdBy
    }
  }
}

/**
 * Factory function to create a SpreadsheetAppService instance
 */
export function createSpreadsheetAppService(accessToken: string): SpreadsheetAppService {
  return new SpreadsheetAppService(accessToken)
}
