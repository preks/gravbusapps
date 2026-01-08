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

const PROMPT_MANAGER_ENDPOINT = '/prompt-manager/api/v1/user-data'
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

interface UserDataResponse {
  user_id: string
  key: string
  data: SpreadsheetSyncData
  updated_at: string
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

export class UserDataSyncService {
  private accessToken: string
  private userId: string

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken
    this.userId = userId
  }

  /**
   * Get the full sync data from the backend
   */
  async getSyncData(): Promise<SpreadsheetSyncData | null> {
    const url = `${PROMPT_MANAGER_ENDPOINT}/${SPREADSHEET_INDEX_KEY}?user_id=${encodeURIComponent(this.userId)}`
    debugLog('[TRACE] UserDataSync GET:', url)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      debugLog('[TRACE] UserDataSync GET response status:', response.status)

      if (response.status === 404 || response.status === 204) {
        debugLog('[UserDataSync] No sync data found in backend (404/204)')
        return null
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[UserDataSync] Failed to get sync data:', response.status, errorText)
        return null
      }

      const data: UserDataResponse | null = await response.json()
      debugLog('[TRACE] UserDataSync GET data:', data)
      
      if (!data || !data.data) {
        debugLog('[UserDataSync] Response had no data field')
        return null
      }

      debugLog('[UserDataSync] Sync data loaded from backend:', data.updated_at)
      return data.data
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
    const url = `${PROMPT_MANAGER_ENDPOINT}/${SPREADSHEET_INDEX_KEY}?user_id=${encodeURIComponent(this.userId)}`
    debugLog('[TRACE] UserDataSync PUT:', url)
    debugLog('[TRACE] UserDataSync PUT body:', { data })
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      })
      
      debugLog('[TRACE] UserDataSync PUT response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[UserDataSync] Failed to save sync data:', response.status, errorText)
        return false
      }

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
      const response = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${SPREADSHEET_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      let recipientData: SpreadsheetSyncData = {
        indexFilePath: '',
        sharedApps: [],
        updatedAt: new Date().toISOString()
      }

      if (response.ok) {
        const data: UserDataResponse | null = await response.json()
        if (data?.data) {
          recipientData = data.data
        }
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
      const saveResponse = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${SPREADSHEET_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: recipientData })
        }
      )

      if (!saveResponse.ok) {
        console.warn('[UserDataSync] Failed to share with user:', saveResponse.status)
        return false
      }

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
  async getSharedUsersForApp(appId: string, ownerUserId: string): Promise<SharedAppEntry[]> {
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
      const response = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${SPREADSHEET_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        return false
      }

      const data: UserDataResponse | null = await response.json()
      if (!data?.data) {
        return false
      }

      const recipientData = data.data
      recipientData.sharedApps = recipientData.sharedApps.filter(a => a.appId !== appId)
      recipientData.updatedAt = new Date().toISOString()

      // Save updated sync data
      const saveResponse = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${SPREADSHEET_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: recipientData })
        }
      )

      return saveResponse.ok
    } catch (error) {
      console.warn('[UserDataSync] Error revoking access:', error)
      return false
    }
  }
}
