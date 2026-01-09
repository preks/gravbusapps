/**
 * DocumentDataSyncService
 *
 * Syncs user-specific data (like document app index) via prompt-manager backend.
 * This enables cross-device access to document apps.
 *
 * Data structure:
 * - indexFilePath: Path to user's own documents index file
 * - sharedDocuments: Documents shared with this user by others
 */

const PROMPT_MANAGER_ENDPOINT = '/prompt-manager/api/v1/user-data'
const DOCUMENT_INDEX_KEY = 'document-apps-index'

const isDocumentAppsDebugEnabled = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage.getItem('debug:document-apps') === '1'
    )
  } catch {
    return false
  }
}

const debugLog = (...args: unknown[]) => {
  if (isDocumentAppsDebugEnabled()) {
    console.debug('[DocumentSync]', ...args)
  }
}

interface UserDataResponse {
  user_id: string
  key: string
  data: DocumentSyncData
  updated_at: string
}

export interface SharedDocumentEntry {
  documentId: string
  documentName: string
  filePath: string
  sharedBy: string // userId of owner
  sharedByName?: string // Display name of owner
  sharedAt: string
  permission: 'view' | 'edit'
  recipientUserId?: string // userId of the recipient (for tracking who has access)
}

export interface DocumentSyncData {
  indexFilePath: string
  sharedDocuments: SharedDocumentEntry[]
  updatedAt: string
}

export class DocumentDataSyncService {
  private accessToken: string
  private userId: string

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken
    this.userId = userId
  }

  /**
   * Get the full sync data from the backend
   */
  async getSyncData(): Promise<DocumentSyncData | null> {
    const url = `${PROMPT_MANAGER_ENDPOINT}/${DOCUMENT_INDEX_KEY}?user_id=${encodeURIComponent(this.userId)}`
    debugLog('GET:', url)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      debugLog('GET response status:', response.status)

      if (response.status === 404 || response.status === 204) {
        debugLog('No sync data found in backend (404/204)')
        return null
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[DocumentSync] Failed to get sync data:', response.status, errorText)
        return null
      }

      const data: UserDataResponse | null = await response.json()
      debugLog('GET data:', data)

      if (!data || !data.data) {
        debugLog('Response had no data field')
        return null
      }

      debugLog('Sync data loaded from backend:', data.updated_at)
      return data.data
    } catch (error) {
      console.warn('[DocumentSync] Error getting sync data:', error)
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
   * Get documents shared with this user
   */
  async getSharedDocuments(): Promise<SharedDocumentEntry[]> {
    const syncData = await this.getSyncData()
    return syncData?.sharedDocuments || []
  }

  /**
   * Save the full sync data
   */
  async saveSyncData(data: DocumentSyncData): Promise<boolean> {
    const url = `${PROMPT_MANAGER_ENDPOINT}/${DOCUMENT_INDEX_KEY}?user_id=${encodeURIComponent(this.userId)}`
    debugLog('PUT:', url)
    debugLog('PUT body:', { data })

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      })

      debugLog('PUT response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[DocumentSync] Failed to save sync data:', response.status, errorText)
        return false
      }

      debugLog('Sync data saved to backend successfully')
      return true
    } catch (error) {
      console.warn('[DocumentSync] Error saving sync data:', error)
      return false
    }
  }

  /**
   * Save just the index file path (updates sync data)
   */
  async saveIndex(indexFilePath: string): Promise<boolean> {
    // Get existing sync data to preserve sharedDocuments
    const existing = await this.getSyncData()
    const syncData: DocumentSyncData = {
      indexFilePath,
      sharedDocuments: existing?.sharedDocuments || [],
      updatedAt: new Date().toISOString()
    }
    return this.saveSyncData(syncData)
  }

  /**
   * Share a document with another user
   * This updates the recipient's sync data to include the shared document
   */
  async shareDocumentWithUser(
    recipientUserId: string,
    document: { id: string; name: string; filePath: string },
    permission: 'view' | 'edit' = 'view',
    sharedByName?: string
  ): Promise<boolean> {
    try {
      // Get recipient's current sync data
      const response = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${DOCUMENT_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      let recipientData: DocumentSyncData = {
        indexFilePath: '',
        sharedDocuments: [],
        updatedAt: new Date().toISOString()
      }

      if (response.ok) {
        const data: UserDataResponse | null = await response.json()
        if (data?.data) {
          recipientData = data.data
        }
      }

      // Check if document is already shared
      const existingIndex = recipientData.sharedDocuments.findIndex(d => d.documentId === document.id)
      const sharedEntry: SharedDocumentEntry = {
        documentId: document.id,
        documentName: document.name,
        filePath: document.filePath,
        sharedBy: this.userId,
        sharedByName,
        sharedAt: new Date().toISOString(),
        permission,
        recipientUserId
      }

      if (existingIndex >= 0) {
        // Update existing share
        recipientData.sharedDocuments[existingIndex] = sharedEntry
      } else {
        // Add new share
        recipientData.sharedDocuments.push(sharedEntry)
      }

      recipientData.updatedAt = new Date().toISOString()

      // Save recipient's updated sync data
      const saveResponse = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${DOCUMENT_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: recipientData })
        }
      )

      if (!saveResponse.ok) {
        console.warn('[DocumentSync] Failed to share with user:', saveResponse.status)
        return false
      }

      debugLog('Document shared with user:', recipientUserId)
      return true
    } catch (error) {
      console.warn('[DocumentSync] Error sharing document:', error)
      return false
    }
  }

  /**
   * Revoke access to a shared document for a user
   */
  async revokeDocumentAccess(recipientUserId: string, documentId: string): Promise<boolean> {
    try {
      // Get recipient's current sync data
      const response = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${DOCUMENT_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
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
      recipientData.sharedDocuments = recipientData.sharedDocuments.filter(d => d.documentId !== documentId)
      recipientData.updatedAt = new Date().toISOString()

      // Save updated sync data
      const saveResponse = await fetch(
        `${PROMPT_MANAGER_ENDPOINT}/${DOCUMENT_INDEX_KEY}?user_id=${encodeURIComponent(recipientUserId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: recipientData })
        }
      )

      return saveResponse.ok
    } catch (error) {
      console.warn('[DocumentSync] Error revoking access:', error)
      return false
    }
  }
}
