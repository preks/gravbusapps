/**
 * useSpreadsheetApps Hook
 *
 * Manages CRUD operations for spreadsheet apps using the document-service backend API.
 * Data is persisted to the PostgreSQL database via the NestJS backend.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetApp, SpreadsheetAppSummary, SpreadsheetSheet, AppStatus } from '../types'

export interface UseSpreadsheetAppsState {
  apps: SpreadsheetAppSummary[]
  currentApp: SpreadsheetApp | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  storageMode: 'database' | 'local'
  currentAppPermission: 'owner' | 'edit' | 'view' | null
}

export interface UseSpreadsheetAppsResult extends UseSpreadsheetAppsState {
  loadApps: () => Promise<void>
  refreshApps: () => Promise<void>
  loadApp: (id: string, directFilePath?: string) => Promise<SpreadsheetApp | null>
  createApp: (app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SpreadsheetApp | null>
  updateApp: (id: string, updates: Partial<SpreadsheetApp>) => Promise<SpreadsheetApp | null>
  deleteApp: (id: string) => Promise<boolean>
  duplicateApp: (id: string, newName?: string) => Promise<SpreadsheetApp | null>
  updateSheetData: (appId: string, sheetId: string, data: Record<string, unknown>[]) => Promise<SpreadsheetSheet | null>
  updateSheet: (appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>) => Promise<SpreadsheetSheet | null>
  addRow: (appId: string, sheetId: string, row: Record<string, unknown>) => Promise<Record<string, unknown> | null>
  updateRow: (
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  deleteRow: (appId: string, sheetId: string, rowId: string) => Promise<boolean>
  updateStatus: (appId: string, status: AppStatus) => Promise<SpreadsheetApp | null>
  exportApp: (id: string) => Promise<string | null>
  importApp: (jsonData: string) => Promise<SpreadsheetApp | null>
  shareApp: (
    appId: string,
    shares: Array<{ userId: string; permission: 'view' | 'edit' | 'admin' }>
  ) => Promise<boolean>
  getSharedUsers: (appId: string) => Promise<
    Array<{
      id: string
      userId: string
      userName: string
      userEmail: string
      permission: 'view' | 'edit' | 'admin'
      sharedAt: string
      sharedBy: string
    }>
  >
  revokeAccess: (shareId: string) => Promise<boolean>
  clearCurrentApp: () => void
}

/**
 * Hook for managing spreadsheet apps using the document-service backend
 */
export function useSpreadsheetApps(accessToken: string, userId?: string): UseSpreadsheetAppsResult {
  const [state, setState] = useState<UseSpreadsheetAppsState>({
    apps: [],
    currentApp: null,
    isLoading: false,
    isSaving: false,
    error: null,
    storageMode: 'database',
    currentAppPermission: null
  })

  /**
   * Load all apps from the backend (paginated fetch, max 100 per request)
   */
  const loadApps = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('[useSpreadsheetApps] Loading apps from document-service backend')

      const PAGE_SIZE = 100
      let allApps: Awaited<ReturnType<typeof SpreadsheetApiService.listApps>> = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const pageItems = await SpreadsheetApiService.listApps({ limit: PAGE_SIZE, page })
        allApps = [...allApps, ...pageItems]
        hasMore = pageItems.length === PAGE_SIZE
        page++
      }

      setState(prev => ({
        ...prev,
        apps: allApps,
        isLoading: false,
        storageMode: 'database'
      }))
      console.log('[useSpreadsheetApps] Apps loaded from database:', allApps.length)
    } catch (error) {
      console.error('[useSpreadsheetApps] Failed to load apps:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load apps'
      }))
    }
  }, [accessToken])

  /**
   * Refresh apps (alias for loadApps)
   */
  const refreshApps = loadApps

  /**
   * Load a single app by ID
   */
  const loadApp = useCallback(
    async (id: string): Promise<SpreadsheetApp | null> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }))
        return null
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const app = await SpreadsheetApiService.getApp(id)
        if (!app) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'App not found or access denied'
          }))
          return null
        }

        // Load row data for each sheet
        for (const sheet of app.sheets) {
          const rows = await SpreadsheetApiService.getRows(id, sheet.id)
          sheet.data = rows
        }

        // Use permission from API response (already mapped: admin -> owner)
        const isOwner = app.createdBy === userId
        const backendPermission = app.permission
        const resolvedPermission: 'owner' | 'edit' | 'view' | null = isOwner
          ? 'owner'
          : backendPermission === 'owner'
            ? 'owner'
            : backendPermission === 'admin'
              ? 'owner'
              : backendPermission === 'edit'
                ? 'edit'
                : backendPermission === 'view'
                  ? 'view'
                  : null

        console.log('[useSpreadsheetApps] loadApp:', {
          id,
          createdBy: app.createdBy,
          userId,
          isOwner,
          backendPermission,
          resolvedPermission
        })

        setState(prev => ({
          ...prev,
          currentApp: app,
          isLoading: false,
          storageMode: 'database',
          currentAppPermission: resolvedPermission
        }))
        return app
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to load app:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load app'
        }))
        return null
      }
    },
    [accessToken, userId]
  )

  /**
   * Create a new app
   */
  const createApp = useCallback(
    async (app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpreadsheetApp | null> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Not authenticated' }))
        return null
      }

      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        console.log('[useSpreadsheetApps] Creating app via document-service backend')
        const newApp = await SpreadsheetApiService.createApp(app)
        setState(prev => ({
          ...prev,
          currentApp: newApp,
          isSaving: false,
          storageMode: 'database',
          currentAppPermission: 'owner' // Creator is always the owner
        }))

        toast.success('App saved to database!')
        await loadApps()
        return newApp
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to create app:', error)
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to create app'
        }))
        toast.error('Failed to save app')
        return null
      }
    },
    [accessToken, loadApps]
  )

  /**
   * Update an existing app
   */
  const updateApp = useCallback(
    async (id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp | null> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Not authenticated' }))
        return null
      }

      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        const updatedApp = await SpreadsheetApiService.updateApp(id, updates)
        if (updatedApp) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp?.id === id ? updatedApp : prev.currentApp,
            apps: prev.apps.map(app =>
              app.id === id
                ? {
                    ...app,
                    name: updatedApp.name,
                    description: updatedApp.description,
                    status: updatedApp.status,
                    updatedAt: updatedApp.updatedAt
                  }
                : app
            ),
            isSaving: false,
            storageMode: 'database'
          }))
        }
        return updatedApp
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to update app:', error)
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to update app'
        }))
        return null
      }
    },
    [accessToken]
  )

  /**
   * Delete an app
   */
  const deleteApp = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Not authenticated' }))
        return false
      }

      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        const success = await SpreadsheetApiService.deleteApp(id)
        if (success) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp?.id === id ? null : prev.currentApp,
            isSaving: false
          }))
          toast.success('App deleted')
          await loadApps()
        }
        return success
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to delete app:', error)
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to delete app'
        }))
        return false
      }
    },
    [accessToken, loadApps]
  )

  /**
   * Duplicate an app
   */
  const duplicateApp = useCallback(
    async (id: string): Promise<SpreadsheetApp | null> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Not authenticated' }))
        return null
      }

      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        const duplicatedApp = await SpreadsheetApiService.duplicateApp(id)
        if (duplicatedApp) {
          toast.success('App duplicated')
          await loadApps()
        }
        setState(prev => ({ ...prev, isSaving: false }))
        return duplicatedApp
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to duplicate app:', error)
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to duplicate app'
        }))
        return null
      }
    },
    [accessToken, loadApps]
  )

  /**
   * Check if a string is a valid UUID
   */
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  /**
   * Update sheet data (bulk update rows)
   */
  const updateSheetData = useCallback(
    async (appId: string, sheetId: string, data: Record<string, unknown>[]): Promise<SpreadsheetSheet | null> => {
      if (!accessToken) return null

      try {
        // For bulk updates, we need to update each row or use bulk add
        const sheet = await SpreadsheetApiService.getSheet(appId, sheetId)
        if (!sheet) return null

        // Update rows in bulk via the API
        for (const row of data) {
          const rowId = row._id as string | undefined
          // Only update if row has a valid UUID ID (was created via API)
          // Otherwise add as new row (for locally-created rows with non-UUID IDs)
          if (rowId && isValidUUID(rowId)) {
            try {
              await SpreadsheetApiService.updateRow(appId, sheetId, rowId, row)
            } catch (updateErr) {
              // Some local rows carry UUID-like temp IDs that are not persisted in backend.
              // Fall back to addRow so bulk updates can self-heal instead of looping on 404.
              console.warn('[useSpreadsheetApps] updateRow failed in updateSheetData, falling back to addRow', {
                appId,
                sheetId,
                rowId,
                error: updateErr instanceof Error ? updateErr.message : String(updateErr)
              })
              const rowWithoutId = { ...row }
              delete (rowWithoutId as Record<string, unknown>)._id
              await SpreadsheetApiService.addRow(appId, sheetId, rowWithoutId)
            }
          } else {
            // Remove the local non-UUID _id before adding via API
            const rowWithoutId = { ...row }
            delete (rowWithoutId as Record<string, unknown>)._id
            await SpreadsheetApiService.addRow(appId, sheetId, rowWithoutId)
          }
        }

        // Refresh the sheet data
        const updatedRows = await SpreadsheetApiService.getRows(appId, sheetId)
        const updatedSheet = { ...sheet, data: updatedRows }

        if (state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.map(s => (s.id === sheetId ? updatedSheet : s))
                }
              : null
          }))
        }

        return updatedSheet
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to update sheet data:', error)
        return null
      }
    },
    [accessToken, state.currentApp]
  )

  /**
   * Update sheet metadata (columns, views, settings, etc.)
   */
  const updateSheet = useCallback(
    async (appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>): Promise<SpreadsheetSheet | null> => {
      if (!accessToken) return null

      try {
        const updatedSheet = await SpreadsheetApiService.updateSheet(appId, sheetId, updates)

        // Update local state
        if (state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.map(s => (s.id === sheetId ? { ...s, ...updatedSheet } : s))
                }
              : null
          }))
        }

        return updatedSheet
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to update sheet:', error)
        return null
      }
    },
    [accessToken, state.currentApp]
  )

  /**
   * Add a row to a sheet
   */
  const addRow = useCallback(
    async (appId: string, sheetId: string, row: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
      if (!accessToken) return null

      try {
        const newRow = await SpreadsheetApiService.addRow(appId, sheetId, row)

        if (state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.map(s => (s.id === sheetId ? { ...s, data: [...s.data, newRow] } : s))
                }
              : null
          }))
        }

        return newRow
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to add row:', error)
        return null
      }
    },
    [accessToken, state.currentApp]
  )

  /**
   * Update a row in a sheet
   */
  const updateRow = useCallback(
    async (
      appId: string,
      sheetId: string,
      rowId: string,
      updates: Record<string, unknown>
    ): Promise<Record<string, unknown> | null> => {
      if (!accessToken) return null

      try {
        const updatedRow = await SpreadsheetApiService.updateRow(appId, sheetId, rowId, updates)

        if (state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.map(s =>
                    s.id === sheetId
                      ? { ...s, data: s.data.map(r => ((r._id as string) === rowId ? updatedRow : r)) }
                      : s
                  )
                }
              : null
          }))
        }

        return updatedRow
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to update row:', error)
        return null
      }
    },
    [accessToken, state.currentApp]
  )

  /**
   * Delete a row from a sheet
   */
  const deleteRow = useCallback(
    async (appId: string, sheetId: string, rowId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await SpreadsheetApiService.deleteRow(appId, sheetId, rowId)

        if (success && state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.map(s =>
                    s.id === sheetId ? { ...s, data: s.data.filter(r => (r._id as string) !== rowId) } : s
                  )
                }
              : null
          }))
        }

        return success
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to delete row:', error)
        return false
      }
    },
    [accessToken, state.currentApp]
  )

  /**
   * Update app status
   */
  const updateStatus = useCallback(
    async (appId: string, status: AppStatus): Promise<SpreadsheetApp | null> => {
      return updateApp(appId, { status })
    },
    [updateApp]
  )

  /**
   * Export app as JSON
   */
  const exportApp = useCallback(
    async (id: string): Promise<string | null> => {
      if (!accessToken) return null

      try {
        const app = await SpreadsheetApiService.getApp(id)
        if (!app) return null
        return JSON.stringify(app, null, 2)
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to export app:', error)
        return null
      }
    },
    [accessToken]
  )

  /**
   * Import app from JSON
   */
  const importApp = useCallback(
    async (jsonData: string): Promise<SpreadsheetApp | null> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Not authenticated' }))
        return null
      }

      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        const appData = JSON.parse(jsonData)
        // Remove id and timestamps to create a new app
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...appWithoutId } = appData
        const importedApp = await SpreadsheetApiService.createApp(appWithoutId)
        if (importedApp) {
          toast.success('App imported')
          await loadApps()
        }
        setState(prev => ({ ...prev, isSaving: false }))
        return importedApp
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to import app:', error)
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to import app'
        }))
        return null
      }
    },
    [accessToken, loadApps]
  )

  /**
   * Share an app with users
   */
  const shareApp = useCallback(
    async (
      appId: string,
      shares: Array<{ userId: string; permission: 'view' | 'edit' | 'admin' }>
    ): Promise<boolean> => {
      if (!accessToken) {
        toast.error('Not authenticated')
        return false
      }

      if (shares.length === 0) {
        toast.error('Please select at least one user to share with')
        return false
      }

      try {
        const success = await SpreadsheetApiService.shareApp(appId, shares)
        if (success) {
          const uniqueRecipients = new Set(shares.map(share => share.userId)).size
          toast.success(`App shared successfully with ${uniqueRecipients} ${uniqueRecipients === 1 ? 'user' : 'users'}`)
        } else {
          toast.error('Failed to share app')
        }
        return success
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to share app:', error)
        toast.error('Failed to share app')
        return false
      }
    },
    [accessToken]
  )

  /**
   * Get users an app is shared with
   */
  const getSharedUsers = useCallback(
    async (
      appId: string
    ): Promise<
      Array<{
        id: string
        userId: string
        userName: string
        userEmail: string
        permission: 'view' | 'edit'
        sharedAt: string
        sharedBy: string
      }>
    > => {
      if (!accessToken) {
        return []
      }

      try {
        const shares = await SpreadsheetApiService.getSharedUsers(appId)
        return shares.map(s => ({
          id: s.id,
          userId: s.userId,
          userName: '', // Backend doesn't return user details, will be fetched separately
          userEmail: '',
          permission: s.permission as 'view' | 'edit' | 'admin',
          sharedAt: s.sharedAt,
          sharedBy: s.sharedBy
        }))
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to get shared users:', error)
        return []
      }
    },
    [accessToken]
  )

  /**
   * Revoke a user's access to an app (by share ID)
   */
  const revokeAccess = useCallback(
    async (shareId: string): Promise<boolean> => {
      if (!accessToken) {
        toast.error('Not authenticated')
        return false
      }

      try {
        const success = await SpreadsheetApiService.revokeShare(shareId)
        if (success) {
          toast.success('Access revoked')
        } else {
          toast.error('Failed to revoke access')
        }
        return success
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to revoke access:', error)
        toast.error('Failed to revoke access')
        return false
      }
    },
    [accessToken]
  )

  /**
   * Clear current app
   */
  const clearCurrentApp = useCallback(() => {
    setState(prev => ({ ...prev, currentApp: null, currentAppPermission: null }))
  }, [])

  // Load apps on mount
  useEffect(() => {
    if (accessToken) {
      loadApps()
    }
  }, [accessToken, loadApps])

  return {
    ...state,
    loadApps,
    refreshApps,
    loadApp,
    createApp,
    updateApp,
    deleteApp,
    duplicateApp,
    updateSheetData,
    updateSheet,
    addRow,
    updateRow,
    deleteRow,
    updateStatus,
    exportApp,
    importApp,
    shareApp,
    revokeAccess,
    getSharedUsers,
    clearCurrentApp
  }
}
