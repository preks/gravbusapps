import { useCallback } from 'react'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { NexusArtifact } from '../types/nexus.types'

interface UseArtifactProps {
  accessToken: string
}

export const useArtifact = ({ accessToken }: UseArtifactProps) => {
  const baseUrl = getDocumentServiceApiUrl()

  const saveArtifact = useCallback(
    async (artifactId: string, targetType: 'document' | 'slides'): Promise<{ success: boolean; message: string }> => {
      if (!accessToken) {
        return { success: false, message: 'No access token' }
      }

      try {
        const response = await fetch(`${baseUrl}/nexus/artifacts/${artifactId}/save`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ targetType })
        })

        if (!response.ok) {
          throw new Error(`Save failed: ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        return {
          success: false,
          message: (error as Error).message
        }
      }
    },
    [accessToken, baseUrl]
  )

  const fetchArtifact = useCallback(
    async (artifactId: string): Promise<NexusArtifact | null> => {
      if (!accessToken) return null

      try {
        const response = await fetch(`${baseUrl}/nexus/artifacts/${artifactId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        if (!response.ok) return null
        return await response.json()
      } catch {
        return null
      }
    },
    [accessToken, baseUrl]
  )

  return { saveArtifact, fetchArtifact }
}
