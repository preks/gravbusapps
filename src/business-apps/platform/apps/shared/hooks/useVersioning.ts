/**
 * useVersioning Hook
 *
 * Reusable hook for version management across Documents, Notes, and Spreadsheets.
 * Provides versioning functionality including auto-save, manual checkpoints,
 * version history, comparison, and restoration.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Version } from '../types/versioning'

const LOAD_VERSIONS_TIMEOUT_MS = 15000

function shouldSkipAutoSave(isPaused: boolean, hasUnsavedChanges: boolean): boolean {
  return isPaused || !hasUnsavedChanges
}

async function deleteOldAutoSaveVersionsIfNeeded(params: {
  entityId: string
  versions: Version[]
  maxAutoSaveVersions: number
  deleteVersion?: (id: string, versionNumber: number) => Promise<boolean>
}): Promise<Set<number>> {
  // If backend deletion isn't available, don't attempt pruning (and don't hide versions locally).
  if (!params.deleteVersion) return new Set()

  const autoSaveVersions = params.versions.filter(v => v.isAutoSave)
  if (autoSaveVersions.length < params.maxAutoSaveVersions) return new Set()

  const toDelete = autoSaveVersions.slice(params.maxAutoSaveVersions - 1)
  for (const oldVersion of toDelete) {
    if (params.deleteVersion) {
      await params.deleteVersion(params.entityId, oldVersion.version)
    }
  }

  return new Set(toDelete.map(v => v.version))
}

export interface UseVersioningOptions {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide'
  apiService: {
    createVersion: (
      id: string,
      options: {
        content?: string
        changeDescription?: string
        isCheckpoint?: boolean
        univerSnapshots?: Record<string, Record<string, unknown> | null>
      }
    ) => Promise<Version | null>
    listVersions: (id: string, page?: number, limit?: number) => Promise<Version[]>
    getVersion: (id: string, versionNumber: number) => Promise<unknown>
    restoreVersion: (id: string, versionNumber: number) => Promise<boolean>
    compareVersions: (
      id: string,
      versionA: number,
      versionB: number
    ) => Promise<{
      versionA: Version
      versionB: Version
      diff: Array<{
        path: string
        type: 'added' | 'removed' | 'modified'
        oldValue?: unknown
        newValue?: unknown
      }>
    } | null>
    deleteVersion?: (id: string, versionNumber: number) => Promise<boolean>
  }
  autoSaveInterval?: number // ms, default 30000 (30 seconds)
  autoSaveEnabled?: boolean // default true
  maxAutoSaveVersions?: number // default 10
  onVersionCreated?: (version: Version) => void
  onVersionRestored?: (version: Version) => void
  onError?: (error: Error) => void
  /** Translation function for user-facing error messages */
  t?: (key: string, vars?: Record<string, string | number>) => string
}

export interface UseVersioningState {
  versions: Version[]
  currentVersion?: Version
  isLoading: boolean
  isSaving: boolean
  isRestoring: boolean
  error: string | null
  hasUnsavedChanges: boolean
  lastSaveTime: Date | null
}

export interface UseVersioningActions {
  // Version management
  loadVersions: () => Promise<void>
  createCheckpoint: (
    description?: string,
    options?: { univerSnapshots?: Record<string, Record<string, unknown> | null> }
  ) => Promise<Version | null>
  saveAutoVersion: () => Promise<Version | null>
  restoreVersion: (versionNumber: number) => Promise<boolean>
  deleteVersion: (versionNumber: number) => Promise<boolean>

  // Version comparison
  compareVersions: (
    versionA: number,
    versionB: number
  ) => Promise<{
    versionA: Version
    versionB: Version
    diff: Array<{
      path: string
      type: 'added' | 'removed' | 'modified'
      oldValue?: unknown
      newValue?: unknown
    }>
  } | null>

  // State management
  markAsChanged: () => void
  markAsSaved: () => void
  clearError: () => void

  // Auto-save control
  pauseAutoSave: () => void
  resumeAutoSave: () => void
}

export interface UseVersioningReturn extends UseVersioningState, UseVersioningActions {}

/**
 * Hook for managing entity versions
 */
export function useVersioning(options: UseVersioningOptions): UseVersioningReturn {
  const {
    entityId,
    apiService,
    autoSaveInterval = 30000,
    autoSaveEnabled = true,
    maxAutoSaveVersions = 10,
    onVersionCreated,
    onVersionRestored,
    onError,
    t
  } = options

  // State
  const [state, setState] = useState<UseVersioningState>({
    versions: [],
    currentVersion: undefined,
    isLoading: false,
    isSaving: false,
    isRestoring: false,
    error: null,
    hasUnsavedChanges: false,
    lastSaveTime: null
  })

  // Refs for auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSavePausedRef = useRef(false)
  const saveAutoVersionRef = useRef<() => Promise<Version | null>>()
  const loadVersionsRef = useRef<() => Promise<void>>()

  /**
   * Load version history
   */
  const loadVersions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Loading versions timed out')), LOAD_VERSIONS_TIMEOUT_MS)
      })
      const versions = await Promise.race([apiService.listVersions(entityId, 1, 50), timeoutPromise])
      const currentVersion = versions.length > 0 ? versions[0] : undefined

      setState(prev => ({
        ...prev,
        versions,
        currentVersion,
        isLoading: false
      }))
    } catch (error) {
      const errorMessage = t ? t('shared-error-load-versions') : error instanceof Error ? error.message : String(error)
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [entityId, apiService, onError, t])

  /**
   * Create a manual checkpoint version
   */
  const createCheckpoint = useCallback(
    async (
      description?: string,
      options?: { univerSnapshots?: Record<string, Record<string, unknown> | null> }
    ): Promise<Version | null> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        const version = await apiService.createVersion(entityId, {
          changeDescription: description,
          isCheckpoint: true,
          univerSnapshots: options?.univerSnapshots
        })

        if (version) {
          setState(prev => ({
            ...prev,
            versions: [version, ...prev.versions],
            currentVersion: version,
            isSaving: false,
            hasUnsavedChanges: false,
            lastSaveTime: new Date()
          }))

          if (onVersionCreated) {
            onVersionCreated(version)
          }
        } else {
          setState(prev => ({ ...prev, isSaving: false }))
        }

        return version
      } catch (error) {
        const errorMessage = t
          ? t('shared-error-create-checkpoint')
          : error instanceof Error
            ? error.message
            : String(error)
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isSaving: false
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }

        return null
      }
    },
    [entityId, apiService, onVersionCreated, onError, t]
  )

  /**
   * Save an auto-save version
   */
  const saveAutoVersion = useCallback(async (): Promise<Version | null> => {
    // Don't auto-save if paused or no unsaved changes
    if (shouldSkipAutoSave(autoSavePausedRef.current, state.hasUnsavedChanges)) {
      return null
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const version = await apiService.createVersion(entityId, {
        isCheckpoint: false // Mark as auto-save
      })

      if (!version) {
        setState(prev => ({ ...prev, isSaving: false }))
        return version
      }

      const deletedVersionNumbers = await deleteOldAutoSaveVersionsIfNeeded({
        entityId,
        versions: state.versions,
        maxAutoSaveVersions,
        deleteVersion: apiService.deleteVersion
      })

      setState(prev => ({
        ...prev,
        versions: [version, ...prev.versions.filter(v => !deletedVersionNumbers.has(v.version))],
        currentVersion: version,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaveTime: new Date()
      }))

      onVersionCreated?.(version)
      return version
    } catch (error) {
      const errorMessage = t ? t('shared-error-auto-save') : error instanceof Error ? error.message : String(error)
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isSaving: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }

      return null
    }
  }, [entityId, apiService, state.hasUnsavedChanges, state.versions, maxAutoSaveVersions, onVersionCreated, onError, t])

  /**
   * Restore to a previous version
   */
  const restoreVersion = useCallback(
    async (versionNumber: number): Promise<boolean> => {
      setState(prev => ({ ...prev, isRestoring: true, error: null }))

      try {
        console.log('[useVersioning] Restoring to version:', versionNumber)
        const success = await apiService.restoreVersion(entityId, versionNumber)

        if (success) {
          console.log('[useVersioning] Restore succeeded, reloading versions...')
          // Reload versions to get the new "restored" checkpoint
          await loadVersions()

          // After restore, a NEW version was created with "Restored from version X"
          // The current version is now the NEWEST version (index 0 after sorting DESC)
          // NOT the old version we restored from
          setState(prev => {
            const newestVersion = prev.versions.length > 0 ? prev.versions[0] : undefined
            console.log('[useVersioning] Setting current version to newest:', newestVersion?.version)
            return {
              ...prev,
              currentVersion: newestVersion,
              isRestoring: false
            }
          })

          const restoredVersion = state.versions.find(v => v.version === versionNumber)
          if (restoredVersion && onVersionRestored) {
            onVersionRestored(restoredVersion)
          }

          return true
        }

        setState(prev => ({ ...prev, isRestoring: false }))
        return success
      } catch (error) {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status?: unknown }).status === 'number'
            ? ((error as { status: number }).status as number)
            : undefined
        const isRestoreOwnerPermissionError = status === 403
        const errorMessage = t
          ? t(
              isRestoreOwnerPermissionError ? 'shared-error-restore-version-owner-only' : 'shared-error-restore-version'
            )
          : error instanceof Error
            ? error.message
            : String(error)
        const restoreError = new Error(errorMessage)
        restoreError.name = 'VersionRestoreError'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isRestoring: false
        }))

        if (onError) {
          onError(restoreError)
        }

        return false
      }
    },
    [entityId, apiService, loadVersions, state.versions, onVersionRestored, onError, t]
  )

  /**
   * Delete a version
   */
  const deleteVersion = useCallback(
    async (versionNumber: number): Promise<boolean> => {
      if (!apiService.deleteVersion) {
        console.warn('Delete version not supported')
        return false
      }

      try {
        const success = await apiService.deleteVersion(entityId, versionNumber)

        if (success) {
          setState(prev => ({
            ...prev,
            versions: prev.versions.filter(v => v.version !== versionNumber)
          }))
        }

        return success
      } catch (error) {
        const errorMessage = t
          ? t('shared-error-delete-version')
          : error instanceof Error
            ? error.message
            : String(error)
        setState(prev => ({
          ...prev,
          error: errorMessage
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }

        return false
      }
    },
    [entityId, apiService, onError, t]
  )

  /**
   * Compare two versions
   */
  const compareVersions = useCallback(
    async (versionA: number, versionB: number) => {
      try {
        return await apiService.compareVersions(entityId, versionA, versionB)
      } catch (error) {
        if (onError) {
          const msg = t ? t('shared-error-compare-versions') : error instanceof Error ? error.message : String(error)
          onError(error instanceof Error ? error : new Error(msg))
        }
        return null
      }
    },
    [entityId, apiService, onError, t]
  )

  /**
   * Mark content as changed (enables auto-save)
   */
  const markAsChanged = useCallback(() => {
    setState(prev => ({ ...prev, hasUnsavedChanges: true }))
  }, [])

  /**
   * Mark content as saved
   */
  const markAsSaved = useCallback(() => {
    setState(prev => ({ ...prev, hasUnsavedChanges: false, lastSaveTime: new Date() }))
  }, [])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Pause auto-save
   */
  const pauseAutoSave = useCallback(() => {
    autoSavePausedRef.current = true
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
  }, [])

  /**
   * Resume auto-save
   */
  const resumeAutoSave = useCallback(() => {
    autoSavePausedRef.current = false
  }, [])

  // Keep ref updated with latest saveAutoVersion
  useEffect(() => {
    saveAutoVersionRef.current = saveAutoVersion
  }, [saveAutoVersion])

  // Keep ref updated with latest loadVersions callback.
  useEffect(() => {
    loadVersionsRef.current = loadVersions
  }, [loadVersions])

  // Load versions on mount - only if entityId is not empty
  useEffect(() => {
    if (entityId && entityId.trim() !== '') {
      void loadVersionsRef.current?.()
    }
  }, [entityId])

  // Auto-save timer
  useEffect(() => {
    if (!autoSaveEnabled || !entityId || entityId.trim() === '') return

    const intervalId = setInterval(() => {
      // Use ref to avoid recreating interval when function changes
      if (saveAutoVersionRef.current) {
        saveAutoVersionRef.current()
      }
    }, autoSaveInterval)

    return () => {
      clearInterval(intervalId)
    }
  }, [entityId, autoSaveEnabled, autoSaveInterval])

  return {
    // State
    ...state,

    // Actions
    loadVersions,
    createCheckpoint,
    saveAutoVersion,
    restoreVersion,
    deleteVersion,
    compareVersions,
    markAsChanged,
    markAsSaved,
    clearError,
    pauseAutoSave,
    resumeAutoSave
  }
}
