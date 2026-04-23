import { useEffect, useMemo, useRef } from 'react'
import type { ChatMessage } from '../types/enterpriseAgent'
import { deriveMessagesFromEvents } from '../utils/messageUtils'
import { useSessionStreamEntry } from './useSessionStreamEntry'
import { resetSessionStream } from './sessionStreamRegistry'

/**
 * Subscribes to a session's SSE stream via the shared SessionStreamRegistry.
 *
 * The registry keeps connections alive across component remounts (20s grace
 * window), so rapid session tab-switching doesn't cause a disconnect /
 * reconnect / trace refetch cycle.
 *
 * `streamVersion` changes (bumped by `useAgentSession.reply`) reset the
 * registry entry's buffer and force it to reconnect — equivalent to the old
 * hook's behaviour on new turn.
 */
export const useSessionStream = (sessionId: string | null, accessToken: string, streamVersion = 0) => {
  const { events, isConnected } = useSessionStreamEntry(sessionId, accessToken)
  const lastResetKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    const resetKey = `${sessionId}:${streamVersion}`
    // Only reset when the version actually advances within a given session —
    // not on first mount (handled by `acquireSessionStream`) and not on
    // session change (the entry for the new id starts fresh anyway).
    if (lastResetKeyRef.current === null) {
      lastResetKeyRef.current = resetKey
      return
    }
    if (lastResetKeyRef.current === resetKey) return
    // streamVersion bumped — replay this session from scratch.
    const previousKey = lastResetKeyRef.current
    lastResetKeyRef.current = resetKey
    const [prevSessionId] = previousKey.split(':')
    if (prevSessionId === sessionId) {
      resetSessionStream(sessionId)
    }
  }, [sessionId, streamVersion])

  const messages: ChatMessage[] = useMemo(() => deriveMessagesFromEvents(events), [events])

  return { messages, events, isConnected }
}
