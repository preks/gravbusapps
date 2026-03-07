/**
 * Captures chat:start-call-with-user events that fire before useStartCallFromPlatform mounts.
 * Used when the platform opens the chat sidepanel and dispatches the event; the chat bundle
 * may load after the event, so we attach a listener as soon as this module is evaluated.
 */

export interface PendingStartCallPayload {
  userId: string
  displayName: string
  avatarUrl?: string
  callType?: 'audio' | 'video'
}

let pending: PendingStartCallPayload | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('chat:start-call-with-user', (event: Event) => {
    const detail = (event as CustomEvent<PendingStartCallPayload>).detail
    if (detail?.userId && detail?.displayName) {
      pending = detail
    }
  })
}

export function getAndClearPendingStartCall(): PendingStartCallPayload | null {
  const value = pending
  pending = null
  return value
}
