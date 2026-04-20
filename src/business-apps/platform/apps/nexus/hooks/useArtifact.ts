import { useCallback } from 'react'
import {
  getDocumentOfficeWebSocketBaseUrl,
  getDocumentServiceApiUrl
} from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { NexusArtifact } from '../types/nexus.types'

const DOCUMENT_READY_TIMEOUT_MS = 6000
const DOCUMENT_READY_POLL_INTERVAL_MS = 400

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, delayMs))
}

function resolveDocumentServiceTarget(rawUrl: string): { origin: string; path: string } | null {
  try {
    const url = new URL(rawUrl)

    return {
      origin: url.origin,
      path: url.pathname.replace(/\/+$/, '') || '/'
    }
  } catch {
    return null
  }
}

export interface SaveResult {
  success: boolean
  savedId?: string
  savedType: string
  title: string
  message: string
  action?: 'created' | 'updated'
}

interface UseArtifactProps {
  accessToken: string
}

export const useArtifact = ({ accessToken }: UseArtifactProps) => {
  const baseUrl = getDocumentServiceApiUrl()
  const documentWebSocketBaseUrl = getDocumentOfficeWebSocketBaseUrl()

  const logDocumentServiceAlignment = useCallback(
    (documentId: string) => {
      const apiTarget = resolveDocumentServiceTarget(baseUrl)
      const socketTarget = resolveDocumentServiceTarget(documentWebSocketBaseUrl)

      if (!apiTarget || !socketTarget) {
        return
      }

      if (apiTarget.origin === socketTarget.origin && apiTarget.path === socketTarget.path) {
        return
      }

      console.warn(`[Nexus] Document ${documentId} uses different REST and collaboration targets`, {
        apiTarget: `${apiTarget.origin}${apiTarget.path}`,
        collaborationTarget: `${socketTarget.origin}${socketTarget.path}`
      })
    },
    [baseUrl, documentWebSocketBaseUrl]
  )

  const saveArtifact = useCallback(
    async (artifactId: string): Promise<SaveResult> => {
      const targetType = 'document'
      if (!accessToken) {
        return { success: false, savedType: targetType, title: '', message: 'No access token' }
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
          savedType: targetType,
          title: '',
          message: (error as Error).message
        }
      }
    },
    [accessToken, baseUrl]
  )

  const updateArtifact = useCallback(
    async (
      artifactId: string,
      updates: { title?: string; content?: Record<string, unknown> }
    ): Promise<NexusArtifact | null> => {
      if (!accessToken) return null

      try {
        const response = await fetch(`${baseUrl}/nexus/artifacts/${artifactId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        })

        if (!response.ok) return null
        return await response.json()
      } catch {
        return null
      }
    },
    [accessToken, baseUrl]
  )

  const waitForDocumentReady = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!accessToken || !documentId) {
        return false
      }

      logDocumentServiceAlignment(documentId)

      const deadline = Date.now() + DOCUMENT_READY_TIMEOUT_MS

      while (Date.now() <= deadline) {
        try {
          const response = await fetch(`${baseUrl}/documents/${documentId}?_ts=${Date.now()}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })

          if (response.ok) {
            return true
          }

          if (response.status !== 404) {
            console.warn(`[Nexus] Saved document ${documentId} readiness check returned ${response.status}`)
            return false
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`[Nexus] Saved document ${documentId} readiness check failed: ${message}`)
        }

        await sleep(DOCUMENT_READY_POLL_INTERVAL_MS)
      }

      console.warn(`[Nexus] Saved document ${documentId} did not become readable before timeout`)
      return false
    },
    [accessToken, baseUrl, logDocumentServiceAlignment]
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

  return { saveArtifact, updateArtifact, waitForDocumentReady, fetchArtifact }
}
