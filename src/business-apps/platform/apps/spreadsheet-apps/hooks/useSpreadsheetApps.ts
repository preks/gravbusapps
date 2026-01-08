/**
 * useSpreadsheetApps Hook
 *
 * Manages CRUD operations for spreadsheet apps using the File Storage Service.
 * Data is persisted to the NEWWORK File Service (database-backed).
 * Falls back to localStorage if file service is unavailable.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { SpreadsheetAppService } from '../services/SpreadsheetAppService'
import { createSpreadsheetFileStorageService, SpreadsheetFileStorageService } from '../services/SpreadsheetFileStorageService'
import type { SpreadsheetApp, SpreadsheetAppSummary, SpreadsheetSheet, AppStatus } from '../types'

export interface UseSpreadsheetAppsState {
  apps: SpreadsheetAppSummary[]
  currentApp: SpreadsheetApp | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  storageMode: 'database' | 'local' // Indicates where data is being stored
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
  shareApp: (appId: string, recipientUserIds: string[], permission?: 'view' | 'edit', ownerName?: string) => Promise<boolean>
  getSharedUsers: (appId: string) => Promise<Array<{
    userId: string
    userName: string
    userEmail: string
    permission: 'view' | 'edit'
    sharedAt: string
  }>>
  revokeAccess: (appId: string, recipientUserId: string) => Promise<boolean>
  clearCurrentApp: () => void
}

/**
 * Hook for managing spreadsheet apps
 * Attempts to use File Service (database) first, falls back to localStorage
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

  // Service references
  const fileStorageRef = useRef<SpreadsheetFileStorageService | null>(null)
  const localStorageRef = useRef<SpreadsheetAppService | null>(null)

  // Initialize services
  useEffect(() => {
    if (accessToken && userId) {
      fileStorageRef.current = createSpreadsheetFileStorageService(accessToken, userId)
    }
    localStorageRef.current = new SpreadsheetAppService(accessToken)
  }, [accessToken, userId])

  /**
   * Get the appropriate storage service
   */
  const getService = useCallback(() => {
    // Prefer file storage if available
    if (fileStorageRef.current) {
      return { service: fileStorageRef.current, mode: 'database' as const }
    }
    // Fallback to localStorage
    return { service: localStorageRef.current!, mode: 'local' as const }
  }, [])

  /**
   * Load all apps
   */
  const loadApps = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const { service, mode } = getService()
    if (!service) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Storage service not initialized' }))
      return
    }

    try {
      console.log('[useSpreadsheetApps] Loading apps using:', mode)
      const apps = await service.getApps()
      setState(prev => ({
        ...prev,
        apps,
        isLoading: false,
        storageMode: mode
      }))

      if (mode === 'database') {
        console.log('[useSpreadsheetApps] Apps loaded from database (file storage)')
      }
    } catch (error) {
      console.error('[useSpreadsheetApps] File storage failed, trying localStorage:', error)

      // Fallback to localStorage
      try {
        const localService = localStorageRef.current
        if (localService) {
          const apps = await localService.getApps()
          setState(prev => ({
            ...prev,
            apps,
            isLoading: false,
            storageMode: 'local',
            error: 'Using local storage (file service unavailable)'
          }))
          toast.warning('Using local storage - file service unavailable')
        }
      } catch (localError) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load apps'
        }))
      }
    }
  }, [getService])

  /**
   * Refresh apps (alias for loadApps)
   */
  const refreshApps = loadApps

  /**
   * Load a single app by ID
   * @param id - App ID
   * @param directFilePath - Optional direct file path for cross-device access via URL
   */
  const loadApp = useCallback(
    async (id: string, directFilePath?: string): Promise<SpreadsheetApp | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const { service, mode } = getService()
      if (!service) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Storage service not initialized' }))
        return null
      }

      try {
        // Pass directFilePath for cross-device loading
        const app = await service.getApp(id, directFilePath)
        if (!app) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'App not found or access denied'
          }))
          return null
        }
        
        // Get permission info if service supports it
        let userPermission: 'owner' | 'edit' | 'view' | null = null
        if ('getUserPermission' in service && typeof service.getUserPermission === 'function') {
          userPermission = service.getUserPermission(app)
        }
        
        setState(prev => ({ 
          ...prev, 
          currentApp: app, 
          isLoading: false, 
          storageMode: mode,
          currentAppPermission: userPermission
        }))
        return app
      } catch (error) {
        // Try localStorage fallback
        try {
          const localService = localStorageRef.current
          if (localService) {
            const app = await localService.getApp(id)
            setState(prev => ({ ...prev, currentApp: app, isLoading: false, storageMode: 'local', currentAppPermission: app?.createdBy === userId ? 'owner' : null }))
            return app
          }
        } catch {
          // ignore
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load app'
        }))
        return null
      }
    },
    [getService, userId]
  )

  /**
   * Create a new app
   */
  const createApp = useCallback(
    async (app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpreadsheetApp | null> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      const { service, mode } = getService()
      if (!service) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Storage service not initialized' }))
        return null
      }

      try {
        console.log('[useSpreadsheetApps] Creating app using:', mode)
        const newApp = await service.createApp(app)
        setState(prev => ({
          ...prev,
          currentApp: newApp,
          isSaving: false,
          storageMode: mode
        }))

        // Show success message
        if (mode === 'database') {
          toast.success('App saved to database!')
        } else {
          toast.info('App saved locally')
        }

        // Refresh the list
        await loadApps()
        return newApp
      } catch (error) {
        console.error('[useSpreadsheetApps] File storage create failed:', error)

        // Try localStorage fallback
        try {
          const localService = localStorageRef.current
          if (localService) {
            const newApp = await localService.createApp(app)
            setState(prev => ({
              ...prev,
              currentApp: newApp,
              isSaving: false,
              storageMode: 'local'
            }))
            toast.warning('Saved locally (file service unavailable)')
            await loadApps()
            return newApp
          }
        } catch (localError) {
          console.error('[useSpreadsheetApps] localStorage fallback also failed:', localError)
        }

        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to create app'
        }))
        toast.error('Failed to save app')
        return null
      }
    },
    [getService, loadApps]
  )

  /**
   * Update an existing app
   */
  const updateApp = useCallback(
    async (id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp | null> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      const { service, mode } = getService()
      if (!service) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Storage service not initialized' }))
        return null
      }

      try {
        const updatedApp = await service.updateApp(id, updates)
        if (updatedApp) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp?.id === id ? updatedApp : prev.currentApp,
            isSaving: false,
            storageMode: mode
          }))
          // Refresh the list
          await loadApps()
        }
        return updatedApp
      } catch (error) {
        // Try localStorage fallback
        try {
          const localService = localStorageRef.current
          if (localService) {
            const updatedApp = await localService.updateApp(id, updates)
            if (updatedApp) {
              setState(prev => ({
                ...prev,
                currentApp: prev.currentApp?.id === id ? updatedApp : prev.currentApp,
                isSaving: false,
                storageMode: 'local'
              }))
              await loadApps()
              return updatedApp
            }
          }
        } catch {
          // ignore
        }

        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to update app'
        }))
        return null
      }
    },
    [getService, loadApps]
  )

  /**
   * Delete an app
   */
  const deleteApp = useCallback(
    async (id: string): Promise<boolean> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      const { service } = getService()
      if (!service) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Storage service not initialized' }))
        return false
      }

      try {
        const success = await service.deleteApp(id)
        if (success) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp?.id === id ? null : prev.currentApp,
            isSaving: false
          }))
          toast.success('App deleted')
          // Refresh the list
          await loadApps()
        }
        return success
      } catch (error) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to delete app'
        }))
        return false
      }
    },
    [getService, loadApps]
  )

  /**
   * Duplicate an app
   */
  const duplicateApp = useCallback(
    async (id: string, newName?: string): Promise<SpreadsheetApp | null> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      const { service, mode } = getService()
      if (!service) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Storage service not initialized' }))
        return null
      }

      try {
        const duplicatedApp = await service.duplicateApp(id, newName)
        if (duplicatedApp) {
          toast.success('App duplicated')
          // Refresh the list
          await loadApps()
        }
        setState(prev => ({ ...prev, isSaving: false }))
        return duplicatedApp
      } catch (error) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to duplicate app'
        }))
        return null
      }
    },
    [getService, loadApps]
  )

  /**
   * Update sheet data
   */
  const updateSheetData = useCallback(
    async (appId: string, sheetId: string, data: Record<string, unknown>[]): Promise<SpreadsheetSheet | null> => {
      const { service } = getService()
      if (!service) return null

      // For file storage, we need to update the whole app
      const app = state.currentApp?.id === appId ? state.currentApp : await service.getApp(appId)
      if (!app) return null

      const sheetIndex = app.sheets.findIndex(s => s.id === sheetId)
      if (sheetIndex === -1) return null

      const updatedSheet = { ...app.sheets[sheetIndex], data }
      const updatedSheets = [...app.sheets]
      updatedSheets[sheetIndex] = updatedSheet

      try {
        const updatedApp = await service.updateApp(appId, { sheets: updatedSheets })
        if (updatedApp && state.currentApp?.id === appId) {
          // Update local state
          setState(prev => ({
            ...prev,
            currentApp: updatedApp
          }))
        }
        return updatedSheet
      } catch (error) {
        console.error('Failed to update sheet data:', error)
        return null
      }
    },
    [getService, state.currentApp]
  )

  /**
   * Add a row to a sheet
   */
  const addRow = useCallback(
    async (appId: string, sheetId: string, row: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
      const { service } = getService()
      if (!service) return null

      const app = state.currentApp?.id === appId ? state.currentApp : await service.getApp(appId)
      if (!app) return null

      const sheetIndex = app.sheets.findIndex(s => s.id === sheetId)
      if (sheetIndex === -1) return null

      const newRow = {
        ...row,
        _id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        _createdAt: new Date().toISOString()
      }

      const updatedSheets = [...app.sheets]
      updatedSheets[sheetIndex] = {
        ...updatedSheets[sheetIndex],
        data: [...updatedSheets[sheetIndex].data, newRow]
      }

      try {
        const updatedApp = await service.updateApp(appId, { sheets: updatedSheets })
        if (updatedApp && state.currentApp?.id === appId) {
          setState(prev => ({ ...prev, currentApp: updatedApp }))
        }
        return newRow
      } catch (error) {
        console.error('Failed to add row:', error)
        return null
      }
    },
    [getService, state.currentApp]
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
      const { service } = getService()
      if (!service) return null

      const app = state.currentApp?.id === appId ? state.currentApp : await service.getApp(appId)
      if (!app) return null

      const sheetIndex = app.sheets.findIndex(s => s.id === sheetId)
      if (sheetIndex === -1) return null

      const rowIndex = app.sheets[sheetIndex].data.findIndex(r => r._id === rowId)
      if (rowIndex === -1) return null

      const updatedRow = {
        ...app.sheets[sheetIndex].data[rowIndex],
        ...updates,
        _updatedAt: new Date().toISOString()
      }

      const updatedSheets = [...app.sheets]
      const updatedData = [...updatedSheets[sheetIndex].data]
      updatedData[rowIndex] = updatedRow
      updatedSheets[sheetIndex] = { ...updatedSheets[sheetIndex], data: updatedData }

      try {
        const updatedApp = await service.updateApp(appId, { sheets: updatedSheets })
        if (updatedApp && state.currentApp?.id === appId) {
          setState(prev => ({ ...prev, currentApp: updatedApp }))
        }
        return updatedRow
      } catch (error) {
        console.error('Failed to update row:', error)
        return null
      }
    },
    [getService, state.currentApp]
  )

  /**
   * Delete a row from a sheet
   */
  const deleteRow = useCallback(
    async (appId: string, sheetId: string, rowId: string): Promise<boolean> => {
      const { service } = getService()
      if (!service) return false

      const app = state.currentApp?.id === appId ? state.currentApp : await service.getApp(appId)
      if (!app) return false

      const sheetIndex = app.sheets.findIndex(s => s.id === sheetId)
      if (sheetIndex === -1) return false

      const updatedSheets = [...app.sheets]
      updatedSheets[sheetIndex] = {
        ...updatedSheets[sheetIndex],
        data: updatedSheets[sheetIndex].data.filter(r => r._id !== rowId)
      }

      try {
        const updatedApp = await service.updateApp(appId, { sheets: updatedSheets })
        if (updatedApp && state.currentApp?.id === appId) {
          setState(prev => ({ ...prev, currentApp: updatedApp }))
        }
        return true
      } catch (error) {
        console.error('Failed to delete row:', error)
        return false
      }
    },
    [getService, state.currentApp]
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
      const { service } = getService()
      if (!service) return null

      try {
        return await service.exportApp(id)
      } catch (error) {
        console.error('Failed to export app:', error)
        return null
      }
    },
    [getService]
  )

  /**
   * Import app from JSON
   */
  const importApp = useCallback(
    async (jsonData: string): Promise<SpreadsheetApp | null> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      const { service } = getService()
      if (!service) {
        setState(prev => ({ ...prev, isSaving: false, error: 'Storage service not initialized' }))
        return null
      }

      try {
        const importedApp = await service.importApp(jsonData)
        if (importedApp) {
          toast.success('App imported')
          await loadApps()
        }
        setState(prev => ({ ...prev, isSaving: false }))
        return importedApp
      } catch (error) {
        setState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : 'Failed to import app'
        }))
        return null
      }
    },
    [getService, loadApps]
  )

  /**
   * Share an app with one or more users
   */
  const shareApp = useCallback(
    async (
      appId: string,
      recipientUserIds: string[],
      permission: 'view' | 'edit' = 'view',
      ownerName?: string
    ): Promise<boolean> => {
      const service = fileStorageRef.current
      if (!service) {
        toast.error('Sharing requires database storage')
        return false
      }

      if (recipientUserIds.length === 0) {
        toast.error('Please select at least one user to share with')
        return false
      }

      try {
        const success = await service.shareApp(appId, recipientUserIds, permission, ownerName)
        if (success) {
          toast.success(`App shared successfully with ${recipientUserIds.length} ${recipientUserIds.length === 1 ? 'user' : 'users'}`)
        } else {
          toast.error('Failed to share app')
        }
        return success
      } catch (error) {
        console.error('Failed to share app:', error)
        toast.error('Failed to share app')
        return false
      }
    },
    []
  )

  /**
   * Get users an app is shared with
   */
  const getSharedUsers = useCallback(
    async (appId: string): Promise<Array<{
      userId: string
      userName: string
      userEmail: string
      permission: 'view' | 'edit'
      sharedAt: string
    }>> => {
      const service = fileStorageRef.current
      if (!service) {
        return []
      }

      try {
        return await service.getSharedUsers(appId)
      } catch (error) {
        console.error('Failed to get shared users:', error)
        return []
      }
    },
    []
  )

  /**
   * Revoke a user's access to an app
   */
  const revokeAccess = useCallback(
    async (appId: string, recipientUserId: string): Promise<boolean> => {
      const service = fileStorageRef.current
      if (!service) {
        toast.error('Requires database storage')
        return false
      }

      try {
        const success = await service.revokeAccess(appId, recipientUserId)
        if (success) {
          toast.success('Access revoked')
        }
        return success
      } catch (error) {
        console.error('Failed to revoke access:', error)
        return false
      }
    },
    []
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
  }, [accessToken])

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
