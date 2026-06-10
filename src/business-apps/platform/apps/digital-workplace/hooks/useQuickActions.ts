import { useCallback, useEffect, useRef, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { isQuickAction, type QuickAction } from '../utils/quickActions'

/** Backend (per-user) key and the local cache key prefix. */
const USER_DATA_KEY = 'digital-workplace-quick-actions'
const CACHE_KEY_PREFIX = 'dw-quick-actions-v1'

interface QuickActionsPayload {
  /** `null` means "no custom set" → fall back to the (locale-aware) defaults. */
  actions: QuickAction[] | null
}

function cacheKey(userId?: string): string {
  return userId ? `${CACHE_KEY_PREFIX}:${userId}` : CACHE_KEY_PREFIX
}

function sanitize(value: unknown): QuickAction[] | null {
  if (!Array.isArray(value)) return null
  const cleaned = value.filter(isQuickAction)
  return cleaned.length > 0 ? cleaned : null
}

function readCache(userId?: string): QuickAction[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    return sanitize(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeCache(userId: string | undefined, actions: QuickAction[] | null): void {
  if (typeof window === 'undefined') return
  try {
    if (actions) {
      window.localStorage.setItem(cacheKey(userId), JSON.stringify(actions))
    } else {
      window.localStorage.removeItem(cacheKey(userId))
    }
  } catch {
    // Storage may be unavailable (private mode / quota); backend remains the source of truth.
  }
}

export interface UseQuickActionsOptions {
  accessToken?: string
  userId?: string
}

export interface UseQuickActionsResult {
  actions: QuickAction[]
  isCustomized: boolean
  saveActions: (next: QuickAction[]) => void
  resetActions: () => void
}

/**
 * Holds the workplace quick actions, persisted per user via the prompt-manager
 * user-data store (so the set follows the user across devices). A localStorage
 * cache provides an instant first paint; the backend is the source of truth and
 * is reconciled on mount. Until the user customizes them, the set tracks the
 * locale-aware defaults passed in.
 */
export function useQuickActions(defaults: QuickAction[], options: UseQuickActionsOptions = {}): UseQuickActionsResult {
  const { accessToken, userId } = options
  const client = usePromptManagerClient(accessToken ?? '')

  const cached = readCache(userId)
  const [actions, setActions] = useState<QuickAction[]>(cached ?? defaults)
  const [isCustomized, setIsCustomized] = useState<boolean>(cached !== null)

  // Keep tracking the (locale-aware) defaults until the user customizes.
  useEffect(() => {
    if (!isCustomized) setActions(defaults)
  }, [defaults, isCustomized])

  // Reconcile with the per-user backend record once credentials are available.
  const reconciledFor = useRef<string | null>(null)
  useEffect(() => {
    if (!accessToken || !userId) return
    if (reconciledFor.current === userId) return
    reconciledFor.current = userId

    let cancelled = false
    client
      .getUserData<QuickActionsPayload>(USER_DATA_KEY, userId)
      .then(record => {
        if (cancelled || !record) return
        const stored = sanitize(record.data?.actions)
        if (stored) {
          setActions(stored)
          setIsCustomized(true)
          writeCache(userId, stored)
        } else {
          setIsCustomized(false)
          writeCache(userId, null)
        }
      })
      .catch(() => {
        // Offline / not found: keep the cached or default set.
      })

    return () => {
      cancelled = true
    }
  }, [client, accessToken, userId])

  const persist = useCallback(
    (payloadActions: QuickAction[] | null) => {
      writeCache(userId, payloadActions)
      if (!accessToken || !userId) return
      client.putUserData<QuickActionsPayload>(USER_DATA_KEY, userId, { actions: payloadActions }).catch(() => {
        // Saving remotely failed; the local cache still reflects the change.
      })
    },
    [client, accessToken, userId]
  )

  const saveActions = useCallback(
    (next: QuickAction[]) => {
      setActions(next)
      setIsCustomized(true)
      persist(next)
    },
    [persist]
  )

  const resetActions = useCallback(() => {
    setIsCustomized(false)
    setActions(defaults)
    persist(null)
  }, [defaults, persist])

  return { actions, isCustomized, saveActions, resetActions }
}
