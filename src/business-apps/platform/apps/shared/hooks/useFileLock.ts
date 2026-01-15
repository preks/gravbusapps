/**
 * useFileLock Hook
 *
 * Reusable hook for file locking across Documents, Notes, and Spreadsheets.
 * Provides manual lock/unlock functionality with TTL and real-time updates.
 *
 * NOTE: This requires backend locks API to be implemented first.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { FileLock, LockFileInput } from '../types/versioning'

export interface UseFileLockOptions {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app'
  currentUserId?: string
  apiService?: {
    lockFile: (id: string, input?: LockFileInput) => Promise<FileLock | null>
    unlockFile: (id: string) => Promise<boolean>
    getLockStatus: (id: string) => Promise<FileLock | null>
    forceUnlock?: (id: string) => Promise<boolean>
  }
  autoRefreshInterval?: number // ms, default 5000 (5 seconds)
  onLockAcquired?: (lock: FileLock) => void
  onLockReleased?: () => void
  onLockExpired?: () => void
  onError?: (error: Error) => void
}

export interface UseFileLockState {
  lock: FileLock | null
  isLocking: boolean
  isUnlocking: boolean
  isChecking: boolean
  error: string | null
  canEdit: boolean // Whether current user can edit (not locked by someone else)
  isLockedByMe: boolean // Whether current user owns the lock
}

export interface UseFileLockActions {
  checkLockStatus: () => Promise<void>
  acquireLock: (reason?: string, durationMinutes?: number) => Promise<boolean>
  releaseLock: () => Promise<boolean>
  forceUnlock: () => Promise<boolean>
  clearError: () => void
}

export interface UseFileLockReturn extends UseFileLockState, UseFileLockActions {}

/**
 * Hook for managing file locks
 *
 * TODO: Implement once backend locks API is ready
 */
export function useFileLock(options: UseFileLockOptions): UseFileLockReturn {
  const {
    entityId,
    currentUserId,
    apiService,
    autoRefreshInterval = 5000,
    onLockAcquired,
    onLockReleased,
    onLockExpired,
    onError
  } = options

  // State
  const [state, setState] = useState<UseFileLockState>({
    lock: null,
    isLocking: false,
    isUnlocking: false,
    isChecking: false,
    error: null,
    canEdit: true,
    isLockedByMe: false
  })

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Check current lock status
   */
  const checkLockStatus = useCallback(async () => {
    if (!apiService) {
      console.warn('[useFileLock] Backend API not yet implemented')
      return
    }

    setState(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      const lock = await apiService.getLockStatus(entityId)

      const isLockedByMe = lock?.isLocked && currentUserId && lock.lockedBy === currentUserId
      const canEdit = !lock?.isLocked || isLockedByMe

      // Check if lock expired
      if (lock?.isLocked && lock.lockExpiry) {
        const expiryTime = new Date(lock.lockExpiry).getTime()
        const now = Date.now()

        if (now > expiryTime) {
          if (onLockExpired) {
            onLockExpired()
          }
          // Lock has expired, user can edit
          setState(prev => ({
            ...prev,
            lock: { ...lock, isLocked: false },
            canEdit: true,
            isLockedByMe: false,
            isChecking: false
          }))
          return
        }
      }

      setState(prev => ({
        ...prev,
        lock,
        canEdit,
        isLockedByMe,
        isChecking: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check lock status'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isChecking: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [entityId, currentUserId, apiService, onLockExpired, onError])

  /**
   * Acquire a lock on the file
   */
  const acquireLock = useCallback(
    async (reason?: string, durationMinutes?: number): Promise<boolean> => {
      if (!apiService) {
        console.warn('[useFileLock] Backend API not yet implemented')
        return false
      }

      setState(prev => ({ ...prev, isLocking: true, error: null }))

      try {
        const lock = await apiService.lockFile(entityId, {
          reason,
          durationMinutes
        })

        if (lock) {
          setState(prev => ({
            ...prev,
            lock,
            canEdit: true,
            isLockedByMe: true,
            isLocking: false
          }))

          if (onLockAcquired) {
            onLockAcquired(lock)
          }

          return true
        }

        setState(prev => ({ ...prev, isLocking: false }))
        return false
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to acquire lock'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLocking: false
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }

        return false
      }
    },
    [entityId, apiService, onLockAcquired, onError]
  )

  /**
   * Release the lock
   */
  const releaseLock = useCallback(async (): Promise<boolean> => {
    if (!apiService) {
      console.warn('[useFileLock] Backend API not yet implemented')
      return false
    }

    setState(prev => ({ ...prev, isUnlocking: true, error: null }))

    try {
      const success = await apiService.unlockFile(entityId)

      if (success) {
        setState(prev => ({
          ...prev,
          lock: null,
          canEdit: true,
          isLockedByMe: false,
          isUnlocking: false
        }))

        if (onLockReleased) {
          onLockReleased()
        }
      } else {
        setState(prev => ({ ...prev, isUnlocking: false }))
      }

      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to release lock'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isUnlocking: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }

      return false
    }
  }, [entityId, apiService, onLockReleased, onError])

  /**
   * Force unlock (admin only)
   */
  const forceUnlock = useCallback(async (): Promise<boolean> => {
    if (!apiService || !apiService.forceUnlock) {
      console.warn('[useFileLock] Force unlock not supported')
      return false
    }

    setState(prev => ({ ...prev, isUnlocking: true, error: null }))

    try {
      const success = await apiService.forceUnlock(entityId)

      if (success) {
        setState(prev => ({
          ...prev,
          lock: null,
          canEdit: true,
          isLockedByMe: false,
          isUnlocking: false
        }))

        if (onLockReleased) {
          onLockReleased()
        }
      } else {
        setState(prev => ({ ...prev, isUnlocking: false }))
      }

      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to force unlock'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isUnlocking: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }

      return false
    }
  }, [entityId, apiService, onLockReleased, onError])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Check lock status on mount - only if entityId is not empty
  useEffect(() => {
    if (entityId && entityId.trim() !== '' && apiService) {
      checkLockStatus()
    }
  }, [entityId, apiService, checkLockStatus])

  // Auto-refresh lock status
  useEffect(() => {
    if (!apiService || !autoRefreshInterval) return

    refreshTimerRef.current = setInterval(() => {
      checkLockStatus()
    }, autoRefreshInterval)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [apiService, autoRefreshInterval, checkLockStatus])

  return {
    // State
    ...state,

    // Actions
    checkLockStatus,
    acquireLock,
    releaseLock,
    forceUnlock,
    clearError
  }
}
