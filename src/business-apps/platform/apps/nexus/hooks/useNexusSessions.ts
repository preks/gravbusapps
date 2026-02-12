import { useState, useEffect, useCallback } from 'react'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { NexusSession } from '../types/nexus.types'

interface UseNexusSessionsProps {
  accessToken: string
}

export const useNexusSessions = ({ accessToken }: UseNexusSessionsProps) => {
  const [sessions, setSessions] = useState<NexusSession[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const baseUrl = getDocumentServiceApiUrl()

  const fetchSessions = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    try {
      const response = await fetch(`${baseUrl}/nexus/sessions`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }

      const data = await response.json()
      setSessions(data)
    } catch (error) {
      console.error('Failed to fetch nexus sessions:', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, baseUrl])

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!accessToken) return

      try {
        await fetch(`${baseUrl}/nexus/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      } catch (error) {
        console.error('Failed to delete session:', (error as Error).message)
      }
    },
    [accessToken, baseUrl]
  )

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    isLoading,
    fetchSessions,
    deleteSession,
    setSessions
  }
}
