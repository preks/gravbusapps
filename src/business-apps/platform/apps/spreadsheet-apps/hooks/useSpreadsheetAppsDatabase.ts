/**
 * useSpreadsheetAppsDatabase Hook
 *
 * Provides database-backed storage for spreadsheet apps with sharing support.
 * Falls back to localStorage when database is unavailable.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  SpreadsheetAppDatabaseService,
  createSpreadsheetAppDatabaseService,
  type SpreadsheetAppWithSharing,
  type SharePermission
} from '../services/SpreadsheetAppDatabaseService'
import { SpreadsheetAppService } from '../services/SpreadsheetAppService'
import type { SpreadsheetApp, SpreadsheetAppSummary, SpreadsheetSheet, AppStatus } from '../types'

export interface UseSpreadsheetAppsDatabaseState {
  apps: SpreadsheetAppSummary[]
  isLoading: boolean
  error: string | null
  currentApp: SpreadsheetAppWithSharing | null
  isOnline: boolean
}

export interface UseSpreadsheetAppsDatabaseResult extends UseSpreadsheetAppsDatabaseState {
  // CRUD operations
  loadApps: () => Promise<void>
  getApp: (id: string) => Promise<SpreadsheetAppWithSharing | null>
  createApp: (app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SpreadsheetAppWithSharing | null>
  updateApp: (id: string, updates: Partial<SpreadsheetApp>) => Promise<SpreadsheetAppWithSharing | null>
  updateSheetData: (appId: string, sheetId: string, data: Record<string, unknown>[]) => Promise<SpreadsheetSheet | null>
  deleteApp: (id: string) => Promise<boolean>
  // Sharing operations
  shareApp: (appId: string, userId: string, permission: SharePermission) => Promise<boolean>
  unshareApp: (appId: string, userId: string) => Promise<boolean>
  getSharedUsers: (appId: string) => Promise<Array<{
    userId: string
    userName: string
    userEmail: string
    permission: SharePermission
    sharedAt: string
  }>>
  // Local storage sync
  syncFromLocalStorage: () => Promise<number>
}

/**
 * Hook for database-backed spreadsheet app management
 */
export function useSpreadsheetAppsDatabase(
  accessToken: string,
  currentUserId: string
): UseSpreadsheetAppsDatabaseResult {
  const [state, setState] = useState<UseSpreadsheetAppsDatabaseState>({
    apps: [],
    isLoading: false,
    error: null,
    currentApp: null,
    isOnline: true
  })

  // Services
  const dbServiceRef = useRef<SpreadsheetAppDatabaseService | null>(null)
  const localServiceRef = useRef<SpreadsheetAppService | null>(null)

  // Initialize services
  useEffect(() => {
    if (accessToken && currentUserId) {
      dbServiceRef.current = createSpreadsheetAppDatabaseService(accessToken, currentUserId)
      localServiceRef.current = new SpreadsheetAppService(accessToken)
    }
  }, [accessToken, currentUserId])

  /**
   * Load all apps
   */
  const loadApps = useCallback(async () => {
    if (!dbServiceRef.current) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const apps = await dbServiceRef.current.getApps()
      setState(prev => ({
        ...prev,
        apps,
        isLoading: false,
        isOnline: true
      }))
    } catch (error) {
      console.warn('Database unavailable, falling back to localStorage:', error)

      // Fallback to localStorage
      if (localServiceRef.current) {
        try {
          const localApps = await localServiceRef.current.getApps()
          setState(prev => ({
            ...prev,
            apps: localApps,
            isLoading: false,
            isOnline: false,
            error: 'Working offline - data stored locally'
          }))
        } catch (localError) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to load apps'
          }))
        }
      }
    }
  }, [])

  /**
   * Get a single app
   */
  const getApp = useCallback(async (id: string): Promise<SpreadsheetAppWithSharing | null> => {
    if (!dbServiceRef.current) return null

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const app = await dbServiceRef.current.getApp(id)
      setState(prev => ({
        ...prev,
        currentApp: app,
        isLoading: false
      }))
      return app
    } catch (error) {
      // Fallback to localStorage
      if (localServiceRef.current) {
        const localApp = await localServiceRef.current.getApp(id)
        if (localApp) {
          const appWithSharing: SpreadsheetAppWithSharing = {
            ...localApp,
            ownerId: currentUserId,
            sharedWith: [],
            isOwner: true,
            myPermission: 'owner'
          }
          setState(prev => ({
            ...prev,
            currentApp: appWithSharing,
            isLoading: false,
            isOnline: false
          }))
          return appWithSharing
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load app'
      }))
      return null
    }
  }, [currentUserId])

  /**
   * Create a new app
   */
  const createApp = useCallback(
    async (
      app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<SpreadsheetAppWithSharing | null> => {
      if (!dbServiceRef.current) return null

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const newApp = await dbServiceRef.current.createApp(app)

        // Refresh app list
        await loadApps()

        setState(prev => ({
          ...prev,
          currentApp: newApp,
          isLoading: false
        }))

        return newApp
      } catch (error) {
        console.warn('Database create failed, using localStorage:', error)

        // Fallback to localStorage
        if (localServiceRef.current) {
          const localApp = await localServiceRef.current.createApp(app)
          const appWithSharing: SpreadsheetAppWithSharing = {
            ...localApp,
            ownerId: currentUserId,
            sharedWith: [],
            isOwner: true,
            myPermission: 'owner'
          }

          // Refresh local apps
          const localApps = await localServiceRef.current.getApps()

          setState(prev => ({
            ...prev,
            apps: localApps,
            currentApp: appWithSharing,
            isLoading: false,
            isOnline: false,
            error: 'App saved locally - will sync when online'
          }))

          return appWithSharing
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to create app'
        }))
        return null
      }
    },
    [loadApps, currentUserId]
  )

  /**
   * Update an app
   */
  const updateApp = useCallback(
    async (id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetAppWithSharing | null> => {
      if (!dbServiceRef.current) return null

      try {
        const updatedApp = await dbServiceRef.current.updateApp(id, updates)

        if (updatedApp) {
          setState(prev => ({
            ...prev,
            currentApp: updatedApp
          }))

          // Refresh app list
          await loadApps()
        }

        return updatedApp
      } catch (error) {
        // Fallback to localStorage
        if (localServiceRef.current) {
          const localApp = await localServiceRef.current.updateApp(id, updates)
          if (localApp) {
            const appWithSharing: SpreadsheetAppWithSharing = {
              ...localApp,
              ownerId: currentUserId,
              sharedWith: [],
              isOwner: true,
              myPermission: 'owner'
            }
            setState(prev => ({
              ...prev,
              currentApp: appWithSharing,
              isOnline: false
            }))
            return appWithSharing
          }
        }

        console.error('Failed to update app:', error)
        return null
      }
    },
    [loadApps, currentUserId]
  )

  /**
   * Update sheet data
   */
  const updateSheetData = useCallback(
    async (
      appId: string,
      sheetId: string,
      data: Record<string, unknown>[]
    ): Promise<SpreadsheetSheet | null> => {
      if (!dbServiceRef.current) return null

      try {
        const updatedSheet = await dbServiceRef.current.updateSheetData(appId, sheetId, data)

        if (updatedSheet && state.currentApp) {
          // Update local state
          const updatedSheets = state.currentApp.sheets.map(s =>
            s.id === sheetId ? updatedSheet : s
          )
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? { ...prev.currentApp, sheets: updatedSheets }
              : null
          }))
        }

        return updatedSheet
      } catch (error) {
        // Fallback to localStorage
        if (localServiceRef.current) {
          return localServiceRef.current.updateSheetData(appId, sheetId, data)
        }

        console.error('Failed to update sheet data:', error)
        return null
      }
    },
    [state.currentApp]
  )

  /**
   * Delete an app
   */
  const deleteApp = useCallback(
    async (id: string): Promise<boolean> => {
      if (!dbServiceRef.current) return false

      try {
        const success = await dbServiceRef.current.deleteApp(id)

        if (success) {
          setState(prev => ({
            ...prev,
            apps: prev.apps.filter(app => app.id !== id),
            currentApp: prev.currentApp?.id === id ? null : prev.currentApp
          }))
        }

        return success
      } catch (error) {
        // Fallback to localStorage
        if (localServiceRef.current) {
          const success = await localServiceRef.current.deleteApp(id)
          if (success) {
            const localApps = await localServiceRef.current.getApps()
            setState(prev => ({
              ...prev,
              apps: localApps,
              currentApp: prev.currentApp?.id === id ? null : prev.currentApp,
              isOnline: false
            }))
          }
          return success
        }

        console.error('Failed to delete app:', error)
        return false
      }
    },
    []
  )

  /**
   * Share an app with a user
   */
  const shareApp = useCallback(
    async (appId: string, userId: string, permission: SharePermission): Promise<boolean> => {
      if (!dbServiceRef.current) {
        console.error('Database service not available')
        return false
      }

      try {
        const updatedApp = await dbServiceRef.current.shareApp(appId, userId, permission)

        if (updatedApp) {
          setState(prev => ({
            ...prev,
            currentApp: updatedApp
          }))
        }

        return !!updatedApp
      } catch (error) {
        console.error('Failed to share app:', error)
        return false
      }
    },
    []
  )

  /**
   * Remove sharing for a user
   */
  const unshareApp = useCallback(
    async (appId: string, userId: string): Promise<boolean> => {
      if (!dbServiceRef.current) return false

      try {
        const updatedApp = await dbServiceRef.current.unshareApp(appId, userId)

        if (updatedApp) {
          setState(prev => ({
            ...prev,
            currentApp: updatedApp
          }))
        }

        return !!updatedApp
      } catch (error) {
        console.error('Failed to unshare app:', error)
        return false
      }
    },
    []
  )

  /**
   * Get shared users for an app
   */
  const getSharedUsers = useCallback(
    async (appId: string) => {
      if (!dbServiceRef.current) return []

      try {
        return await dbServiceRef.current.getSharedUsers(appId)
      } catch (error) {
        console.error('Failed to get shared users:', error)
        return []
      }
    },
    []
  )

  /**
   * Sync apps from localStorage to database
   */
  const syncFromLocalStorage = useCallback(async (): Promise<number> => {
    if (!dbServiceRef.current || !localServiceRef.current) return 0

    try {
      const localApps = await localServiceRef.current.getApps()
      let syncCount = 0

      for (const summary of localApps) {
        const fullApp = await localServiceRef.current.getApp(summary.id)
        if (fullApp) {
          try {
            await dbServiceRef.current.createApp(fullApp)
            // Delete from localStorage after successful sync
            await localServiceRef.current.deleteApp(summary.id)
            syncCount++
          } catch (syncError) {
            console.warn(`Failed to sync app ${summary.name}:`, syncError)
          }
        }
      }

      // Refresh app list
      await loadApps()

      return syncCount
    } catch (error) {
      console.error('Sync failed:', error)
      return 0
    }
  }, [loadApps])

  // Auto-load apps on mount
  useEffect(() => {
    if (accessToken && currentUserId) {
      loadApps()
    }
  }, [accessToken, currentUserId, loadApps])

  return {
    ...state,
    loadApps,
    getApp,
    createApp,
    updateApp,
    updateSheetData,
    deleteApp,
    shareApp,
    unshareApp,
    getSharedUsers,
    syncFromLocalStorage
  }
}

export default useSpreadsheetAppsDatabase
