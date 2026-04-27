import { useCallback } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { CreateMeetingData, Meeting } from '../types'

export function useCreateMeeting(
  accessToken: string,
  onCreated?: () => Promise<void> | void
): (data: CreateMeetingData) => Promise<Meeting> {
  const apiClient = useChatClient(accessToken)

  return useCallback(
    async (data: CreateMeetingData): Promise<Meeting> => {
      const response = await apiClient.createMeeting<{ meeting: Meeting }>(data)

      await onCreated?.()

      return response.meeting
    },
    [apiClient, onCreated]
  )
}
