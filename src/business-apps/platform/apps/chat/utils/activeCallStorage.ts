/**
 * LocalStorage helpers for tracking active RTK group calls across tabs.
 */

export const ACTIVE_CALL_KEY = 'chat_active_call'

export function isInCallInAnotherTab(currentUserId: string): boolean {
  try {
    const stored = localStorage.getItem(ACTIVE_CALL_KEY)
    if (!stored) return false
    const data = JSON.parse(stored)
    const isRecent = Date.now() - data.timestamp < 5000
    return data.userId === currentUserId && isRecent
  } catch {
    return false
  }
}

export function setActiveCallInStorage(userId: string, roomId: string): void {
  try {
    localStorage.setItem(
      ACTIVE_CALL_KEY,
      JSON.stringify({
        userId,
        roomId,
        timestamp: Date.now()
      })
    )
  } catch {
    // Ignore storage errors
  }
}

export function clearActiveCallFromStorage(): void {
  try {
    localStorage.removeItem(ACTIVE_CALL_KEY)
  } catch {
    // Ignore storage errors
  }
}
