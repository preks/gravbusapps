import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import {
  acquireSessionStream,
  getSessionStreamState,
  ensureSessionStreamEntry,
  subscribeSessionStream,
  type SessionStreamEntry
} from './sessionStreamRegistry'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'

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
 *
 * When `streamSuppressed` is true (REST-terminal session), no live SSE
 * connection is opened — the UI renders from `session.trace` only.
 */
export const useSessionStreamEntry = (
  sessionId: string | null,
  accessToken: string,
  streamSuppressed = false
): SessionStreamEntry => {
  const releaseRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!sessionId || !accessToken || streamSuppressed) {
      releaseRef.current?.()
      releaseRef.current = null
      return
    }
    if (isFlowBotFabricRuntime()) {
      ensureSessionStreamEntry(sessionId, accessToken)
      return
    }
    const { release } = acquireSessionStream(sessionId, accessToken)
    releaseRef.current = release
    return () => {
      release()
      releaseRef.current = null
    }
  }, [sessionId, accessToken, streamSuppressed])

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!sessionId || streamSuppressed) return () => {}
      return subscribeSessionStream(sessionId, listener)
    },
    [sessionId, streamSuppressed]
  )

  const getSnapshot = useCallback((): SessionStreamEntry => {
    if (!sessionId || streamSuppressed) return EMPTY_STATE
    return getSessionStreamState(sessionId) ?? EMPTY_STATE
  }, [sessionId, streamSuppressed])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
