/**
 * useVersioning Hook
 *
 * Reusable hook for version management across Documents, Notes, and Spreadsheets.
 * Provides versioning functionality including auto-save, manual checkpoints,
 * version history, comparison, and restoration.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Version } from '../types/versioning'

export interface UseVersioningOptions {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app'
  apiService: {
    createVersion: (
      id: string,
      options: {
        content?: string
        changeDescription?: string
        isCheckpoint?: boolean
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
  createCheckpoint: (description?: string) => Promise<Version | null>
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
    onError
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

  /**
   * Load version history
   */
  const loadVersions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const versions = await apiService.listVersions(entityId, 1, 50)
      const currentVersion = versions.length > 0 ? versions[0] : undefined

      setState(prev => ({
        ...prev,
        versions,
        currentVersion,
        isLoading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load versions'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [entityId, apiService, onError])

  /**
   * Create a manual checkpoint version
   */
  const createCheckpoint = useCallback(
    async (description?: string): Promise<Version | null> => {
      setState(prev => ({ ...prev, isSaving: true, error: null }))

      try {
        const version = await apiService.createVersion(entityId, {
          changeDescription: description,
          isCheckpoint: true
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
        const errorMessage = error instanceof Error ? error.message : 'Failed to create checkpoint'
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
    [entityId, apiService, onVersionCreated, onError]
  )

  /**
   * Save an auto-save version
   */
  const saveAutoVersion = useCallback(async (): Promise<Version | null> => {
    // Don't auto-save if paused or no unsaved changes
    if (autoSavePausedRef.current || !state.hasUnsavedChanges) {
      return null
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }))

    try {
      const version = await apiService.createVersion(entityId, {
        isCheckpoint: false // Mark as auto-save
      })

      if (version) {
        // Clean up old auto-save versions (keep only maxAutoSaveVersions)
        const autoSaveVersions = state.versions.filter(v => v.isAutoSave)
        let deletedVersions: typeof autoSaveVersions = []

        if (autoSaveVersions.length >= maxAutoSaveVersions) {
          // Delete oldest auto-save versions
          const toDelete = autoSaveVersions.slice(maxAutoSaveVersions - 1)
          for (const oldVersion of toDelete) {
            if (apiService.deleteVersion) {
              await apiService.deleteVersion(entityId, oldVersion.version)
            }
          }
          deletedVersions = toDelete
        }

        setState(prev => ({
          ...prev,
          versions: [version, ...prev.versions.filter(v => !deletedVersions.some(d => d.version === v.version))],
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto-save'
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
  }, [entityId, apiService, state.hasUnsavedChanges, state.versions, maxAutoSaveVersions, onVersionCreated, onError])

  /**
   * Restore to a previous version
   */
  const restoreVersion = useCallback(
    async (versionNumber: number): Promise<boolean> => {
      setState(prev => ({ ...prev, isRestoring: true, error: null }))

      try {
        const success = await apiService.restoreVersion(entityId, versionNumber)

        if (success) {
          // Reload versions to get the new "restored" checkpoint
          await loadVersions()

          const restoredVersion = state.versions.find(v => v.version === versionNumber)
          if (restoredVersion && onVersionRestored) {
            onVersionRestored(restoredVersion)
          }
        }

        setState(prev => ({ ...prev, isRestoring: false }))
        return success
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to restore version'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isRestoring: false
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }

        return false
      }
    },
    [entityId, apiService, loadVersions, state.versions, onVersionRestored, onError]
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
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete version'
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
    [entityId, apiService, onError]
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
          onError(error instanceof Error ? error : new Error('Failed to compare versions'))
        }
        return null
      }
    },
    [entityId, apiService, onError]
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

  // Load versions on mount - only if entityId is not empty
  useEffect(() => {
    if (entityId && entityId.trim() !== '') {
      loadVersions()
    }
  }, [entityId, loadVersions])

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
