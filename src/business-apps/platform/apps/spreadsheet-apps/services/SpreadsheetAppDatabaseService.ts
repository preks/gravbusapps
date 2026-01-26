/**
 * Spreadsheet App Database Service
 *
 * Handles persistent storage of spreadsheet apps in the NEWWORK database.
 * Uses ContentEntry as the underlying entity with additionalProperties for app data.
 * Supports sharing apps with other users.
 */

import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { SpreadsheetApp, SpreadsheetAppSummary, SpreadsheetSheet } from '../types'

// Content type identifier for spreadsheet apps
const SPREADSHEET_APP_TYPE = 'spreadsheet-app'

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

/**
 * Sharing permission levels
 */
export type SharePermission = 'view' | 'edit' | 'admin'

/**
 * Share entry for tracking who has access
 */
export interface AppShareEntry {
  userId: string
  permission: SharePermission
  sharedAt: string
  sharedBy: string
}

/**
 * Extended app with sharing metadata
 */
export interface SpreadsheetAppWithSharing extends SpreadsheetApp {
  ownerId: string
  ownerName?: string
  sharedWith: AppShareEntry[]
  isOwner: boolean
  myPermission: SharePermission | 'owner'
}

/**
 * Database service for spreadsheet apps
 */
export class SpreadsheetAppDatabaseService {
  private graphqlClient: GraphQLClient
  private currentUserId: string

  constructor(accessToken: string, currentUserId: string) {
    this.graphqlClient = new GraphQLClient(accessToken)
    this.currentUserId = currentUserId
  }

  /**
   * Get all apps accessible to the current user (owned + shared)
   */
  async getApps(): Promise<SpreadsheetAppSummary[]> {
    // Simpler query - fetch all ContentEntry records created by this user
    // that have our app type marker in additionalProperties
    const query = `
      query GetSpreadsheetApps($userId: uuid!) {
        ContentEntry(
          where: {
            _and: [
              { isDeleted: { _eq: false } },
              { createdBy: { _eq: $userId } }
            ]
          }
          orderBy: [{ updatedAt: DESC }]
          limit: 100
        ) {
          id
          createdAt
          updatedAt
          createdBy
          additionalProperties
        }
      }
    `

    try {
      debugLog('[SpreadsheetApps] Fetching apps for user:', this.currentUserId)

      const result = await this.graphqlClient.request<{
        ContentEntry: Array<{
          id: string
          createdAt: string
          updatedAt: string
          createdBy: string
          additionalProperties: Record<string, unknown> | null
        }>
      }>(query, {
        userId: this.currentUserId
      })

      debugLog('[SpreadsheetApps] Got entries:', result.ContentEntry.length)

      // Filter client-side for our app type
      const spreadsheetApps = result.ContentEntry.filter(entry => {
        const props = entry.additionalProperties
        return props && props.appType === SPREADSHEET_APP_TYPE
      })

      debugLog('[SpreadsheetApps] Filtered to spreadsheet apps:', spreadsheetApps.length)

      return spreadsheetApps.map(entry => this.toSummary(entry))
    } catch (error) {
      console.error('[SpreadsheetApps] Failed to fetch apps:', error)
      throw error
    }
  }

  /**
   * Get a single app by ID
   */
  async getApp(id: string): Promise<SpreadsheetAppWithSharing | null> {
    const query = `
      query GetSpreadsheetAppById($id: uuid!) {
        ContentEntryByPk(id: $id) {
          id
          createdAt
          updatedAt
          createdBy
          additionalProperties
          creatorEmployee {
            id
            displayName
          }
        }
      }
    `

    try {
      const result = await this.graphqlClient.request<{
        ContentEntryByPk: {
          id: string
          createdAt: string
          updatedAt: string
          createdBy: string
          additionalProperties: Record<string, unknown>
          creatorEmployee?: {
            id: string
            displayName: string
          }
        } | null
      }>(query, { id })

      if (!result.ContentEntryByPk) return null

      const entry = result.ContentEntryByPk
      const appData = entry.additionalProperties?.appData as SpreadsheetApp | undefined

      if (!appData) return null

      // Check access
      const sharedWith = (entry.additionalProperties?.sharedWith || []) as AppShareEntry[]
      const isOwner = entry.createdBy === this.currentUserId
      const shareEntry = sharedWith.find(s => s.userId === this.currentUserId)

      if (!isOwner && !shareEntry) {
        throw new Error('Access denied')
      }

      return {
        ...appData,
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        ownerId: entry.createdBy,
        ownerName: entry.creatorEmployee?.displayName,
        sharedWith,
        isOwner,
        myPermission: isOwner ? 'owner' : shareEntry?.permission || 'view'
      }
    } catch (error) {
      console.error('Failed to fetch spreadsheet app:', error)
      throw error
    }
  }

  /**
   * Create a new spreadsheet app
   */
  async createApp(app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpreadsheetAppWithSharing> {
    const mutation = `
      mutation CreateSpreadsheetApp($input: ContentEntryInsertInput!) {
        insertContentEntryOne(object: $input) {
          id
          createdAt
          updatedAt
          createdBy
          additionalProperties
        }
      }
    `

    const input = {
      title: app.name,
      content: app.description || '',
      additionalProperties: {
        appType: SPREADSHEET_APP_TYPE,
        appData: app,
        sharedWith: [],
        sharedWithUserIds: [] // For easier querying
      }
    }

    try {
      const result = await this.graphqlClient.request<{
        insertContentEntryOne: {
          id: string
          createdAt: string
          updatedAt: string
          createdBy: string
          additionalProperties: Record<string, unknown>
        }
      }>(mutation, { input })

      const entry = result.insertContentEntryOne
      const appData = entry.additionalProperties?.appData as SpreadsheetApp

      return {
        ...appData,
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        ownerId: entry.createdBy,
        sharedWith: [],
        isOwner: true,
        myPermission: 'owner'
      }
    } catch (error) {
      console.error('Failed to create spreadsheet app:', error)
      throw error
    }
  }

  /**
   * Update an existing app
   */
  async updateApp(id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetAppWithSharing | null> {
    // First, get the current app to merge updates
    const current = await this.getApp(id)
    if (!current) return null

    // Check permission
    if (!current.isOwner && current.myPermission !== 'edit' && current.myPermission !== 'admin') {
      throw new Error('Permission denied: Cannot edit this app')
    }

    const mutation = `
      mutation UpdateSpreadsheetApp($id: uuid!, $changes: ContentEntrySetInput!) {
        updateContentEntryByPk(pkColumns: { id: $id }, _set: $changes) {
          id
          createdAt
          updatedAt
          createdBy
          additionalProperties
        }
      }
    `

    const updatedAppData = {
      ...current,
      ...updates,
      id: undefined, // Don't include in appData
      ownerId: undefined,
      ownerName: undefined,
      sharedWith: undefined,
      isOwner: undefined,
      myPermission: undefined
    }

    // Clean up undefined fields
    Object.keys(updatedAppData).forEach(key => {
      if (updatedAppData[key as keyof typeof updatedAppData] === undefined) {
        delete updatedAppData[key as keyof typeof updatedAppData]
      }
    })

    const changes = {
      title: updates.name || current.name,
      content: updates.description || current.description || '',
      additionalProperties: {
        appType: SPREADSHEET_APP_TYPE,
        appData: updatedAppData,
        sharedWith: current.sharedWith,
        sharedWithUserIds: current.sharedWith.map(s => s.userId)
      }
    }

    try {
      const result = await this.graphqlClient.request<{
        updateContentEntryByPk: {
          id: string
          createdAt: string
          updatedAt: string
          createdBy: string
          additionalProperties: Record<string, unknown>
        }
      }>(mutation, { id, changes })

      const entry = result.updateContentEntryByPk
      const appData = entry.additionalProperties?.appData as SpreadsheetApp

      return {
        ...appData,
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        ownerId: entry.createdBy,
        sharedWith: current.sharedWith,
        isOwner: current.isOwner,
        myPermission: current.myPermission
      }
    } catch (error) {
      console.error('Failed to update spreadsheet app:', error)
      throw error
    }
  }

  /**
   * Update sheet data within an app
   */
  async updateSheetData(
    appId: string,
    sheetId: string,
    data: Record<string, unknown>[]
  ): Promise<SpreadsheetSheet | null> {
    const app = await this.getApp(appId)
    if (!app) return null

    // Check edit permission
    if (!app.isOwner && app.myPermission !== 'edit' && app.myPermission !== 'admin') {
      throw new Error('Permission denied: Cannot edit this app')
    }

    const sheetIndex = app.sheets.findIndex(s => s.id === sheetId)
    if (sheetIndex === -1) return null

    // Update the sheet data
    const updatedSheets = [...app.sheets]
    updatedSheets[sheetIndex] = {
      ...updatedSheets[sheetIndex],
      data
    }

    await this.updateApp(appId, { sheets: updatedSheets })

    return updatedSheets[sheetIndex]
  }

  /**
   * Delete an app (soft delete)
   */
  async deleteApp(id: string): Promise<boolean> {
    const app = await this.getApp(id)
    if (!app) return false

    // Only owner can delete
    if (!app.isOwner) {
      throw new Error('Permission denied: Only the owner can delete this app')
    }

    const mutation = `
      mutation DeleteSpreadsheetApp($id: uuid!) {
        updateContentEntryByPk(pkColumns: { id: $id }, _set: { isDeleted: true }) {
          id
        }
      }
    `

    try {
      await this.graphqlClient.request(mutation, { id })
      return true
    } catch (error) {
      console.error('Failed to delete spreadsheet app:', error)
      throw error
    }
  }

  /**
   * Share an app with another user
   */
  async shareApp(
    appId: string,
    userId: string,
    permission: SharePermission
  ): Promise<SpreadsheetAppWithSharing | null> {
    const app = await this.getApp(appId)
    if (!app) return null

    // Only owner or admin can share
    if (!app.isOwner && app.myPermission !== 'admin') {
      throw new Error('Permission denied: Only owner or admin can share this app')
    }

    // Check if already shared
    const existingIndex = app.sharedWith.findIndex(s => s.userId === userId)
    const newShareEntry: AppShareEntry = {
      userId,
      permission,
      sharedAt: new Date().toISOString(),
      sharedBy: this.currentUserId
    }

    let updatedSharedWith: AppShareEntry[]
    if (existingIndex >= 0) {
      // Update existing share
      updatedSharedWith = [...app.sharedWith]
      updatedSharedWith[existingIndex] = newShareEntry
    } else {
      // Add new share
      updatedSharedWith = [...app.sharedWith, newShareEntry]
    }

    const mutation = `
      mutation ShareSpreadsheetApp($id: uuid!, $additionalProperties: jsonb!) {
        updateContentEntryByPk(
          pkColumns: { id: $id }
          _set: { additionalProperties: $additionalProperties }
        ) {
          id
          additionalProperties
        }
      }
    `

    const additionalProperties = {
      appType: SPREADSHEET_APP_TYPE,
      appData: app,
      sharedWith: updatedSharedWith,
      sharedWithUserIds: updatedSharedWith.map(s => s.userId)
    }

    try {
      await this.graphqlClient.request(mutation, { id: appId, additionalProperties })
      return this.getApp(appId)
    } catch (error) {
      console.error('Failed to share spreadsheet app:', error)
      throw error
    }
  }

  /**
   * Remove sharing for a user
   */
  async unshareApp(appId: string, userId: string): Promise<SpreadsheetAppWithSharing | null> {
    const app = await this.getApp(appId)
    if (!app) return null

    // Only owner or admin can unshare
    if (!app.isOwner && app.myPermission !== 'admin') {
      throw new Error('Permission denied: Only owner or admin can unshare this app')
    }

    const updatedSharedWith = app.sharedWith.filter(s => s.userId !== userId)

    const mutation = `
      mutation UnshareSpreadsheetApp($id: uuid!, $additionalProperties: jsonb!) {
        updateContentEntryByPk(
          pkColumns: { id: $id }
          _set: { additionalProperties: $additionalProperties }
        ) {
          id
        }
      }
    `

    const additionalProperties = {
      appType: SPREADSHEET_APP_TYPE,
      appData: app,
      sharedWith: updatedSharedWith,
      sharedWithUserIds: updatedSharedWith.map(s => s.userId)
    }

    try {
      await this.graphqlClient.request(mutation, { id: appId, additionalProperties })
      return this.getApp(appId)
    } catch (error) {
      console.error('Failed to unshare spreadsheet app:', error)
      throw error
    }
  }

  /**
   * Get users an app is shared with (for UI)
   */
  async getSharedUsers(appId: string): Promise<
    Array<{
      userId: string
      userName: string
      userEmail: string
      permission: SharePermission
      sharedAt: string
    }>
  > {
    const app = await this.getApp(appId)
    if (!app) return []

    if (app.sharedWith.length === 0) return []

    // Fetch user details
    const userIds = app.sharedWith.map(s => s.userId)

    const query = `
      query GetSharedUsers($userIds: [uuid!]!) {
        Employee(where: { userId: { _in: $userIds } }) {
          userId
          displayName
          workEmail
        }
      }
    `

    try {
      const result = await this.graphqlClient.request<{
        Employee: Array<{
          userId: string
          displayName: string
          workEmail: string
        }>
      }>(query, { userIds })

      const userMap = new Map(result.Employee.map(e => [e.userId, e]))

      return app.sharedWith.map(share => {
        const user = userMap.get(share.userId)
        return {
          userId: share.userId,
          userName: user?.displayName || 'Unknown User',
          userEmail: user?.workEmail || '',
          permission: share.permission,
          sharedAt: share.sharedAt
        }
      })
    } catch (error) {
      console.error('Failed to get shared users:', error)
      return []
    }
  }

  /**
   * Convert database entry to summary
   */
  private toSummary(entry: {
    id: string
    createdAt: string
    updatedAt: string
    createdBy: string
    additionalProperties: Record<string, unknown>
  }): SpreadsheetAppSummary {
    const appData = entry.additionalProperties?.appData as SpreadsheetApp | undefined
    const sharedWith = (entry.additionalProperties?.sharedWith || []) as AppShareEntry[]

    const totalRows = appData?.sheets?.reduce((sum, sheet) => sum + (sheet.data?.length || 0), 0) || 0
    const isOwner = entry.createdBy === this.currentUserId

    return {
      id: entry.id,
      name: appData?.name || 'Untitled App',
      description: appData?.description,
      icon: appData?.icon,
      sheetCount: appData?.sheets?.length || 0,
      rowCount: totalRows,
      status: appData?.status || 'active',
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      createdBy: appData?.createdBy,
      isShared: sharedWith.length > 0,
      isOwner,
      sharedWithCount: sharedWith.length
    }
  }
}

/**
 * Factory function to create a database service instance
 */
export function createSpreadsheetAppDatabaseService(
  accessToken: string,
  currentUserId: string
): SpreadsheetAppDatabaseService {
  return new SpreadsheetAppDatabaseService(accessToken, currentUserId)
}
