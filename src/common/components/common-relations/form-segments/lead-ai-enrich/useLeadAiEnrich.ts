import { useCallback, useState } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const FLOWBOT_BASE_URL = resolveFlowbotBaseUrl()

export interface LeadEnrichmentSource {
  url: string
  title?: string | null
}

export interface LeadAiEnrichResponse {
  /**
   * Map of form field paths (matching the gravity-business-apps lead schema)
   * to suggested values. Possible keys include:
   * - Person: "firstName", "lastName", "email", "phoneNumber",
   *   "secondaryNumber", "linkedinUrl", "jobPosition", "academicTitleRef",
   *   "leadSourceRef", "leadRatingRef", "description"
   * - Flat address: "addressLine" (as { lines: string[] }), "locality",
   *   "postalCode", "regionRef", "countryRef"
   * - Embedded company: "companyName", "companyWebsite", "companyEmail",
   *   "companyPhone", "companySizeRef", "accountAnnualRevenueBandRef",
   *   "industryClassRef", "legalFormRef"
   */
  fields: Record<string, unknown>
  sources: LeadEnrichmentSource[]
  notes?: string | null
}

export interface LeadAiEnrichParams {
  firstName?: string
  lastName?: string
  email?: string
  entityKind?: 'lead' | 'investment_lead'
}

/**
 * React hook around the flowbot ``POST /flowbot/crm/enrich_lead`` endpoint.
 *
 * Accepts any combination of name + email (at least one of full name or
 * email required). Returns Lead form-ready person fields and, when the LLM
 * can confidently identify the lead's employer, the embedded company-*
 * fields filled by a secondary account-enrichment pass on the backend.
 */
export const useLeadAiEnrich = (accessToken: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runEnrichment = useCallback(
    async (params: LeadAiEnrichParams): Promise<LeadAiEnrichResponse | null> => {
      const firstName = params.firstName?.trim() || undefined
      const lastName = params.lastName?.trim() || undefined
      const email = params.email?.trim() || undefined
      const hasName = !!(firstName && lastName)
      const hasEmail = !!email
      if (!hasName && !hasEmail) {
        return null
      }
      if (!accessToken) {
        console.warn('[LeadAiEnrich] Missing access token, skipping request')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const url = `${FLOWBOT_BASE_URL}/flowbot/crm/enrich_lead`

        // Forward the active in-app language as a fallback signal. Flowbot
        // prefers the internal persisted locale and only uses this header
        // when the internal locale is missing.
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-User-Locale': getCurrentActiveUserLocale()
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            entity_kind: params.entityKind || 'lead'
          })
        })

        if (!res.ok) {
          throw new Error(`Failed to enrich lead: ${res.status} ${res.statusText}`)
        }

        const data = (await res.json()) as LeadAiEnrichResponse
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('[LeadAiEnrich] Error:', err)
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
