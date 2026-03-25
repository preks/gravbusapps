/**
 * useFileLock Hook
 *
 * Reusable hook for file locking across Documents, Notes, and Spreadsheets.
 * Provides manual lock/unlock functionality with TTL and real-time updates.
 *
 * NOTE: This requires backend locks API to be implemented first.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import type { FileLock, LockFileInput } from '../types/versioning'

function computeLockFlags(lock: FileLock | null, currentUserId?: string): { isLockedByMe: boolean; canEdit: boolean } {
  const isLockedByMe = Boolean(lock?.isLocked && currentUserId && lock.lockedBy === currentUserId)
  const canEdit = !lock?.isLocked || isLockedByMe
  return { isLockedByMe, canEdit }
}

function isExpired(lock: FileLock | null): boolean {
  if (!lock?.isLocked) return false
  if (!lock.lockExpiry) return false
  return Date.now() > new Date(lock.lockExpiry).getTime()
}

function markUnlocked(lock: FileLock | null): FileLock | null {
  if (!lock) return null
  return { ...lock, isLocked: false }
}

export interface UseFileLockOptions {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app' | 'slide'
  currentUserId?: string
  apiService?: {
    lockFile: (id: string, input?: LockFileInput) => Promise<FileLock | null>
    unlockFile: (id: string) => Promise<boolean>
    getLockStatus: (id: string) => Promise<FileLock | null>
    forceUnlock?: (id: string) => Promise<boolean>
  }
  autoRefreshInterval?: number // ms, default 5000 (5 seconds)
  /** Optional collaboration socket for lock push events (e.g., spreadsheets) */
  realtimeSocket?: Socket | null
  /** When true, editing stays blocked until first lock check finishes. */
  blockEditingUntilLockResolved?: boolean
  onLockAcquired?: (lock: FileLock) => void
  onLockReleased?: () => void
  onLockExpired?: () => void
  onError?: (error: Error) => void
  /** Translation function for user-facing error messages */
  t?: (key: string, vars?: Record<string, string | number>) => string
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
    realtimeSocket,
    blockEditingUntilLockResolved = false,
    onLockAcquired,
    onLockReleased,
    onLockExpired,
    onError,
    t
  } = options

  // State
  const [state, setState] = useState<UseFileLockState>({
    lock: null,
    isLocking: false,
    isUnlocking: false,
    isChecking: false,
    error: null,
    canEdit: !blockEditingUntilLockResolved,
    isLockedByMe: false
  })

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const onLockExpiredRef = useRef(onLockExpired)
  const onErrorRef = useRef(onError)
  onLockExpiredRef.current = onLockExpired
  onErrorRef.current = onError

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
      if (isExpired(lock)) {
        onLockExpiredRef.current?.()
        setState(prev => ({
          ...prev,
          lock: markUnlocked(lock),
          canEdit: true,
          isLockedByMe: false,
          isChecking: false
        }))
        return
      }

      const { canEdit, isLockedByMe } = computeLockFlags(lock, currentUserId)

      setState(prev => ({
        ...prev,
        lock,
        canEdit,
        isLockedByMe,
        isChecking: false
      }))
    } catch (error) {
      const errorMessage = t ? t('shared-error-check-lock') : error instanceof Error ? error.message : String(error)
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isChecking: false
      }))

      const errFn = onErrorRef.current
      if (errFn) {
        errFn(error instanceof Error ? error : new Error(errorMessage))
      }
    }
  }, [entityId, currentUserId, apiService, t])

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
        // Guard against accidentally passing React events from click handlers.
        const safeReason = typeof reason === 'string' ? reason : undefined
        const safeDurationMinutes = typeof durationMinutes === 'number' ? durationMinutes : undefined
        const lock = await apiService.lockFile(entityId, {
          reason: safeReason,
          durationMinutes: safeDurationMinutes
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
        const errorMessage = t ? t('shared-error-acquire-lock') : error instanceof Error ? error.message : String(error)
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
    [entityId, apiService, onLockAcquired, onError, t]
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
      const errorMessage = t ? t('shared-error-release-lock') : error instanceof Error ? error.message : String(error)
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
  }, [entityId, apiService, onLockReleased, onError, t])

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
      const errorMessage = t ? t('shared-error-force-unlock') : error instanceof Error ? error.message : String(error)
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
  }, [entityId, apiService, onLockReleased, onError, t])

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

  // Optional real-time lock updates via collaboration socket.
  // This is opt-in: only callers that pass a socket receive push updates.
  useEffect(() => {
    if (!realtimeSocket) return

    const handleLockAcquired = (data: {
      lock?: {
        lockedBy?: string
        lockedByName?: string
        lockedByAvatar?: string
        lockedAt?: string
        lockExpiry?: string
        lockReason?: string
      }
    }) => {
      const incoming = data?.lock
      if (!incoming) return
      const lock: FileLock = {
        isLocked: true,
        lockedBy: incoming.lockedBy,
        lockedByName: incoming.lockedByName,
        lockedByAvatar: incoming.lockedByAvatar,
        lockedAt: incoming.lockedAt,
        lockExpiry: incoming.lockExpiry,
        lockReason: incoming.lockReason
      }
      if (isExpired(lock)) {
        onLockExpiredRef.current?.()
        setState(prev => ({
          ...prev,
          lock: markUnlocked(lock),
          canEdit: true,
          isLockedByMe: false
        }))
        return
      }
      const { canEdit, isLockedByMe } = computeLockFlags(lock, currentUserId)
      setState(prev => ({
        ...prev,
        lock,
        canEdit,
        isLockedByMe,
        error: null
      }))
    }

    const handleLockReleased = () => {
      setState(prev => ({
        ...prev,
        lock: null,
        canEdit: true,
        isLockedByMe: false,
        error: null
      }))
    }

    const handleConnect = () => {
      // Re-sync after reconnect in case events were missed.
      void checkLockStatus()
    }

    realtimeSocket.on('lock:acquired', handleLockAcquired)
    realtimeSocket.on('lock:released', handleLockReleased)
    realtimeSocket.on('connect', handleConnect)

    return () => {
      realtimeSocket.off('lock:acquired', handleLockAcquired)
      realtimeSocket.off('lock:released', handleLockReleased)
      realtimeSocket.off('connect', handleConnect)
    }
  }, [realtimeSocket, currentUserId, checkLockStatus])

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
