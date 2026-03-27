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

import { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

const DOCUMENT_INDEX_KEY = 'document-apps-index'

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

function createAuthorizedPromptManagerClient(accessToken: string) {
  const promptManagerClient = new PromptManagerClient()
  promptManagerClient.setAccessToken(accessToken)
  return promptManagerClient
}

export class DocumentDataSyncService {
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
  async getSyncData(): Promise<DocumentSyncData | null> {
    try {
      const response = await this.promptManagerClient.getUserData<DocumentSyncData>(DOCUMENT_INDEX_KEY, this.userId)
      if (!response?.data) {
        return null
      }
      return response.data
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
    try {
      await this.promptManagerClient.putUserData(DOCUMENT_INDEX_KEY, this.userId, data)
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
      let recipientData: DocumentSyncData = {
        indexFilePath: '',
        sharedDocuments: [],
        updatedAt: new Date().toISOString()
      }

      const existingRecipientData = await this.promptManagerClient.getUserData<DocumentSyncData>(
        DOCUMENT_INDEX_KEY,
        recipientUserId
      )
      if (existingRecipientData?.data) {
        recipientData = existingRecipientData.data
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
      await this.promptManagerClient.putUserData(DOCUMENT_INDEX_KEY, recipientUserId, recipientData)
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
      const existingRecipientData = await this.promptManagerClient.getUserData<DocumentSyncData>(
        DOCUMENT_INDEX_KEY,
        recipientUserId
      )
      if (!existingRecipientData?.data) {
        return false
      }

      const recipientData = existingRecipientData.data
      recipientData.sharedDocuments = recipientData.sharedDocuments.filter(d => d.documentId !== documentId)
      recipientData.updatedAt = new Date().toISOString()

      // Save updated sync data
      await this.promptManagerClient.putUserData(DOCUMENT_INDEX_KEY, recipientUserId, recipientData)
      return true
    } catch (error) {
      console.warn('[DocumentSync] Error revoking access:', error)
      return false
    }
  }
}
