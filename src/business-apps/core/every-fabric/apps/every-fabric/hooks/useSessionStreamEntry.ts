import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  acquireSessionStream,
  getSessionStreamState,
  subscribeSessionStream,
  type SessionStreamEntry
} from './sessionStreamRegistry'

const EMPTY_STATE: SessionStreamEntry = {
  events: [],
  isConnected: false,
  lastSeq: 0,
  terminalReached: false,
  errorCount: 0
}

/**
 * React-adapter around {@link acquireSessionStream}. Maintains a single
 * connection per session across mounts, with the registry's grace-period
 * keep-alive so navigating away and back doesn't reconnect.
 */
export const useSessionStreamEntry = (sessionId: string | null, accessToken: string): SessionStreamEntry => {
  const releaseRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!sessionId || !accessToken) return
    const { release } = acquireSessionStream(sessionId, accessToken)
    releaseRef.current = release
    return () => {
      release()
      releaseRef.current = null
    }
  }, [sessionId, accessToken])

  const subscribe = (listener: () => void) => {
    if (!sessionId) return () => {}
    return subscribeSessionStream(sessionId, listener)
  }
  const getSnapshot = () => {
    if (!sessionId) return EMPTY_STATE
    return getSessionStreamState(sessionId) ?? EMPTY_STATE
  }

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
