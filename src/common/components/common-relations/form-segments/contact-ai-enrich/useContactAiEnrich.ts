import { useCallback, useState } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

const FLOWBOT_BASE_URL = resolveFlowbotBaseUrl()

export interface ContactEnrichmentSource {
  url: string
  title?: string | null
}

export interface ContactAiEnrichResponse {
  /**
   * Map of form field paths (matching the gravity-business-apps contact
   * schema) to suggested values. Possible keys include:
   * - "firstName", "lastName", "salutationRef", "academicTitleRef",
   *   "languageRef", "jobPosition", "department", "birthDate",
   *   "description", "notesSummary", "code"
   * - "communicationChannels":
   *   Array<{ communicationChannelRef, value }>
   */
  fields: Record<string, unknown>
  sources: ContactEnrichmentSource[]
  notes?: string | null
}

export interface ContactAiEnrichParams {
  firstName?: string
  lastName?: string
  email?: string
  entityKind?: 'contact' | 'investment_contact'
}

/**
 * React hook around the flowbot ``POST /flowbot/crm/enrich_contact``
 * endpoint. Returns person-only fields (Contact has no embedded company
 * fields, so no company enrichment is performed).
 */
export const useContactAiEnrich = (accessToken: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runEnrichment = useCallback(
    async (params: ContactAiEnrichParams): Promise<ContactAiEnrichResponse | null> => {
      const firstName = params.firstName?.trim() || undefined
      const lastName = params.lastName?.trim() || undefined
      const email = params.email?.trim() || undefined
      const hasName = !!(firstName && lastName)
      const hasEmail = !!email
      if (!hasName && !hasEmail) {
        return null
      }
      if (!accessToken) {
        console.warn('[ContactAiEnrich] Missing access token, skipping request')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const url = `${FLOWBOT_BASE_URL}/flowbot/crm/enrich_contact`

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            entity_kind: params.entityKind || 'contact'
          })
        })

        if (!res.ok) {
          throw new Error(`Failed to enrich contact: ${res.status} ${res.statusText}`)
        }

        const data = (await res.json()) as ContactAiEnrichResponse
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('[ContactAiEnrich] Error:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  return {
    runEnrichment,
    isLoading,
    error
  }
}
