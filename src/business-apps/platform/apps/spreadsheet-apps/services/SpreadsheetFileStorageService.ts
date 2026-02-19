/**
 * SpreadsheetFileStorageService
 *
 * Stores spreadsheet apps as JSON files using the NEWWORK File Service.
 * This provides true persistent storage that survives browser refreshes
 * and can be shared across users.
 *
 * Storage structure:
 * - Index file: spreadsheet-apps-index.json (lists all app IDs and metadata)
 * - App files: spreadsheet-app-{id}.json (full app data)
 */

import { fileClient } from '@/common/network/files/FileClient'
import type { SpreadsheetApp, SpreadsheetAppSummary, AppStatus } from '../types'
import { UserDataSyncService } from './UserDataSyncService'

/**
 * Generate a unique ID with a prefix
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `${prefix}_${timestamp}_${randomPart}`
}

const FILE_SCOPE = 'tenant' // Use tenant scope for shared access
const APP_NAME = 'spreadsheet-apps' // Required by file service
const FOLDER_PATH = '/spreadsheet-apps' // Folder to store files (must start with /)
const INDEX_FILE_NAME = 'spreadsheet-apps-global-index.json' // Shared global index
const APP_FILE_PREFIX = 'spreadsheet-app'

const isSpreadsheetAppsDebugEnabled = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage.getItem('debug:spreadsheet-apps') === '1'
    )
  } catch {
    return false
  }
}

const debugLog = (...args: unknown[]) => {
  if (isSpreadsheetAppsDebugEnabled()) {
    // Use console.debug so it's easy to filter in DevTools
    console.debug(...args)
  }
}

interface AppIndexEntry {
  id: string
  name: string
  description?: string
  icon?: string
  sheetCount: number
  rowCount: number
  status: AppStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  fileId: string // File service ID for the app data
  filePath: string // Full download path from file service
}

interface AppsIndex {
  version: number
  apps: AppIndexEntry[]
  updatedAt: string
}

interface StoredIndexInfo {
  fileId: string
  filePath: string
}

export class SpreadsheetFileStorageService {
  private accessToken: string
  private currentUserId: string
  private indexInfo: StoredIndexInfo | null = null
  private syncService: UserDataSyncService

  constructor(accessToken: string, currentUserId: string) {
    this.accessToken = accessToken
    this.currentUserId = currentUserId
    fileClient.setAccessToken(accessToken)
    this.syncService = new UserDataSyncService(accessToken, currentUserId)
  }

  /**
   * Create a JSON file from data
   */
  private createJsonFile(data: unknown, filename: string): File {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    return new File([blob], filename, { type: 'application/json' })
  }

  /**
   * Extract fileId from a file path
   * e.g., /api/v1/tenant/downloads/spreadsheet-apps/spreadsheet-apps/abc123-def456.json -> abc123-def456.json
   */
  private extractFileIdFromPath(filePath: string): string {
    const parts = filePath.split('/')
    const filename = parts[parts.length - 1] // e.g., "abc123-def456.json"
    return filename || ''
  }

  /**
   * Normalize file path to ensure it has the /api/v1 prefix
   * The PUT endpoint returns paths without /api/v1 but our download needs it
   */
  private normalizeFilePath(filePath: string): string {
    if (!filePath) return filePath

    // If path already starts with /api/v1, return as-is
    if (filePath.startsWith('/api/v1/')) {
      return filePath
    }

    // If path starts with /tenant/, add /api/v1 prefix
    if (filePath.startsWith('/tenant/')) {
      return `/api/v1${filePath}`
    }

    // Otherwise return as-is
    return filePath
  }

  /**
   * Read JSON from a file path (using the full download path)
   */
  private async readJsonFileByPath<T>(filePath: string): Promise<T | null> {
    try {
      // Build the full URL manually to avoid path joining issues
      // The filePath from upload response is like: /api/v1/tenant/downloads/...
      const baseUrl = 'https://newwork-dev.newwork.com/files'
      const url = `${baseUrl}${filePath.startsWith('/') ? filePath : '/' + filePath}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        // 404 is expected when file doesn't exist yet - not an error
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      return JSON.parse(text) as T
    } catch (error) {
      console.error('[SpreadsheetStorage] Failed to read file:', error)
      return null
    }
  }

  /**
   * Get or create the apps index
   *
   * Discovery order:
   * 1. Check localStorage (fast cache for same device)
   * 2. Check backend sync service (cross-device discovery)
   * 3. Create new index if not found
   */
  private async getIndex(): Promise<AppsIndex> {
    const localStorageKey = `spreadsheet-apps-index-${this.currentUserId}`

    debugLog('=== [TRACE] getIndex() START ===')
    debugLog('[TRACE] Current indexInfo:', this.indexInfo)
    debugLog('[TRACE] localStorage key:', localStorageKey)

    const localIndex = await this.loadIndexFromLocalStorage(localStorageKey)
    if (localIndex) return localIndex

    const backendIndex = await this.loadIndexFromBackendSync(localStorageKey)
    if (backendIndex) return backendIndex

    return this.createEmptyIndex()
  }

  private async loadIndexFromLocalStorage(localStorageKey: string): Promise<AppsIndex | null> {
    const storedInfoStr = localStorage.getItem(localStorageKey)
    debugLog('[TRACE] localStorage value:', storedInfoStr)

    if (!storedInfoStr) {
      debugLog('[TRACE] No localStorage entry found')
      return null
    }

    try {
      const storedInfo: StoredIndexInfo = JSON.parse(storedInfoStr)
      debugLog('[TRACE] Parsed storedInfo:', storedInfo)
      if (!storedInfo.filePath) return null

      debugLog('[SpreadsheetStorage] Loading index from localStorage:', storedInfo.filePath)
      const index = await this.readJsonFileByPath<AppsIndex>(storedInfo.filePath)
      debugLog('[TRACE] Index loaded from file:', index ? `${index.apps.length} apps` : 'NULL')
      if (!index) {
        debugLog('[SpreadsheetStorage] Cached index not found, checking backend...')
        localStorage.removeItem(localStorageKey)
        return null
      }

      if (!storedInfo.fileId) {
        storedInfo.fileId = this.extractFileIdFromPath(storedInfo.filePath)
        debugLog('[TRACE] Extracted fileId:', storedInfo.fileId)
      }
      this.indexInfo = storedInfo
      debugLog('[SpreadsheetStorage] Index loaded with', index.apps.length, 'apps')
      debugLog('=== [TRACE] getIndex() END (from localStorage) ===')
      return index
    } catch (e) {
      console.warn('[SpreadsheetStorage] Failed to load from localStorage:', e)
      localStorage.removeItem(localStorageKey)
      return null
    }
  }

  private async loadIndexFromBackendSync(localStorageKey: string): Promise<AppsIndex | null> {
    debugLog('[SpreadsheetStorage] Checking backend (prompt-manager) for index path...')
    try {
      const syncData = await this.syncService.getIndex()
      debugLog('[TRACE] Prompt-manager returned:', syncData)

      if (!syncData?.indexFilePath) {
        debugLog('[TRACE] No index path from prompt-manager')
        return null
      }

      debugLog('[SpreadsheetStorage] Found index via backend sync:', syncData.indexFilePath)
      const index = await this.readJsonFileByPath<AppsIndex>(syncData.indexFilePath)
      debugLog('[TRACE] Index loaded from backend file:', index ? `${index.apps.length} apps` : 'NULL')
      if (!index) return null

      const fileId = this.extractFileIdFromPath(syncData.indexFilePath)
      this.indexInfo = { fileId, filePath: syncData.indexFilePath }
      localStorage.setItem(localStorageKey, JSON.stringify(this.indexInfo))
      debugLog('[SpreadsheetStorage] Index loaded from backend with', index.apps.length, 'apps, fileId:', fileId)
      debugLog('=== [TRACE] getIndex() END (from backend) ===')
      return index
    } catch (e) {
      console.warn('[SpreadsheetStorage] Backend sync check failed:', e)
      return null
    }
  }

  private createEmptyIndex(): AppsIndex {
    debugLog('[TRACE] Creating fresh EMPTY index (no existing data found)')
    const newIndex: AppsIndex = {
      version: 1,
      apps: [],
      updatedAt: new Date().toISOString()
    }
    debugLog('=== [TRACE] getIndex() END (fresh index) ===')
    return newIndex
  }

  /**
   * Save the apps index
   * Also syncs the index path to backend for cross-device access
   *
   * Uses PUT to update in place when index already exists (same fileId).
   * Uses POST to create new when first time.
   */
  private async saveIndex(index: AppsIndex): Promise<void> {
    debugLog('=== [TRACE] saveIndex() START ===')
    debugLog('[TRACE] Saving index with', index.apps.length, 'apps')
    debugLog('[TRACE] Current indexInfo:', this.indexInfo)

    index.updatedAt = new Date().toISOString()
    const file = this.createJsonFile(index, `${INDEX_FILE_NAME}`)

    try {
      let filePath: string
      let fileId: string

      // Ensure we have a fileId - extract from filePath if missing
      let existingFileId = this.indexInfo?.fileId
      debugLog('[TRACE] existingFileId from indexInfo:', existingFileId)

      if (!existingFileId && this.indexInfo?.filePath) {
        existingFileId = this.extractFileIdFromPath(this.indexInfo.filePath)
        debugLog('[TRACE] Extracted existingFileId from filePath:', existingFileId)
      }

      // If we already have an index, update it IN PLACE using PUT
      if (existingFileId) {
        debugLog('[TRACE] *** USING PUT to update existing index ***:', existingFileId)
        const response = await fileClient.updateFile(
          file,
          { accessScope: FILE_SCOPE, fileId: existingFileId },
          {
            appName: APP_NAME,
            folderPath: FOLDER_PATH,
            mimeType: 'application/json'
          }
        )
        // Normalize path - PUT returns /tenant/... but we need /api/v1/tenant/...
        filePath = this.normalizeFilePath(response.fileInfo.path)
        fileId = response.fileInfo.fileId
        debugLog('[TRACE] PUT response (normalized):', { filePath, fileId })
      } else {
        // First time - create new index using POST
        debugLog('[TRACE] *** USING POST to create new index ***')
        const response = await fileClient.uploadFile(
          file,
          { accessScope: FILE_SCOPE },
          {
            appName: APP_NAME,
            folderPath: FOLDER_PATH,
            mimeType: 'application/json'
          }
        )
        filePath = this.normalizeFilePath(response.fileInfo.path)
        fileId = response.fileInfo.fileId
        debugLog('[TRACE] POST response (normalized):', { filePath, fileId })
      }

      this.indexInfo = { fileId, filePath }
      debugLog('[TRACE] Updated this.indexInfo:', this.indexInfo)

      // Save to localStorage for this device (fast local cache)
      const localStorageKey = `spreadsheet-apps-index-${this.currentUserId}`
      localStorage.setItem(localStorageKey, JSON.stringify(this.indexInfo))
      debugLog('[TRACE] Saved to localStorage key:', localStorageKey)

      debugLog('[SpreadsheetStorage] Index saved:', fileId)

      // Sync to backend for cross-device access
      debugLog('[TRACE] Syncing to prompt-manager...')
      try {
        await this.syncService.saveIndex(filePath)
        debugLog('[SpreadsheetStorage] Index path synced to prompt-manager')
      } catch (syncError) {
        // Don't fail the save if sync fails - localStorage still works
        console.warn('[SpreadsheetStorage] Backend sync failed (non-critical):', syncError)
      }

      debugLog('=== [TRACE] saveIndex() END ===')
    } catch (error) {
      console.error('[SpreadsheetStorage] Failed to save index:', error)
      throw error
    }
  }

  /**
   * Get all apps for the current user (owned + shared with them)
   */
  async getApps(): Promise<SpreadsheetAppSummary[]> {
    debugLog('[SpreadsheetStorage] Loading apps for user:', this.currentUserId)

    const apps: SpreadsheetAppSummary[] = []

    // 1. Get user's own apps from their index
    const index = await this.getIndex()
    const ownApps = index.apps
      .filter(app => app.createdBy === this.currentUserId)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        icon: entry.icon,
        sheetCount: entry.sheetCount,
        rowCount: entry.rowCount,
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        createdBy: entry.createdBy,
        filePath: entry.filePath,
        isOwner: true,
        isShared: false
      }))
    apps.push(...ownApps)

    // 2. Get apps shared with this user
    try {
      const sharedApps = await this.syncService.getSharedApps()
      for (const shared of sharedApps) {
        // Don't duplicate if already in own apps
        if (apps.some(a => a.id === shared.appId)) continue

        apps.push({
          id: shared.appId,
          name: shared.appName,
          description: `Shared by ${shared.sharedByName || 'another user'}`,
          sheetCount: 0, // Will be loaded when app is opened
          rowCount: 0,
          status: 'file_based',
          createdAt: shared.sharedAt,
          updatedAt: shared.sharedAt,
          createdBy: shared.sharedBy,
          filePath: shared.filePath,
          isOwner: false,
          isShared: true
        })
      }
    } catch (e) {
      console.warn('[SpreadsheetStorage] Failed to load shared apps:', e)
    }

    debugLog('[SpreadsheetStorage] Loaded', apps.length, 'apps (owned + shared)')
    return apps
  }

  /**
   * Get a single app by ID
   * @param id - App ID
   * @param directFilePath - Optional direct file path for cross-device access (bypasses local index)
   * @returns App with permission info, or null if access denied
   */
  async getApp(id: string, directFilePath?: string): Promise<SpreadsheetApp | null> {
    debugLog('[SpreadsheetStorage] Loading app:', id, directFilePath ? '(via direct path)' : '')

    let app: SpreadsheetApp | null = null

    // If a direct file path is provided (from URL for cross-device access), use it directly
    if (directFilePath) {
      debugLog('[SpreadsheetStorage] Loading via direct path:', directFilePath)
      try {
        app = await this.readJsonFileByPath<SpreadsheetApp>(directFilePath)
        if (app) {
          // Verify access before returning
          if (!this.hasAccessToApp(app)) {
            console.warn('[SpreadsheetStorage] Access denied to app:', id)
            throw new Error('Access denied')
          }
          // Add to local index for future access
          await this.addToLocalIndex(app, directFilePath)
          return app
        }
      } catch (error) {
        console.warn('[SpreadsheetStorage] Direct path load failed:', error)
        // Fall through to try local index
      }
    }

    // Try local index (own apps)
    const index = await this.getIndex()
    const entry = index.apps.find(a => a.id === id)

    // If not in own index, try shared apps (e.g. excel collection copies shared with this user)
    if (!entry) {
      try {
        const sharedApps = await this.syncService.getSharedApps()
        const shared = sharedApps.find(a => a.appId === id)
        if (shared?.filePath) {
          debugLog('[SpreadsheetStorage] Loading from shared apps:', id)
          app = await this.readJsonFileByPath<SpreadsheetApp>(shared.filePath)
          if (app && app.id === id) {
            // Verify: shared entry implies recipient has access
            return app
          }
        }
      } catch (e) {
        console.warn('[SpreadsheetStorage] Failed to load from shared apps:', e)
      }
      console.warn('[SpreadsheetStorage] App not found in index:', id)
      return null
    }

    if (!entry.filePath) {
      console.warn('[SpreadsheetStorage] App has no filePath:', id)
      return null
    }

    // Load full app data from file using the download path
    app = await this.readJsonFileByPath<SpreadsheetApp>(entry.filePath)

    if (!app) {
      return null
    }

    // Verify access before returning
    if (!this.hasAccessToApp(app)) {
      console.warn('[SpreadsheetStorage] Access denied to app:', id)
      return null
    }

    return app
  }

  /**
   * Check if current user has access to an app
   * @param app - App to check access for
   * @returns true if user is owner or has shared access
   */
  private hasAccessToApp(app: SpreadsheetApp): boolean {
    // Owner always has access
    if (app.createdBy === this.currentUserId) {
      return true
    }

    // Check if app is shared with current user
    if (app.sharedWith && app.sharedWith.length > 0) {
      const hasSharedAccess = app.sharedWith.some(share => share.userId === this.currentUserId)
      if (hasSharedAccess) {
        return true
      }
    }

    // Also check sync service for shared apps
    // Note: This is async, but we'll check it in getApps() which filters the list
    // For getApp(), we rely on the app's sharedWith metadata or ownership

    return false
  }

  /**
   * Get user's permission level for an app
   * @param app - App to check permission for
   * @returns 'owner' | 'edit' | 'view' | null if no access
   */
  getUserPermission(app: SpreadsheetApp): 'owner' | 'edit' | 'view' | null {
    if (app.createdBy === this.currentUserId) {
      return 'owner'
    }

    if (app.sharedWith && app.sharedWith.length > 0) {
      const shareEntry = app.sharedWith.find(share => share.userId === this.currentUserId)
      if (shareEntry) {
        return shareEntry.permission
      }
    }

    return null
  }

  /**
   * Add an app to local index (for cross-device access)
   */
  private async addToLocalIndex(app: SpreadsheetApp, filePath: string): Promise<void> {
    const index = await this.getIndex()
    const existingIndex = index.apps.findIndex(a => a.id === app.id)

    // Extract fileId from filePath
    const fileId = this.extractFileIdFromPath(filePath)

    const totalRows = app.sheets.reduce((sum, sheet) => sum + (sheet.data?.length || 0), 0)
    const entry: AppIndexEntry = {
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      sheetCount: app.sheets.length,
      rowCount: totalRows,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      createdBy: app.createdBy || this.currentUserId,
      fileId, // Extracted from filePath
      filePath
    }

    if (existingIndex >= 0) {
      index.apps[existingIndex] = entry
    } else {
      index.apps.push(entry)
    }

    await this.saveIndex(index)
    debugLog('[SpreadsheetStorage] Added app to local index:', app.id)
  }

  /**
   * Create a new app
   */
  async createApp(app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpreadsheetApp> {
    debugLog('=== [TRACE] createApp() START ===')
    debugLog('[TRACE] Current indexInfo before creating:', this.indexInfo)

    const now = new Date().toISOString()
    const newId = generateId('ssa')

    const newApp: SpreadsheetApp = {
      ...app,
      id: newId,
      createdAt: now,
      updatedAt: now
    }

    debugLog('[SpreadsheetStorage] Creating new app:', newApp.name, 'id:', newId)

    // Save app data to file (1st upload - always POST for new app file)
    debugLog('[TRACE] Uploading app data file via POST...')
    const appFile = this.createJsonFile(newApp, `${APP_FILE_PREFIX}-${newId}.json`)
    const uploadResponse = await fileClient.uploadFile(
      appFile,
      { accessScope: FILE_SCOPE },
      {
        appName: APP_NAME,
        folderPath: FOLDER_PATH,
        mimeType: 'application/json'
      }
    )

    // Normalize the path to ensure /api/v1 prefix
    const normalizedPath = this.normalizeFilePath(uploadResponse.fileInfo.path)

    debugLog('[TRACE] App file uploaded:', {
      fileId: uploadResponse.fileInfo.fileId,
      path: normalizedPath
    })

    // Add filePath to the app for shareable URLs
    newApp.filePath = normalizedPath

    // Update index
    const index = await this.getIndex()
    const totalRows = newApp.sheets.reduce((sum, sheet) => sum + (sheet.data?.length || 0), 0)

    index.apps.push({
      id: newId,
      name: newApp.name,
      description: newApp.description,
      icon: newApp.icon,
      sheetCount: newApp.sheets.length,
      rowCount: totalRows,
      status: newApp.status,
      createdAt: now,
      updatedAt: now,
      createdBy: newApp.createdBy,
      fileId: uploadResponse.fileInfo.fileId,
      filePath: normalizedPath
    })

    debugLog('[TRACE] Saving index with new app...')
    await this.saveIndex(index)

    debugLog('[TRACE] App created successfully!')
    debugLog('[TRACE] Final indexInfo:', this.indexInfo)
    debugLog('=== [TRACE] createApp() END ===')

    return newApp
  }

  /**
   * Update an existing app
   *
   * Uses the file service's PUT endpoint to update the file IN PLACE.
   * The fileId and filePath remain the same - no new files created!
   */
  async updateApp(id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp | null> {
    debugLog('=== [TRACE] updateApp() START ===')
    debugLog('[TRACE] App ID:', id)
    debugLog('[TRACE] Current indexInfo:', this.indexInfo)

    // First, load the app to check permissions
    const currentApp = await this.getApp(id)
    if (!currentApp) {
      console.warn('[SpreadsheetStorage] App not found or access denied:', id)
      debugLog('=== [TRACE] updateApp() END (not found/access denied) ===')
      return null
    }

    // Check permission - only owner or users with 'edit' permission can update
    const permission = this.getUserPermission(currentApp)
    if (permission !== 'owner' && permission !== 'edit') {
      console.warn('[SpreadsheetStorage] Permission denied: Cannot edit app with', permission, 'permission')
      throw new Error('Permission denied: Cannot edit this app')
    }

    const index = await this.getIndex()
    debugLog('[TRACE] Got index with', index.apps.length, 'apps')

    const entryIndex = index.apps.findIndex(a => a.id === id)
    debugLog('[TRACE] Found entry at index:', entryIndex)

    if (entryIndex === -1) {
      console.warn('[SpreadsheetStorage] App not found in index:', id)
      debugLog('=== [TRACE] updateApp() END (not found) ===')
      return null
    }

    const entry = index.apps[entryIndex]
    debugLog('[TRACE] Entry:', { id: entry.id, fileId: entry.fileId, filePath: entry.filePath })

    if (!entry.filePath) {
      console.error('[SpreadsheetStorage] App has no filePath:', id)
      debugLog('=== [TRACE] updateApp() END (no filePath) ===')
      return null
    }

    // Ensure we have a fileId - extract from filePath if missing
    let fileId = entry.fileId
    debugLog('[TRACE] Entry fileId:', fileId)

    if (!fileId) {
      fileId = this.extractFileIdFromPath(entry.filePath)
      debugLog('[TRACE] Extracted fileId from path:', fileId)
      // Update the index entry with the extracted fileId
      index.apps[entryIndex].fileId = fileId
    }

    if (!fileId) {
      console.error('[SpreadsheetStorage] Could not determine fileId for app:', id)
      debugLog('=== [TRACE] updateApp() END (no fileId) ===')
      return null
    }

    // Use the already-loaded app (we loaded it above for permission check)
    debugLog('[TRACE] Using already-loaded app, sheets:', currentApp.sheets.length)
    console.warn('[SpreadsheetStorage] updateApp - currentApp rows:', currentApp.sheets[0]?.data?.length)
    console.warn(
      '[SpreadsheetStorage] updateApp - updates rows:',
      (updates as SpreadsheetApp).sheets?.[0]?.data?.length
    )

    // Merge updates
    const now = new Date().toISOString()
    const updatedApp: SpreadsheetApp = {
      ...currentApp,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: now,
      filePath: entry.filePath // Keep same filePath
    }
    console.warn('[SpreadsheetStorage] updateApp - MERGED updatedApp rows:', updatedApp.sheets[0]?.data?.length)

    // Update the file IN PLACE using PUT (same fileId, same path!)
    const appFile = this.createJsonFile(updatedApp, `${APP_FILE_PREFIX}-${id}.json`)
    debugLog('[TRACE] *** CALLING PUT to update app file ***:', fileId)

    console.warn(
      '[SpreadsheetStorage] updateApp - SAVING to file service with',
      updatedApp.sheets[0]?.data?.length,
      'rows'
    )
    await fileClient.updateFile(
      appFile,
      { accessScope: FILE_SCOPE, fileId: fileId },
      {
        appName: APP_NAME,
        folderPath: FOLDER_PATH,
        mimeType: 'application/json'
      }
    )
    console.warn(
      '[SpreadsheetStorage] updateApp - FILE SAVED SUCCESSFULLY with',
      updatedApp.sheets[0]?.data?.length,
      'rows'
    )
    debugLog('[TRACE] PUT completed successfully')

    // Update index entry (fileId and filePath stay the same!)
    const totalRows = updatedApp.sheets.reduce((sum, sheet) => sum + (sheet.data?.length || 0), 0)
    index.apps[entryIndex] = {
      ...entry,
      name: updatedApp.name,
      description: updatedApp.description,
      icon: updatedApp.icon,
      sheetCount: updatedApp.sheets.length,
      rowCount: totalRows,
      status: updatedApp.status,
      updatedAt: now
      // fileId and filePath stay the same - no change needed!
    }

    debugLog('[TRACE] Saving updated index...')
    await this.saveIndex(index)
    debugLog('[SpreadsheetStorage] App updated in place (same fileId):', entry.fileId)
    debugLog('=== [TRACE] updateApp() END ===')

    return updatedApp
  }

  /**
   * Delete an app - removes from index AND deletes the actual file
   */
  async deleteApp(id: string): Promise<boolean> {
    debugLog('[SpreadsheetStorage] Deleting app:', id)

    const index = await this.getIndex()
    const entryIndex = index.apps.findIndex(a => a.id === id)

    if (entryIndex === -1) {
      console.warn('[SpreadsheetStorage] App not found in index:', id)
      return false
    }

    const entry = index.apps[entryIndex]

    // 1. Try to delete the actual file from file service
    if (entry.fileId) {
      try {
        debugLog('[SpreadsheetStorage] Deleting file:', entry.fileId)
        const deleted = await fileClient.deleteFile(
          { accessScope: FILE_SCOPE, fileId: entry.fileId },
          { appName: APP_NAME }
        )
        if (deleted) {
          debugLog('[SpreadsheetStorage] File deleted successfully')
        } else {
          console.warn('[SpreadsheetStorage] File deletion returned false (may not exist)')
        }
      } catch (error) {
        // Log but don't fail - still remove from index
        console.warn('[SpreadsheetStorage] Failed to delete file (may already be gone):', error)
      }
    }

    // 2. Remove from index
    index.apps.splice(entryIndex, 1)
    await this.saveIndex(index)
    debugLog('[SpreadsheetStorage] App removed from index')

    return true
  }

  /**
   * Duplicate an app
   */
  async duplicateApp(id: string, newName?: string): Promise<SpreadsheetApp | null> {
    const original = await this.getApp(id)
    if (!original) return null

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt: __, updatedAt: ___, ...appData } = original

    return this.createApp({
      ...appData,
      name: newName || `${original.name} (Copy)`,
      status: 'draft'
    })
  }

  /**
   * Export app as JSON string
   */
  async exportApp(id: string): Promise<string | null> {
    const app = await this.getApp(id)
    if (!app) return null
    return JSON.stringify(app, null, 2)
  }

  /**
   * Import app from JSON string
   */
  async importApp(jsonData: string): Promise<SpreadsheetApp | null> {
    try {
      const imported = JSON.parse(jsonData) as SpreadsheetApp
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, createdAt, updatedAt, ...appData } = imported

      return this.createApp({
        ...appData,
        createdBy: this.currentUserId,
        status: 'draft'
      })
    } catch (error) {
      console.error('[SpreadsheetStorage] Failed to import app:', error)
      return null
    }
  }

  /**
   * Share an app with one or more users
   * @param appId - ID of the app to share
   * @param recipientUserIds - Array of user IDs to share with
   * @param permission - 'view' or 'edit'
   * @param ownerName - Display name of the current user (for recipient's UI)
   */
  async shareApp(
    appId: string,
    recipientUserIds: string[],
    permission: 'view' | 'edit' = 'view',
    ownerName?: string
  ): Promise<boolean> {
    debugLog('[SpreadsheetStorage] Sharing app', appId, 'with users', recipientUserIds)

    // Get app details from index
    const index = await this.getIndex()
    const entry = index.apps.find(a => a.id === appId)

    if (!entry) {
      console.error('[SpreadsheetStorage] App not found:', appId)
      return false
    }

    if (entry.createdBy !== this.currentUserId) {
      console.error('[SpreadsheetStorage] Cannot share app you do not own')
      return false
    }

    // Share with all users via sync service
    const results = await Promise.all(
      recipientUserIds.map(userId =>
        this.syncService.shareAppWithUser(
          userId,
          { id: entry.id, name: entry.name, filePath: entry.filePath },
          permission,
          ownerName
        )
      )
    )

    const success = results.every(r => r === true)
    if (success) {
      debugLog('[SpreadsheetStorage] App shared successfully with', recipientUserIds.length, 'users')

      // Update app metadata to track shared users
      const app = await this.getApp(appId)
      if (app) {
        const now = new Date().toISOString()
        const existingSharedWith = app.sharedWith || []
        const newShares = recipientUserIds.map(userId => ({
          userId,
          permission,
          sharedAt: now
        }))

        // Merge with existing shares (update permission if user already shared)
        const updatedSharedWith = [...existingSharedWith]
        for (const newShare of newShares) {
          const existingIndex = updatedSharedWith.findIndex(s => s.userId === newShare.userId)
          if (existingIndex >= 0) {
            updatedSharedWith[existingIndex] = newShare // Update permission
          } else {
            updatedSharedWith.push(newShare)
          }
        }

        await this.updateApp(appId, { sharedWith: updatedSharedWith })
      }
    } else {
      console.warn('[SpreadsheetStorage] Some shares failed')
    }

    return success
  }

  /**
   * Get users an app is shared with
   * @param appId - ID of the app
   */
  async getSharedUsers(appId: string): Promise<
    Array<{
      userId: string
      userName: string
      userEmail: string
      permission: 'view' | 'edit'
      sharedAt: string
    }>
  > {
    debugLog('[SpreadsheetStorage] Getting shared users for app', appId)

    try {
      const app = await this.getApp(appId)
      if (!app || !app.sharedWith || app.sharedWith.length === 0) {
        return []
      }

      // Return shared users with basic info
      // Note: userName and userEmail will be populated by the UI component
      // that can use employee search/GraphQL to fetch full details
      return app.sharedWith.map(share => ({
        userId: share.userId,
        userName: share.userId, // Placeholder - will be resolved in UI
        userEmail: '', // Placeholder - will be resolved in UI
        permission: share.permission,
        sharedAt: share.sharedAt
      }))
    } catch (error) {
      console.warn('[SpreadsheetStorage] Failed to get shared users:', error)
      return []
    }
  }

  /**
   * Revoke a user's access to a shared app
   */
  async revokeAccess(appId: string, recipientUserId: string): Promise<boolean> {
    debugLog('[SpreadsheetStorage] Revoking access to app', appId, 'for user', recipientUserId)

    // Revoke via sync service (removes from recipient's sharedApps)
    const syncSuccess = await this.syncService.revokeAppAccess(recipientUserId, appId)

    if (syncSuccess) {
      // Also remove from app's sharedWith metadata
      const app = await this.getApp(appId)
      if (app && app.sharedWith) {
        const updatedSharedWith = app.sharedWith.filter(s => s.userId !== recipientUserId)
        await this.updateApp(appId, { sharedWith: updatedSharedWith })
      }
    }

    return syncSuccess
  }

  /**
   * Get the current user's ID
   */
  getCurrentUserId(): string {
    return this.currentUserId
  }
}

/**
 * Factory function to create a storage service instance
 */
export function createSpreadsheetFileStorageService(
  accessToken: string,
  currentUserId: string
): SpreadsheetFileStorageService {
  return new SpreadsheetFileStorageService(accessToken, currentUserId)
}
