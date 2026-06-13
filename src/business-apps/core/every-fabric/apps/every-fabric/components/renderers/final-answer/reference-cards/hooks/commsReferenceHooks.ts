import { useChatClient } from '@/common/network/chat/useChatClient'
import { useReferenceFetch, type ReferenceFetchState } from './useReferenceFetch'

/**
 * Chat conversations and meetings both live in chat-service and are reached
 * through the shared `chatClient` (token synced by `useChatClient`). The
 * client returns loosely-typed records, so the cards read fields defensively.
 */

export function useConversationReference(
  id: string,
  accessToken: string
): ReferenceFetchState<Record<string, unknown>> {
  const client = useChatClient(accessToken)
  return useReferenceFetch<Record<string, unknown>>(async () => {
    try {
      return await client.getConversationById<Record<string, unknown>>(id)
    } catch {
      return null
    }
  }, [id, accessToken])
}

export function useMeetingReference(id: string, accessToken: string): ReferenceFetchState<Record<string, unknown>> {
  const client = useChatClient(accessToken)
  return useReferenceFetch<Record<string, unknown>>(async () => {
    try {
      const response = await client.getMeeting<{ meeting?: Record<string, unknown> } | Record<string, unknown>>(id)
      // `getMeeting` returns `{ meeting }`; unwrap but tolerate a bare record.
      const meeting = (response as { meeting?: Record<string, unknown> })?.meeting
      return meeting ?? (response as Record<string, unknown>) ?? null
    } catch {
      return null
    }
  }, [id, accessToken])
}
