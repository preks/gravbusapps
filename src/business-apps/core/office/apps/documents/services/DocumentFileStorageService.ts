/**
 * DocumentFileStorageService
 *
 * Stores documents and templates as JSON files using the NEWWORK File Service.
 * This provides true persistent storage that survives browser refreshes
 * and can be shared across users.
 *
 * Storage structure:
 * - Index file: document-apps-index.json (lists all document IDs and metadata)
 * - Document files: document-{id}.json (full document data)
 * - Template files: document-template-{id}.json (template data)
 *
 * Access Control:
 * - Only owner and shared users can access a document
 * - Sharing is managed via DocumentDataSyncService for cross-device access
 */

import { fileClient } from '@/common/network/files/FileClient'
import type {
  Document,
  DocumentSummary,
  DocumentStatus,
  DocumentTemplate,
  TemplateSummary,
  DocumentShare,
  DocumentApprovalRequest
} from '../types'
import { DocumentDataSyncService } from './DocumentDataSyncService'

/**
 * Generate a unique ID with a prefix
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `${prefix}_${timestamp}_${randomPart}`
}

const FILE_SCOPE = 'tenant' // Use tenant scope for shared access
const APP_NAME = 'document-apps' // Required by file service
const FOLDER_PATH = '/document-apps' // Folder to store files
const INDEX_FILE_NAME = 'document-apps-global-index.json'
const TEMPLATE_INDEX_FILE_NAME = 'document-templates-index.json'
const DOCUMENT_FILE_PREFIX = 'document'
const TEMPLATE_FILE_PREFIX = 'document-template'

interface DocumentIndexEntry {
  id: string
  title: string
  description?: string
  status: DocumentStatus
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  fileId: string
  filePath: string
  wordCount?: number
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  approvalRequest?: DocumentApprovalRequest
}

interface DocumentsIndex {
  version: number
  documents: DocumentIndexEntry[]
  updatedAt: string
}

interface TemplateIndexEntry {
  id: string
  name: string
  description?: string
  category: string
  tags?: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  isPublic: boolean
  usageCount: number
  fileId: string
  filePath: string
}

interface TemplatesIndex {
  version: number
  templates: TemplateIndexEntry[]
  updatedAt: string
}

interface StoredIndexInfo {
  fileId: string
  filePath: string
}

export class DocumentFileStorageService {
  private accessToken: string
  private currentUserId: string
  private documentIndexInfo: StoredIndexInfo | null = null
  private templateIndexInfo: StoredIndexInfo | null = null
  private syncService: DocumentDataSyncService

  constructor(accessToken: string, currentUserId: string) {
    this.accessToken = accessToken
    this.currentUserId = currentUserId
    this.syncService = new DocumentDataSyncService(accessToken, currentUserId)
    fileClient.setAccessToken(accessToken)
  }

  // ============================================
  // ACCESS CONTROL
  // ============================================

  /**
   * Check if current user has access to a document
   * @param document - Document to check access for
   * @returns true if user is owner or has shared access
   */
  private hasAccessToDocument(document: Document): boolean {
    // Owner always has access
    if (document.createdBy === this.currentUserId) {
      return true
    }

    // Check if document is shared with current user
    if (document.sharedWith && document.sharedWith.length > 0) {
      const hasSharedAccess = document.sharedWith.some(share => share.userId === this.currentUserId)
      if (hasSharedAccess) {
        return true
      }
    }

    return false
  }

  /**
   * Get user's permission level for a document
   * @param document - Document to check permission for
   * @returns 'owner' | 'edit' | 'view' | 'comment' | null if no access
   */
  getUserPermission(document: Document): 'owner' | 'edit' | 'view' | 'comment' | null {
    if (document.createdBy === this.currentUserId) {
      return 'owner'
    }

    if (document.sharedWith && document.sharedWith.length > 0) {
      const shareEntry = document.sharedWith.find(share => share.userId === this.currentUserId)
      if (shareEntry) {
        return shareEntry.permission
      }
    }

    return null
  }

  /**
   * Add a document to local index (for cross-device access)
   */
  private async addToLocalIndex(document: Document, filePath: string): Promise<void> {
    const index = await this.getDocumentIndex()
    const existingIndex = index.documents.findIndex(d => d.id === document.id)

    const fileId = this.extractFileIdFromPath(filePath)

    const entry: DocumentIndexEntry = {
      id: document.id,
      title: document.title,
      description: document.description,
      status: document.status,
      category: document.category,
      tags: document.tags,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      createdBy: document.createdBy,
      fileId,
      filePath,
      wordCount: this.getWordCount(document.content),
      approvalStatus: document.approvalRequest?.status,
      approvalRequest: document.approvalRequest
    }

    if (existingIndex >= 0) {
      index.documents[existingIndex] = entry
    } else {
      index.documents.push(entry)
    }

    await this.saveDocumentIndex(index)
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
   * Path format: /api/v1/tenant/files/{fileId}.json
   * Returns the full filename including .json extension (required by file service PUT)
   */
  private extractFileIdFromPath(filePath: string): string {
    const parts = filePath.split('/')
    const filename = parts[parts.length - 1] || ''
    // Keep the .json extension - the file service needs it for PUT requests
    return filename
  }

  /**
   * Normalize file path to ensure it has the /api/v1 prefix
   */
  private normalizeFilePath(filePath: string): string {
    if (!filePath) return filePath
    if (filePath.startsWith('/api/v1/')) return filePath
    if (filePath.startsWith('/tenant/')) return `/api/v1${filePath}`
    return filePath
  }

  /**
   * Read JSON from a file path
   * Adds cache-busting parameter to avoid stale CDN/browser cached data
   */
  private async readJsonFileByPath<T>(filePath: string): Promise<T | null> {
    try {
      const baseUrl = 'https://newwork-dev.newwork.com/files'
      // Add cache-busting timestamp to prevent CDN/browser caching issues
      const cacheBuster = `_cb=${Date.now()}`
      const separator = filePath.includes('?') ? '&' : '?'
      const url = `${baseUrl}${filePath.startsWith('/') ? filePath : '/' + filePath}${separator}${cacheBuster}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      return JSON.parse(text) as T
    } catch (error) {
      console.error('[DocumentStorage] Failed to read file:', error)
      return null
    }
  }

  /**
   * Get word count from HTML content
   */
  private getWordCount(html: string): number {
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text ? text.split(' ').length : 0
  }

  // ============================================
  // DOCUMENT OPERATIONS
  // ============================================

  /**
   * Get or create the documents index
   */
  private async getDocumentIndex(): Promise<DocumentsIndex> {
    const localStorageKey = `document-apps-index-${this.currentUserId}`

    const localIndex = await this.loadIndexFromLocalStorage(localStorageKey)
    if (localIndex) return localIndex

    const syncedIndex = await this.loadIndexFromSyncService(localStorageKey)
    if (syncedIndex) return syncedIndex

    return this.createEmptyIndex()
  }

  private createEmptyIndex(): DocumentsIndex {
    return {
      version: 1,
      documents: [],
      updatedAt: new Date().toISOString()
    }
  }

  private async loadIndexFromLocalStorage(localStorageKey: string): Promise<DocumentsIndex | null> {
    const storedInfoStr = localStorage.getItem(localStorageKey)

    if (!storedInfoStr) return null

    try {
      const storedInfo: StoredIndexInfo = JSON.parse(storedInfoStr)

      if (!storedInfo.filePath) return null

      const index = await this.readJsonFileByPath<DocumentsIndex>(storedInfo.filePath)
      if (!index) {
        localStorage.removeItem(localStorageKey)
        return null
      }

      if (!storedInfo.fileId) {
        storedInfo.fileId = this.extractFileIdFromPath(storedInfo.filePath)
      }
      this.documentIndexInfo = storedInfo
      return index
    } catch (e) {
      console.warn('[DocumentStorage] Failed to load from localStorage:', e)
      localStorage.removeItem(localStorageKey)
      return null
    }
  }

  private async loadIndexFromSyncService(localStorageKey: string): Promise<DocumentsIndex | null> {
    try {
      const syncData = await this.syncService.getIndex()
      if (!syncData?.indexFilePath) return null

      const index = await this.readJsonFileByPath<DocumentsIndex>(syncData.indexFilePath)
      if (!index) {
        return null
      }

      const fileId = this.extractFileIdFromPath(syncData.indexFilePath)
      this.documentIndexInfo = { fileId, filePath: syncData.indexFilePath }
      localStorage.setItem(localStorageKey, JSON.stringify(this.documentIndexInfo))
      return index
    } catch (e) {
      console.warn('[DocumentStorage] Failed to load from sync service:', e)
      return null
    }
  }

  /**
   * Save the documents index
   */
  private async saveDocumentIndex(index: DocumentsIndex): Promise<void> {
    index.updatedAt = new Date().toISOString()
    const file = this.createJsonFile(index, INDEX_FILE_NAME)

    try {
      let filePath: string
      let fileId: string
      let existingFileId = this.documentIndexInfo?.fileId

      if (!existingFileId && this.documentIndexInfo?.filePath) {
        existingFileId = this.extractFileIdFromPath(this.documentIndexInfo.filePath)
      }

      if (existingFileId) {
        const response = await fileClient.updateFile(
          file,
          { accessScope: FILE_SCOPE, fileId: existingFileId },
          { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
        )
        filePath = this.normalizeFilePath(response.fileInfo.path)
        fileId = response.fileInfo.fileId
      } else {
        const response = await fileClient.uploadFile(
          file,
          { accessScope: FILE_SCOPE },
          { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
        )
        filePath = this.normalizeFilePath(response.fileInfo.path)
        fileId = response.fileInfo.fileId
      }

      this.documentIndexInfo = { fileId, filePath }
      const localStorageKey = `document-apps-index-${this.currentUserId}`
      localStorage.setItem(localStorageKey, JSON.stringify(this.documentIndexInfo))

      // Sync to backend for cross-device access
      await this.syncService.saveIndex(filePath)
    } catch (error) {
      console.error('[DocumentStorage] Failed to save index:', error)
      throw error
    }
  }

  /**
   * Get all documents for the current user (owned + shared)
   */
  async listDocuments(): Promise<DocumentSummary[]> {
    const index = await this.getDocumentIndex()

    // Get owned documents
    const ownedDocuments: DocumentSummary[] = index.documents
      .filter(entry => entry.createdBy === this.currentUserId)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        status: entry.status,
        category: entry.category,
        tags: entry.tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        createdBy: entry.createdBy,
        filePath: entry.filePath,
        isOwner: true,
        permission: 'owner' as const,
        wordCount: entry.wordCount,
        approvalStatus: entry.approvalStatus,
        approvalRequest: entry.approvalRequest,
        isShared: false,
        sharedWithCount: 0
      }))

    // Get documents shared with current user via sync service
    const sharedDocuments = await this.getSharedDocuments()

    // Combine and dedupe (in case a document appears in both)
    const allDocuments = [...ownedDocuments, ...sharedDocuments]
    const uniqueDocuments = allDocuments.reduce((acc, doc) => {
      if (!acc.find(d => d.id === doc.id)) {
        acc.push(doc)
      }
      return acc
    }, [] as DocumentSummary[])

    return uniqueDocuments
  }

  /**
   * Get documents shared with current user from sync service
   */
  private async getSharedDocuments(): Promise<DocumentSummary[]> {
    try {
      const sharedEntries = await this.syncService.getSharedDocuments()
      const sharedDocuments: DocumentSummary[] = []

      for (const entry of sharedEntries) {
        // Try to load the full document to get current metadata
        const document = await this.readJsonFileByPath<Document>(entry.filePath)
        if (document && this.hasAccessToDocument(document)) {
          sharedDocuments.push({
            id: document.id,
            title: document.title,
            description: document.description,
            status: document.status,
            category: document.category,
            tags: document.tags,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            createdBy: document.createdBy,
            filePath: entry.filePath,
            isOwner: false,
            permission: entry.permission,
            wordCount: this.getWordCount(document.content),
            approvalStatus: document.approvalRequest?.status,
            approvalRequest: document.approvalRequest,
            isShared: true,
            sharedByName: entry.sharedByName
          })
        }
      }

      return sharedDocuments
    } catch (error) {
      console.warn('[DocumentStorage] Failed to get shared documents:', error)
      return []
    }
  }

  /**
   * Get a single document by ID
   * @param id - Document ID
   * @param directFilePath - Optional direct file path for cross-device access (bypasses local index)
   * @returns Document with permission info, or null if access denied
   */
  async getDocument(id: string, directFilePath?: string): Promise<Document | null> {
    // If a direct file path is provided (from URL for cross-device access), use it directly
    if (directFilePath) {
      const direct = await this.tryLoadDocumentViaDirectPath(id, directFilePath)
      if (direct) return direct
    }

    // Try local index
    const index = await this.getDocumentIndex()
    const entry = index.documents.find(d => d.id === id)

    if (!entry) {
      // Check if document is shared with us via sync service
      const shared = await this.tryLoadSharedDocumentViaSync(id)
      if (shared) return shared

      console.warn('[DocumentStorage] Document not found:', id)
      return null
    }

    if (!entry.filePath) {
      console.warn('[DocumentStorage] Document has no filePath:', id)
      return null
    }

    // Load full document data from file
    const document = await this.readJsonFileByPath<Document>(entry.filePath)

    if (!document) {
      return null
    }

    // Verify access before returning
    if (!this.hasAccessToDocument(document)) {
      console.warn('[DocumentStorage] Access denied to document:', id)
      return null
    }

    return document
  }

  private async tryLoadDocumentViaDirectPath(id: string, directFilePath: string): Promise<Document | null> {
    try {
      const document = await this.readJsonFileByPath<Document>(directFilePath)
      if (!document) return null

      if (!this.hasAccessToDocument(document)) {
        console.warn('[DocumentStorage] Access denied to document:', id)
        return null
      }

      await this.addToLocalIndex(document, directFilePath)
      return document
    } catch (error) {
      console.warn('[DocumentStorage] Direct path load failed:', error)
      return null
    }
  }

  private async tryLoadSharedDocumentViaSync(id: string): Promise<Document | null> {
    const sharedDocs = await this.syncService.getSharedDocuments()
    const sharedEntry = sharedDocs.find(d => d.documentId === id)
    if (!sharedEntry) return null

    const document = await this.readJsonFileByPath<Document>(sharedEntry.filePath)
    if (!document) return null

    if (!this.hasAccessToDocument(document)) {
      return null
    }

    await this.addToLocalIndex(document, sharedEntry.filePath)
    return document
  }

  /**
   * Create a new document
   */
  async createDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document | null> {
    const id = generateId('doc')
    const now = new Date().toISOString()

    const newDocument: Document = {
      ...document,
      id,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
      version: 1
    }

    // Save document file
    const file = this.createJsonFile(newDocument, `${DOCUMENT_FILE_PREFIX}-${id}.json`)

    try {
      const response = await fileClient.uploadFile(
        file,
        { accessScope: FILE_SCOPE },
        { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
      )

      const filePath = this.normalizeFilePath(response.fileInfo.path)
      newDocument.filePath = filePath

      // Update index
      const index = await this.getDocumentIndex()
      // Store the fileId exactly as returned by the file service (do NOT strip .json)
      const fileId = response.fileInfo.fileId || ''

      index.documents.push({
        id,
        title: newDocument.title,
        description: newDocument.description,
        status: newDocument.status,
        category: newDocument.category,
        tags: newDocument.tags,
        createdAt: now,
        updatedAt: now,
        createdBy: this.currentUserId,
        fileId,
        filePath,
        wordCount: this.getWordCount(newDocument.content),
        approvalStatus: newDocument.approvalRequest?.status,
        approvalRequest: newDocument.approvalRequest
      })

      await this.saveDocumentIndex(index)

      return newDocument
    } catch (error) {
      console.error('[DocumentStorage] Failed to create document:', error)
      return null
    }
  }

  /**
   * Update an existing document
   *
   * Uses the file service's PUT endpoint to update the file IN PLACE.
   * The fileId and filePath remain the same - no new files created!
   */
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | null> {
    const index = await this.getDocumentIndex()

    const entryIndex = index.documents.findIndex(d => d.id === id)

    if (entryIndex === -1) {
      console.warn('[DocumentStorage] Document not found in index:', id)
      return null
    }

    const entry = index.documents[entryIndex]

    if (!entry.filePath) {
      console.error('[DocumentStorage] Document has no filePath:', id)
      return null
    }

    // Load current document
    const document = await this.readJsonFileByPath<Document>(entry.filePath)
    if (!document) {
      console.error('[DocumentStorage] Failed to load document from:', entry.filePath)
      return null
    }

    // Ensure we have a fileId - use stored fileId or extract from filePath
    let fileId = entry.fileId

    if (!fileId) {
      // Extract from filePath - this will include .json extension which is correct
      fileId = this.extractFileIdFromPath(entry.filePath)

      // Update index with the extracted fileId for future use
      if (fileId) {
        index.documents[entryIndex].fileId = fileId
      }
    }

    if (!fileId) {
      console.error('[DocumentStorage] Could not determine fileId for document:', id)
      return null
    }

    // Merge updates
    const now = new Date().toISOString()
    const updatedDocument: Document = {
      ...document,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: now,
      lastModifiedBy: this.currentUserId,
      version: (document.version || 1) + 1,
      filePath: entry.filePath // Keep same filePath
    }

    // Update the file IN PLACE using PUT (same fileId, same path!)
    const file = this.createJsonFile(updatedDocument, `${DOCUMENT_FILE_PREFIX}-${id}.json`)

    try {
      await fileClient.updateFile(
        file,
        { accessScope: FILE_SCOPE, fileId },
        { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
      )

      // Update index entry (fileId and filePath stay the same!)
      index.documents[entryIndex] = {
        ...entry,
        title: updatedDocument.title,
        description: updatedDocument.description,
        status: updatedDocument.status,
        category: updatedDocument.category,
        tags: updatedDocument.tags,
        updatedAt: now,
        // fileId and filePath stay the same - no change needed!
        wordCount: this.getWordCount(updatedDocument.content),
        approvalStatus: updatedDocument.approvalRequest?.status,
        approvalRequest: updatedDocument.approvalRequest
      }

      await this.saveDocumentIndex(index)

      return updatedDocument
    } catch (error) {
      console.error('[DocumentStorage] Failed to update document:', error)
      return null
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    const index = await this.getDocumentIndex()
    const entryIndex = index.documents.findIndex(d => d.id === id)
    if (entryIndex === -1) return false

    const entry = index.documents[entryIndex]

    // Only owner can delete
    if (entry.createdBy !== this.currentUserId) {
      console.error('[DocumentStorage] Cannot delete: not owner')
      return false
    }

    try {
      // Delete file
      const fileId = this.extractFileIdFromPath(entry.filePath)
      await fileClient.deleteFile({ accessScope: FILE_SCOPE, fileId })

      // Update index
      index.documents.splice(entryIndex, 1)
      await this.saveDocumentIndex(index)

      return true
    } catch (error) {
      console.error('[DocumentStorage] Failed to delete document:', error)
      return false
    }
  }

  /**
   * Duplicate a document
   */
  async duplicateDocument(id: string): Promise<Document | null> {
    const original = await this.getDocument(id)
    if (!original) return null

    return await this.createDocument({
      title: `${original.title} (Copy)`,
      description: original.description,
      content: original.content,
      plainText: original.plainText,
      status: 'draft',
      formatting: original.formatting,
      tags: original.tags,
      category: original.category,
      createdBy: this.currentUserId
    })
  }

  /**
   * Share a document with users
   * Updates both the document's sharedWith metadata AND the recipient's sync data for cross-device access
   */
  async shareDocument(
    documentId: string,
    recipientUserIds: string[],
    permission: 'view' | 'edit' | 'comment' | 'admin',
    sharerName?: string
  ): Promise<boolean> {
    const index = await this.getDocumentIndex()
    const entry = index.documents.find(d => d.id === documentId)
    if (!entry || !entry.filePath) {
      console.warn('[DocumentStorage] Document not found for sharing:', documentId)
      return false
    }

    // Only owner can share
    if (entry.createdBy !== this.currentUserId) {
      console.warn('[DocumentStorage] Cannot share: not owner')
      return false
    }

    // Share with all users via sync service
    const syncPermission = permission === 'comment' ? 'view' : permission
    const results = await Promise.all(
      recipientUserIds.map(userId =>
        this.syncService.shareDocumentWithUser(
          userId,
          { id: entry.id, name: entry.title, filePath: entry.filePath },
          syncPermission,
          sharerName
        )
      )
    )

    const allSucceeded = results.every(r => r)

    if (allSucceeded) {
      // Update document's own sharedWith metadata
      const document = await this.getDocument(documentId)
      if (document) {
        const now = new Date().toISOString()
        const existingSharedWith = document.sharedWith || []
        const newShares: DocumentShare[] = recipientUserIds.map(userId => ({
          userId,
          permission,
          sharedAt: now,
          sharedBy: sharerName || this.currentUserId
        }))

        // Merge: update existing shares, add new ones
        const updatedSharedWith = [...existingSharedWith]
        for (const share of newShares) {
          const existingIdx = updatedSharedWith.findIndex(s => s.userId === share.userId)
          if (existingIdx >= 0) {
            updatedSharedWith[existingIdx] = share
          } else {
            updatedSharedWith.push(share)
          }
        }

        await this.updateDocument(documentId, { sharedWith: updatedSharedWith })
      }
    } else {
      console.warn('[DocumentStorage] Some shares failed')
    }

    return allSucceeded
  }

  /**
   * Get users a document is shared with
   */
  async getSharedUsers(
    documentId: string
  ): Promise<Array<{ userId: string; userName: string; userEmail: string; permission: string; sharedAt: string }>> {
    try {
      const document = await this.getDocument(documentId)
      if (!document || !document.sharedWith || document.sharedWith.length === 0) {
        return []
      }

      // Return shared users with basic info
      // Note: userName and userEmail will be populated by the UI component
      // that can use employee search/GraphQL to fetch full details
      return document.sharedWith.map(share => ({
        userId: share.userId,
        userName: share.userId, // Placeholder - will be resolved in UI
        userEmail: '', // Placeholder - will be resolved in UI
        permission: share.permission,
        sharedAt: share.sharedAt
      }))
    } catch (error) {
      console.warn('[DocumentStorage] Failed to get shared users:', error)
      return []
    }
  }

  /**
   * Revoke document access for a user
   */
  async revokeAccess(documentId: string, recipientUserId: string): Promise<boolean> {
    // Remove from recipient's sync data
    const syncSuccess = await this.syncService.revokeDocumentAccess(recipientUserId, documentId)

    if (syncSuccess) {
      // Also remove from document's sharedWith metadata
      const document = await this.getDocument(documentId)
      if (document && document.sharedWith) {
        const updatedSharedWith = document.sharedWith.filter(s => s.userId !== recipientUserId)
        await this.updateDocument(documentId, { sharedWith: updatedSharedWith })
      }
    }

    return syncSuccess
  }

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================

  /**
   * Get or create the templates index
   */
  private async getTemplateIndex(): Promise<TemplatesIndex> {
    const localStorageKey = `document-templates-index-${this.currentUserId}`

    const storedInfoStr = localStorage.getItem(localStorageKey)
    if (storedInfoStr) {
      try {
        const storedInfo: StoredIndexInfo = JSON.parse(storedInfoStr)
        if (storedInfo.filePath) {
          const index = await this.readJsonFileByPath<TemplatesIndex>(storedInfo.filePath)
          if (index) {
            if (!storedInfo.fileId) {
              storedInfo.fileId = this.extractFileIdFromPath(storedInfo.filePath)
            }
            this.templateIndexInfo = storedInfo
            return index
          }
          localStorage.removeItem(localStorageKey)
        }
      } catch (e) {
        console.warn('[DocumentStorage] Failed to load template index:', e)
        localStorage.removeItem(localStorageKey)
      }
    }

    return {
      version: 1,
      templates: [],
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Save the templates index
   */
  private async saveTemplateIndex(index: TemplatesIndex): Promise<void> {
    index.updatedAt = new Date().toISOString()
    const file = this.createJsonFile(index, TEMPLATE_INDEX_FILE_NAME)

    try {
      let filePath: string
      let fileId: string
      let existingFileId = this.templateIndexInfo?.fileId

      if (!existingFileId && this.templateIndexInfo?.filePath) {
        existingFileId = this.extractFileIdFromPath(this.templateIndexInfo.filePath)
      }

      if (existingFileId) {
        const response = await fileClient.updateFile(
          file,
          { accessScope: FILE_SCOPE, fileId: existingFileId },
          { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
        )
        filePath = this.normalizeFilePath(response.fileInfo.path)
        fileId = response.fileInfo.fileId
      } else {
        const response = await fileClient.uploadFile(
          file,
          { accessScope: FILE_SCOPE },
          { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
        )
        filePath = this.normalizeFilePath(response.fileInfo.path)
        fileId = response.fileInfo.fileId
      }

      this.templateIndexInfo = { fileId, filePath }
      const localStorageKey = `document-templates-index-${this.currentUserId}`
      localStorage.setItem(localStorageKey, JSON.stringify(this.templateIndexInfo))
    } catch (error) {
      console.error('[DocumentStorage] Failed to save template index:', error)
      throw error
    }
  }

  /**
   * List all templates
   */
  async listTemplates(): Promise<TemplateSummary[]> {
    const index = await this.getTemplateIndex()

    return index.templates
      .filter(t => t.isPublic || t.createdBy === this.currentUserId)
      .map(entry => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        category: entry.category as TemplateSummary['category'],
        tags: entry.tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        createdBy: entry.createdBy,
        isPublic: entry.isPublic,
        usageCount: entry.usageCount
      }))
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    const index = await this.getTemplateIndex()
    const entry = index.templates.find(t => t.id === id)
    if (!entry) return null

    return await this.readJsonFileByPath<DocumentTemplate>(entry.filePath)
  }

  /**
   * Create a new template
   */
  async createTemplate(
    template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Promise<DocumentTemplate | null> {
    const id = generateId('tpl')
    const now = new Date().toISOString()

    const newTemplate: DocumentTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
      usageCount: 0
    }

    const file = this.createJsonFile(newTemplate, `${TEMPLATE_FILE_PREFIX}-${id}.json`)

    try {
      const response = await fileClient.uploadFile(
        file,
        { accessScope: FILE_SCOPE },
        { appName: APP_NAME, folderPath: FOLDER_PATH, mimeType: 'application/json' }
      )

      const filePath = this.normalizeFilePath(response.fileInfo.path)

      const index = await this.getTemplateIndex()
      index.templates.push({
        id,
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        tags: newTemplate.tags,
        createdAt: now,
        updatedAt: now,
        createdBy: this.currentUserId,
        isPublic: newTemplate.isPublic,
        usageCount: 0,
        fileId: response.fileInfo.fileId,
        filePath
      })

      await this.saveTemplateIndex(index)

      return newTemplate
    } catch (error) {
      console.error('[DocumentStorage] Failed to create template:', error)
      return null
    }
  }

  /**
   * Update template usage count
   */
  async incrementTemplateUsage(id: string): Promise<void> {
    const index = await this.getTemplateIndex()
    const entry = index.templates.find(t => t.id === id)
    if (entry) {
      entry.usageCount = (entry.usageCount || 0) + 1
      await this.saveTemplateIndex(index)
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const index = await this.getTemplateIndex()
    const entryIndex = index.templates.findIndex(t => t.id === id)
    if (entryIndex === -1) return false

    const entry = index.templates[entryIndex]
    if (entry.createdBy !== this.currentUserId) {
      console.error('[DocumentStorage] Cannot delete: not owner')
      return false
    }

    try {
      const fileId = this.extractFileIdFromPath(entry.filePath)
      await fileClient.deleteFile({ accessScope: FILE_SCOPE, fileId })

      index.templates.splice(entryIndex, 1)
      await this.saveTemplateIndex(index)

      return true
    } catch (error) {
      console.error('[DocumentStorage] Failed to delete template:', error)
      return false
    }
  }

  /**
   * Create a document from a template
   */
  async createDocumentFromTemplate(templateId: string, title: string): Promise<Document | null> {
    const template = await this.getTemplate(templateId)
    if (!template) return null

    // Increment usage count
    await this.incrementTemplateUsage(templateId)

    // Create document with template content
    return await this.createDocument({
      title,
      description: `Created from template: ${template.name}`,
      content: template.content,
      status: 'draft',
      category: template.category,
      tags: template.tags,
      formatting: template.formatting,
      templateId,
      createdBy: this.currentUserId
    })
  }

  /**
   * Save document as template
   */
  async saveDocumentAsTemplate(
    documentId: string,
    templateName: string,
    category: DocumentTemplate['category'],
    isPublic: boolean
  ): Promise<DocumentTemplate | null> {
    const document = await this.getDocument(documentId)
    if (!document) return null

    return await this.createTemplate({
      name: templateName,
      description: `Template created from: ${document.title}`,
      content: document.content,
      category,
      tags: document.tags,
      formatting: document.formatting,
      isPublic,
      createdBy: this.currentUserId
    })
  }
}
