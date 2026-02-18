/**
 * Cross-tab "ringing leader" for incoming calls. Only the leader tab plays the ringtone;
 * all tabs show the invite modal. First tab to claim wins (localStorage).
 */

const RINGING_LEADER_KEY = 'chat_ringing_leader'
const TTL_MS = 60_000

function getTabId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr'
  let id = sessionStorage.getItem(RINGING_LEADER_KEY + '_tab_id')
  if (!id) {
    id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem(RINGING_LEADER_KEY + '_tab_id', id)
  }
  return id
}

export interface RingingLeaderPayload {
  tabId: string
  roomId: string
  conversationId?: string
  timestamp: number
}

function getStored(): RingingLeaderPayload | null {
  try {
    const raw = localStorage.getItem(RINGING_LEADER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as RingingLeaderPayload
    if (Date.now() - data.timestamp > TTL_MS) return null
    return data
  } catch {
    return null
  }
}

/**
 * Try to claim ringing leader for this invite. First tab to claim wins.
 * Returns true if this tab is the leader (claimed or already leader for this room).
 */
export function tryClaimRingingLeader(roomId: string, conversationId?: string | null): boolean {
  try {
    const tabId = getTabId()
    const stored = getStored()
    const convId = conversationId ?? roomId
    const sameRoom =
      stored &&
      (stored.roomId === roomId ||
        stored.conversationId === roomId ||
        stored.roomId === convId ||
        stored.conversationId === convId)
    if (sameRoom && stored.tabId === tabId) return true
    if (sameRoom && stored.tabId !== tabId) return false
    const payload: RingingLeaderPayload = {
      tabId,
      roomId,
      conversationId: conversationId ?? undefined,
      timestamp: Date.now()
    }
    localStorage.setItem(RINGING_LEADER_KEY, JSON.stringify(payload))
    const after = getStored()
    return after?.tabId === tabId && (after.roomId === roomId || after.conversationId === convId)
  } catch {
    return false
  }
}

/**
 * True if this tab is the ringing leader for the given room/conversation.
 */
export function isRingingLeader(roomId: string, conversationId?: string | null): boolean {
  try {
    const tabId = getTabId()
    const stored = getStored()
    if (stored?.tabId !== tabId) return false
    const convId = conversationId ?? roomId
    return (
      stored.roomId === roomId ||
      stored.conversationId === roomId ||
      stored.roomId === convId ||
      stored.conversationId === convId
    )
  } catch {
    return false
  }
}

/**
 * Clear ringing leader (e.g. when invite is accepted, declined, or timed out).
 * If roomId/conversationId omitted, clears only when this tab is the stored leader.
 */
export function clearRingingLeader(roomId?: string, conversationId?: string | null): void {
  try {
    const stored = getStored()
    if (!stored) return
    if (roomId !== undefined) {
      const convId = conversationId ?? roomId
      const match =
        stored.roomId === roomId ||
        stored.conversationId === roomId ||
        stored.roomId === convId ||
        stored.conversationId === convId
      if (!match) return
    }
    localStorage.removeItem(RINGING_LEADER_KEY)
  } catch {
    // Ignore
  }
}
