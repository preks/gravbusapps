import type { SessionUiStateCache } from './types'

const MAX_SESSION_UI_CACHE = 16
const sessionUiStateCache = new Map<string, SessionUiStateCache>()

export const readSessionUiCache = (sessionId: string | null): SessionUiStateCache | null => {
  if (!sessionId) return null
  const cached = sessionUiStateCache.get(sessionId)
  if (cached) cached.lastAccess = Date.now()
  return cached ?? null
}

export const writeSessionUiCache = (sessionId: string | null, patch: Partial<SessionUiStateCache>): void => {
  if (!sessionId) return
  const existing = sessionUiStateCache.get(sessionId)
  const merged: SessionUiStateCache = {
    session: null,
    isAgentRunning: false,
    optimisticMessages: [],
    activeSkill: null,
    lastReplyTimestamp: 0,
    processedTerminalAt: -1,
    lastAccess: Date.now(),
    ...existing,
    ...patch
  }
  sessionUiStateCache.set(sessionId, merged)
  if (sessionUiStateCache.size > MAX_SESSION_UI_CACHE) {
    const sorted = Array.from(sessionUiStateCache.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess)
    while (sessionUiStateCache.size > MAX_SESSION_UI_CACHE && sorted.length > 0) {
      const [oldestId] = sorted.shift()!
      if (oldestId !== sessionId) sessionUiStateCache.delete(oldestId)
    }
  }
}
