import { useCallback, useState } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

const FLOWBOT_BASE_URL = resolveFlowbotBaseUrl()

export interface AccountEnrichmentSource {
  url: string
  title?: string | null
}

export interface AccountAiEnrichResponse {
  /**
   * Map of form field paths (matching the gravity-business-apps account
   * schema) to suggested values. Possible keys include:
   * - "name", "website", "description", "foundationDate"
   * - "companySizeRef" (resolved catalog id)
   * - "communicationChannels" (Array<{ communicationChannelRef, value }>)
   * - "addresses" (Array<{ addressLine, locality, postalCode }>)
   */
  fields: Record<string, unknown>
  sources: AccountEnrichmentSource[]
  notes?: string | null
}

export interface AccountAiEnrichParams {
  companyName: string
  website?: string
  entityKind?: 'account' | 'investment_account'
}

/**
 * React hook around the flowbot ``POST /flowbot/crm/enrich_account`` endpoint.
 *
 * Calls a Mojeek-backed LLM agent that, given just a company name, returns
 * suggested values for the Account create form (website, description,
 * employees, address, communication channels, ...).
 *
 * Mirrors the shape of {@link useInvestmentAiAutofill} so the two AI form
 * helpers feel consistent.
 */
export const useAccountAiEnrich = (accessToken: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runEnrichment = useCallback(
    async (params: AccountAiEnrichParams): Promise<AccountAiEnrichResponse | null> => {
      const companyName = params.companyName?.trim()
      if (!companyName) {
        return null
      }
      if (!accessToken) {
        console.warn('[AccountAiEnrich] Missing access token, skipping request')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const url = `${FLOWBOT_BASE_URL}/flowbot/crm/enrich_account`

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_name: companyName,
            website: params.website?.trim() || undefined,
            entity_kind: params.entityKind || 'account'
          })
        })

        if (!res.ok) {
          throw new Error(`Failed to enrich account: ${res.status} ${res.statusText}`)
        }

        const data = (await res.json()) as AccountAiEnrichResponse
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        console.error('[AccountAiEnrich] Error:', err)
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
