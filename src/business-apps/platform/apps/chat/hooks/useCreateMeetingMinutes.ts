import { useState, useCallback } from 'react'
import type { ChatApiClient, CreateMeetingMinutesResponse } from '../services/chatApiClient'

interface UseCreateMeetingMinutesOptions {
  onSuccess?: (noteId: string) => void
  onError?: (error: string) => void
}

export function useCreateMeetingMinutes(apiClient: ChatApiClient | null, options: UseCreateMeetingMinutesOptions = {}) {
  const [isCreating, setIsCreating] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const createMeetingMinutes = useCallback(
    async (sessionId: string) => {
      if (!apiClient) {
        setError('API client not available')
        return
      }

      setIsCreating(true)
      setError(null)

      try {
        const result: CreateMeetingMinutesResponse = await apiClient.createMeetingMinutes(sessionId)

        if (result.transcriptionStatus === 'COMPLETED' && result.noteId) {
          setNoteId(result.noteId)
          options.onSuccess?.(result.noteId)
        } else if (result.transcriptionStatus === 'FAILED') {
          const errorMsg = result.message || 'Failed to create meeting minutes'
          setError(errorMsg)
          options.onError?.(errorMsg)
        }
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message || err.message || 'An error occurred while creating meeting minutes'
        setError(errorMsg)
        options.onError?.(errorMsg)
      } finally {
        setIsCreating(false)
      }
    },
    [apiClient, options]
  )

  const reset = useCallback(() => {
    setNoteId(null)
    setError(null)
  }, [])

  return {
    createMeetingMinutes,
    isCreating,
    noteId,
    error,
    reset
  }
}
