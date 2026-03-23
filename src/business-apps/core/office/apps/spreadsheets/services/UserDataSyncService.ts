/**
 * UserDataSyncService
 *
 * Syncs user-specific data (like spreadsheet app index) via prompt-manager backend.
 * This enables cross-device access to spreadsheet apps.
 *
 * Data structure:
 * - indexFilePath: Path to user's own apps index file
 * - sharedApps: Apps shared with this user by others
 */

import { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

const SPREADSHEET_INDEX_KEY = 'spreadsheet-apps-index'

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
    console.debug(...args)
  }
}

export interface SharedAppEntry {
  appId: string
  appName: string
  filePath: string
  sharedBy: string // userId of owner
  sharedByName?: string // Display name of owner
  sharedAt: string
  permission: 'view' | 'edit'
  recipientUserId?: string // userId of the recipient (for tracking who has access)
}

export interface SpreadsheetSyncData {
  indexFilePath: string
  sharedApps: SharedAppEntry[]
  updatedAt: string
}

function createAuthorizedPromptManagerClient(accessToken: string) {
  const promptManagerClient = new PromptManagerClient()
  promptManagerClient.setAccessToken(accessToken)
  return promptManagerClient
}

export class UserDataSyncService {
  private readonly promptManagerClient: PromptManagerClient
  private readonly userId: string

  constructor(
    accessToken: string,
    userId: string,
    promptManagerClient = createAuthorizedPromptManagerClient(accessToken)
  ) {
    this.promptManagerClient = promptManagerClient
    this.userId = userId
  }

  /**
   * Get the full sync data from the backend
   */
  async getSyncData(): Promise<SpreadsheetSyncData | null> {
    debugLog('[TRACE] UserDataSync GET:', this.userId, SPREADSHEET_INDEX_KEY)

    try {
      const response = await this.promptManagerClient.getUserData<SpreadsheetSyncData>(
        SPREADSHEET_INDEX_KEY,
        this.userId
      )
      debugLog('[TRACE] UserDataSync GET response:', response)
      if (!response?.data) {
        debugLog('[UserDataSync] No sync data found in backend (404/204)')
        return null
      }
      debugLog('[UserDataSync] Sync data loaded from backend:', response.updated_at)
      return response.data
    } catch (error) {
      console.warn('[UserDataSync] Error getting sync data:', error)
      return null
    }
  }

  /**
   * Get just the index file path (backward compatible)
   */
  async getIndex(): Promise<{ indexFilePath: string } | null> {
    const syncData = await this.getSyncData()
    if (!syncData?.indexFilePath) return null
    return { indexFilePath: syncData.indexFilePath }
  }

  /**
   * Get apps shared with this user
   */
  async getSharedApps(): Promise<SharedAppEntry[]> {
    const syncData = await this.getSyncData()
    return syncData?.sharedApps || []
  }

  /**
   * Save the full sync data
   */
  async saveSyncData(data: SpreadsheetSyncData): Promise<boolean> {
    debugLog('[TRACE] UserDataSync PUT:', this.userId, SPREADSHEET_INDEX_KEY)
    debugLog('[TRACE] UserDataSync PUT body:', { data })

    try {
      const response = await this.promptManagerClient.putUserData(SPREADSHEET_INDEX_KEY, this.userId, data)
      debugLog('[TRACE] UserDataSync PUT response:', response)
      debugLog('[UserDataSync] Sync data saved to backend successfully')
      return true
    } catch (error) {
      console.warn('[UserDataSync] Error saving sync data:', error)
      return false
    }
  }

  /**
   * Save just the index file path (updates sync data)
   */
  async saveIndex(indexFilePath: string): Promise<boolean> {
    // Get existing sync data to preserve sharedApps
    const existing = await this.getSyncData()
    const syncData: SpreadsheetSyncData = {
      indexFilePath,
      sharedApps: existing?.sharedApps || [],
      updatedAt: new Date().toISOString()
    }
    return this.saveSyncData(syncData)
  }

  /**
   * Share an app with another user
   * This updates the recipient's sync data to include the shared app
   */
  async shareAppWithUser(
    recipientUserId: string,
    app: { id: string; name: string; filePath: string },
    permission: 'view' | 'edit' = 'view',
    sharedByName?: string
  ): Promise<boolean> {
    try {
      // Get recipient's current sync data
      let recipientData: SpreadsheetSyncData = {
        indexFilePath: '',
        sharedApps: [],
        updatedAt: new Date().toISOString()
      }

      const existingRecipientData = await this.promptManagerClient.getUserData<SpreadsheetSyncData>(
        SPREADSHEET_INDEX_KEY,
        recipientUserId
      )
      if (existingRecipientData?.data) {
        recipientData = existingRecipientData.data
      }

      // Check if app is already shared
      const existingIndex = recipientData.sharedApps.findIndex(a => a.appId === app.id)
      const sharedEntry: SharedAppEntry = {
        appId: app.id,
        appName: app.name,
        filePath: app.filePath,
        sharedBy: this.userId,
        sharedByName,
        sharedAt: new Date().toISOString(),
        permission,
        recipientUserId // Track who this is shared with
      }

      if (existingIndex >= 0) {
        // Update existing share
        recipientData.sharedApps[existingIndex] = sharedEntry
      } else {
        // Add new share
        recipientData.sharedApps.push(sharedEntry)
      }

      recipientData.updatedAt = new Date().toISOString()

      // Save recipient's updated sync data
      await this.promptManagerClient.putUserData(SPREADSHEET_INDEX_KEY, recipientUserId, recipientData)
      debugLog('[UserDataSync] App shared with user:', recipientUserId)
      return true
    } catch (error) {
      console.warn('[UserDataSync] Error sharing app:', error)
      return false
    }
  }

  /**
   * Get all users an app is shared with (by querying owner's sync data)
   * Note: This is a simplified implementation. In production, you might want to
   * maintain a separate sharing registry or store this in the app's own data.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSharedUsersForApp(appId: string, _ownerUserId: string): Promise<SharedAppEntry[]> {
    // For now, we can't efficiently query all users to find who has this app shared.
    // This would require querying every user's sync data, which is not practical.
    //
    // Options for future enhancement:
    // 1. Store shared users list in the app's own data/metadata
    // 2. Maintain a separate sharing registry
    // 3. Enhance the index structure to track shares
    //
    // For MVP, return empty array - the UI can work without this for now
    debugLog('[UserDataSync] getSharedUsersForApp called for app:', appId)
    return []
  }

  /**
   * Revoke access to a shared app for a user
   */
  async revokeAppAccess(recipientUserId: string, appId: string): Promise<boolean> {
    try {
      // Get recipient's current sync data
      const existingRecipientData = await this.promptManagerClient.getUserData<SpreadsheetSyncData>(
        SPREADSHEET_INDEX_KEY,
        recipientUserId
      )
      if (!existingRecipientData?.data) {
        return false
      }

      const recipientData = existingRecipientData.data
      recipientData.sharedApps = recipientData.sharedApps.filter(a => a.appId !== appId)
      recipientData.updatedAt = new Date().toISOString()

      // Save updated sync data
      await this.promptManagerClient.putUserData(SPREADSHEET_INDEX_KEY, recipientUserId, recipientData)
      return true
    } catch (error) {
      console.warn('[UserDataSync] Error revoking access:', error)
      return false
    }
  }
}
