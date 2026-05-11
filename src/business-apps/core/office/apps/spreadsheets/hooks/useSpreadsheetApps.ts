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
  loadApp: (id: string, directFilePath?: string, options?: { allowTrashed?: boolean }) => Promise<SpreadsheetApp | null>
  createApp: (app: Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SpreadsheetApp | null>
  updateApp: (id: string, updates: Partial<SpreadsheetApp>) => Promise<SpreadsheetApp | null>
  deleteApp: (id: string) => Promise<boolean>
  duplicateApp: (id: string, newName?: string) => Promise<SpreadsheetApp | null>
  updateSheetData: (appId: string, sheetId: string, data: Record<string, unknown>[]) => Promise<SpreadsheetSheet | null>
  updateSheet: (appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>) => Promise<SpreadsheetSheet | null>
  addSheet: (appId: string, sheet?: Partial<SpreadsheetSheet>) => Promise<SpreadsheetSheet | null>
  deleteSheet: (appId: string, sheetId: string) => Promise<boolean>
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

const resolveCurrentAppPermission = (app: SpreadsheetApp, userId?: string): 'owner' | 'edit' | 'view' | null => {
  if (app.createdBy === userId) return 'owner'
  const permissionMap: Record<string, 'owner' | 'edit' | 'view'> = {
    owner: 'owner',
    admin: 'owner',
    edit: 'edit',
    view: 'view'
  }
  return app.permission ? (permissionMap[app.permission] ?? null) : null
}

const stripLocalRowId = (row: Record<string, unknown>): Record<string, unknown> => {
  const rowWithoutId = { ...row }
  delete (rowWithoutId as Record<string, unknown>)._id
  return rowWithoutId
}

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/** Detect connection/network errors (backend unreachable) for user-friendly messaging */
const isConnectionError = (error: unknown): boolean =>
  error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))

const CONNECTION_ERROR_MSG =
  'Document service is unavailable. Start the backend (npm run dev in document-service) to use spreadsheets.'

function getErrorMessage(error: unknown, isConnection: boolean, fallback: string): string {
  if (isConnection) return CONNECTION_ERROR_MSG
  return error instanceof Error ? error.message : fallback
}

function mergeAppIntoList(apps: SpreadsheetAppSummary[], id: string, updated: SpreadsheetApp): SpreadsheetAppSummary[] {
  return apps.map(app =>
    app.id === id
      ? {
          ...app,
          name: updated.name,
          description: updated.description,
          status: updated.status,
          updatedAt: updated.updatedAt
        }
      : app
  )
}

function replaceSheetRowById(
  rows: Record<string, unknown>[],
  rowId: string,
  updatedRow: Record<string, unknown>
): Record<string, unknown>[] {
  return rows.map(row => ((row._id as string) === rowId ? updatedRow : row))
}

function removeSheetRowById(rows: Record<string, unknown>[], rowId: string): Record<string, unknown>[] {
  return rows.filter(row => (row._id as string) !== rowId)
}

function updateSheetRowsForRowUpdate(
  sheets: SpreadsheetSheet[],
  sheetId: string,
  rowId: string,
  updatedRow: Record<string, unknown>
): SpreadsheetSheet[] {
  return sheets.map(sheet =>
    sheet.id === sheetId ? { ...sheet, data: replaceSheetRowById(sheet.data, rowId, updatedRow) } : sheet
  )
}

function updateSheetRowsForRowDelete(sheets: SpreadsheetSheet[], sheetId: string, rowId: string): SpreadsheetSheet[] {
  return sheets.map(sheet => (sheet.id === sheetId ? { ...sheet, data: removeSheetRowById(sheet.data, rowId) } : sheet))
}

interface SpreadsheetAppsListOptions {
  section?: 'favorites'
}

async function fetchAllAppsPaginated(
  options?: SpreadsheetAppsListOptions
): Promise<Awaited<ReturnType<typeof SpreadsheetApiService.listApps>>> {
  const PAGE_SIZE = 100
  const MAX_PAGES = 100
  const allApps: Awaited<ReturnType<typeof SpreadsheetApiService.listApps>> = []
  const seenAppIds = new Set<string>()
  const seenPageSignatures = new Set<string>()
  let page = 1
  let hasMore = true

  while (hasMore && page <= MAX_PAGES) {
    const pageItems = await SpreadsheetApiService.listApps({ ...options, limit: PAGE_SIZE, page })
    const pageSignature = pageItems.map(app => app.id).join(',')

    if (pageItems.length > 0 && seenPageSignatures.has(pageSignature)) {
      console.warn('[useSpreadsheetApps] Detected repeated list page; stopping pagination early', {
        page,
        pageSize: pageItems.length
      })
      break
    }

    seenPageSignatures.add(pageSignature)

    const uniquePageItems = pageItems.filter(app => {
      if (seenAppIds.has(app.id)) return false
      seenAppIds.add(app.id)
      return true
    })

    allApps.push(...uniquePageItems)
    hasMore = pageItems.length === PAGE_SIZE && uniquePageItems.length > 0
    page++
  }

  if (hasMore) {
    console.warn('[useSpreadsheetApps] Stopped list pagination after reaching safety page limit', {
      maxPages: MAX_PAGES
    })
  }

  return allApps
}

async function persistSheetRows(appId: string, sheetId: string, data: Record<string, unknown>[]): Promise<void> {
  for (const row of data) {
    const rowId = row._id as string | undefined
    if (!rowId || !isValidUUID(rowId)) {
      await SpreadsheetApiService.addRow(appId, sheetId, stripLocalRowId(row))
      continue
    }

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
      await SpreadsheetApiService.addRow(appId, sheetId, stripLocalRowId(row))
    }
  }
}

function remapUniverSnapshotSheetId(
  snapshot: Record<string, unknown>,
  sourceSheetId: string,
  targetSheetId: string
): Record<string, unknown> {
  const cloned = structuredClone(snapshot) as Record<string, unknown>
  const sheets = cloned.sheets as Record<string, unknown> | undefined
  if (sheets) {
    const sourceWorksheet = sheets[sourceSheetId]
    if (sourceWorksheet && sheets[targetSheetId] == null) {
      const worksheet = sourceWorksheet as Record<string, unknown>
      delete sheets[sourceSheetId]
      sheets[targetSheetId] = {
        ...worksheet,
        id: targetSheetId
      }
    } else if (sheets[targetSheetId] && typeof sheets[targetSheetId] === 'object') {
      sheets[targetSheetId] = {
        ...(sheets[targetSheetId] as Record<string, unknown>),
        id: targetSheetId
      }
    }
  }

  if (Array.isArray(cloned.sheetOrder)) {
    cloned.sheetOrder = (cloned.sheetOrder as unknown[]).map(sheetId =>
      sheetId === sourceSheetId ? targetSheetId : sheetId
    )
  }

  return cloned
}

async function copyUniverSnapshotsAfterDuplicate(sourceAppId: string, duplicatedApp: SpreadsheetApp): Promise<void> {
  const sourceApp = await SpreadsheetApiService.getApp(sourceAppId)
  if (!sourceApp) return

  const sourceSheets = sourceApp.sheets || []
  const duplicatedSheets = duplicatedApp.sheets || []
  const pairCount = Math.min(sourceSheets.length, duplicatedSheets.length)

  for (let i = 0; i < pairCount; i++) {
    const sourceSheet = sourceSheets[i]
    const duplicatedSheet = duplicatedSheets[i]
    if (!sourceSheet?.id || !duplicatedSheet?.id) continue

    try {
      const sourceSnapshotData = await SpreadsheetApiService.getUniverSnapshot(sourceAppId, sourceSheet.id)
      if (!sourceSnapshotData.snapshot || typeof sourceSnapshotData.snapshot !== 'object') continue

      const targetSnapshotState = await SpreadsheetApiService.getUniverSnapshot(duplicatedApp.id, duplicatedSheet.id)
      const expectedVersion = Number(targetSnapshotState.version ?? 0)
      const remappedSnapshot = remapUniverSnapshotSheetId(
        sourceSnapshotData.snapshot,
        sourceSheet.id,
        duplicatedSheet.id
      )

      await SpreadsheetApiService.saveUniverSnapshot(duplicatedApp.id, duplicatedSheet.id, {
        version: expectedVersion,
        snapshot: remappedSnapshot
      })
    } catch (error) {
      console.warn('[useSpreadsheetApps] duplicate snapshot copy skipped for one sheet', {
        sourceSheetId: sourceSheet.id,
        duplicatedSheetId: duplicatedSheet.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

/**
 * Hook for managing spreadsheet apps using the document-service backend
 */
export function useSpreadsheetApps(
  accessToken: string,
  userId?: string,
  listOptions?: SpreadsheetAppsListOptions
): UseSpreadsheetAppsResult {
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
      const allApps = await fetchAllAppsPaginated(listOptions)

      setState(prev => ({
        ...prev,
        apps: allApps,
        isLoading: false,
        storageMode: 'database'
      }))
    } catch (error) {
      const isConn = isConnectionError(error)
      if (!isConn) console.error('[useSpreadsheetApps] Failed to load apps:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: getErrorMessage(error, isConn, 'Failed to load apps')
      }))
    }
  }, [accessToken, listOptions])

  /**
   * Refresh apps (alias for loadApps)
   */
  const refreshApps = loadApps

  /**
   * Load a single app by ID
   */
  const loadApp = useCallback(
    async (
      id: string,
      _directFilePath?: string,
      options?: { allowTrashed?: boolean }
    ): Promise<SpreadsheetApp | null> => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }))
        return null
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const app = options?.allowTrashed
          ? ((await SpreadsheetApiService.getTrashedPreview(id)) ?? (await SpreadsheetApiService.getApp(id)))
          : await SpreadsheetApiService.getApp(id)
        if (!app) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'App not found or access denied'
          }))
          return null
        }

        // Load row data for each sheet (only if not already included in the app payload).
        // Note: Backend `GET /spreadsheets/:id` currently returns `sheets.rows` (full dataset).
        // Fetching `/rows` without pagination would overwrite the full dataset with only the first page (default limit=100).
        for (const sheet of app.sheets) {
          if (!sheet.data || sheet.data.length === 0) {
            sheet.data = await SpreadsheetApiService.getAllRows(id, sheet.id)
          }
        }

        // Use permission from API response (already mapped: admin -> owner)
        const resolvedPermission = resolveCurrentAppPermission(app, userId)

        setState(prev => ({
          ...prev,
          currentApp: app,
          isLoading: false,
          storageMode: 'database',
          currentAppPermission: resolvedPermission
        }))
        return app
      } catch (error) {
        const isConn = isConnectionError(error)
        if (!isConn) console.error('[useSpreadsheetApps] Failed to load app:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: getErrorMessage(error, isConn, 'Failed to load app')
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
        let mergedCurrentApp: SpreadsheetApp | null = updatedApp
        if (updatedApp) {
          setState(prev => {
            const nextCurrentApp =
              prev.currentApp?.id === id
                ? {
                    ...prev.currentApp,
                    ...updatedApp,
                    // `updateApp` is app-metadata-only; never let a partial PATCH response
                    // replace the live workbook sheets currently loaded in the viewer.
                    sheets: prev.currentApp.sheets,
                    relationships: updatedApp.relationships ?? prev.currentApp.relationships
                  }
                : prev.currentApp
            mergedCurrentApp = nextCurrentApp ?? updatedApp
            return {
              ...prev,
              currentApp: nextCurrentApp,
              apps: mergeAppIntoList(prev.apps, id, mergedCurrentApp as SpreadsheetApp),
              isSaving: false,
              storageMode: 'database'
            }
          })
        }
        return mergedCurrentApp
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
          await copyUniverSnapshotsAfterDuplicate(id, duplicatedApp)
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
   * Update sheet data (bulk update rows)
   */
  const updateSheetData = useCallback(
    async (appId: string, sheetId: string, data: Record<string, unknown>[]): Promise<SpreadsheetSheet | null> => {
      if (!accessToken) return null

      try {
        // For bulk updates, we need to update each row or use bulk add
        const sheet = await SpreadsheetApiService.getSheet(appId, sheetId)
        if (!sheet) return null

        await persistSheetRows(appId, sheetId, data)

        // Refresh the sheet data
        const updatedRows = await SpreadsheetApiService.getAllRows(appId, sheetId)
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

        // Update local state. Preserve existing sheet.data when the API returns empty
        // (PATCH only updates metadata; sheet data lives in rows and is fetched separately).
        if (state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.map(s => {
                    if (s.id !== sheetId) return s
                    const merged = { ...s, ...updatedSheet }
                    const hasData = Array.isArray(updatedSheet.data) && updatedSheet.data.length > 0
                    if (!hasData && Array.isArray(s.data)) {
                      merged.data = s.data
                    }
                    return merged
                  })
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
   * Create a new real sheet on the app via the backend.
   *
   * A real SpreadsheetSheet row must exist in the database for:
   *   - /operations/batch to target it via its sheetId
   *   - GET /spreadsheets/:id/univer-snapshot/:sheetId to load its own snapshot on reload
   *
   * Creating sheets only inside the Univer canvas does NOT persist and leads to
   * ghost-tab data bleed on reload.
   */
  const addSheet = useCallback(
    async (appId: string, sheet?: Partial<SpreadsheetSheet>): Promise<SpreadsheetSheet | null> => {
      if (!accessToken) {
        toast.error('Not authenticated')
        return null
      }

      try {
        const currentApp = state.currentApp?.id === appId ? state.currentApp : null
        const requestedSheetId = sheet?.id
        const existingNames = new Set((currentApp?.sheets ?? []).map(s => s.name))
        let autoName = sheet?.name
        if (!autoName) {
          let index = (currentApp?.sheets.length ?? 0) + 1
          autoName = `Sheet ${index}`
          while (existingNames.has(autoName)) {
            index += 1
            autoName = `Sheet ${index}`
          }
        }

        const templateSheet = currentApp?.sheets[0]
        const templateColumns = sheet?.columns ?? templateSheet?.columns ?? []

        const created = await SpreadsheetApiService.createSheet(appId, {
          ...sheet,
          name: autoName,
          columns: templateColumns.map(col => ({ ...col })),
          data: sheet?.data ?? []
        })

        if (state.currentApp?.id === appId) {
          setState(prev => {
            if (!prev.currentApp) return prev
            // If the caller pre-seeded the sheet into currentApp (Univer already
            // inserted the worksheet on its side), just replace that entry with
            // the server-confirmed one; otherwise append.
            const nextSheet = { ...created, data: created.data ?? [] }
            const existingIdx = prev.currentApp.sheets.findIndex(
              s => s.id === created.id || (requestedSheetId != null && s.id === requestedSheetId)
            )
            const nextSheets =
              existingIdx >= 0
                ? prev.currentApp.sheets.map((s, i) => (i === existingIdx ? nextSheet : s))
                : [...prev.currentApp.sheets, nextSheet]
            return {
              ...prev,
              currentApp: {
                ...prev.currentApp,
                sheets: nextSheets
              }
            }
          })
        }

        return created
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to add sheet:', error)
        const message = error instanceof Error ? error.message : 'Failed to create sheet'
        toast.error(message)
        return null
      }
    },
    [accessToken, state.currentApp]
  )

  const deleteSheet = useCallback(
    async (appId: string, sheetId: string): Promise<boolean> => {
      if (!accessToken) {
        toast.error('Not authenticated')
        return false
      }

      try {
        const ok = await SpreadsheetApiService.deleteSheet(appId, sheetId)
        if (ok && state.currentApp?.id === appId) {
          setState(prev => ({
            ...prev,
            currentApp: prev.currentApp
              ? {
                  ...prev.currentApp,
                  sheets: prev.currentApp.sheets.filter(s => s.id !== sheetId)
                }
              : null
          }))
        }
        return ok
      } catch (error) {
        console.error('[useSpreadsheetApps] Failed to delete sheet:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to delete sheet')
        return false
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
                  sheets: updateSheetRowsForRowUpdate(prev.currentApp.sheets, sheetId, rowId, updatedRow)
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
                  sheets: updateSheetRowsForRowDelete(prev.currentApp.sheets, sheetId, rowId)
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
    addSheet,
    deleteSheet,
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
