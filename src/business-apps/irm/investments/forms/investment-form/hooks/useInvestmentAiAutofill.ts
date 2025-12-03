import { useCallback, useState } from 'react'
import { env } from '@/common/env/EnvUtils'

const DEFAULT_FLOWBOT_BASE_URL = 'https://newwork-dev.newwork.com'

function resolveFlowbotBaseUrl(): string {
  return env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL') || DEFAULT_FLOWBOT_BASE_URL
}

const FLOWBOT_BASE_URL = resolveFlowbotBaseUrl()

export interface InvestmentAiAutofillResponse {
  // Backend is expected to return a map of field property paths to values,
  // e.g. { "investment.acquisitionDate": "2025-01-01", "equityInvestment.marketValue": 12345.67 }
  fields?: Record<string, unknown>
  // Optional metadata or debug info
  meta?: Record<string, unknown>
}

interface InvestmentAiAutofillParams {
  file: File
  investmentGroupRef: string
  investmentTypeRef?: string
  investmentLiquidFundTypeRef?: string
  investmentOwnerEmployeeId?: string
  investmentName?: string
  investmentCurrencyRef?: string
  investmentAccountId?: string
}

export const useInvestmentAiAutofill = (accessToken: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAutofill = useCallback(
    async (params: InvestmentAiAutofillParams): Promise<InvestmentAiAutofillResponse | null> => {
      if (!accessToken) {
        console.warn('[InvestmentAiAutofill] Missing access token, skipping request')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append('file', params.file)
        formData.append('llm_model', 'gpt-4.1')
        formData.append('investment_group_ref', params.investmentGroupRef)

        if (params.investmentTypeRef) {
          formData.append('investment_type_ref', params.investmentTypeRef)
        }

        if (params.investmentLiquidFundTypeRef) {
          formData.append('investment_liquid_fund_type_ref', params.investmentLiquidFundTypeRef)
        }

        if (params.investmentOwnerEmployeeId) {
          formData.append('investment_owner_employee_id', params.investmentOwnerEmployeeId)
        }

        if (params.investmentName) {
          formData.append('investment_name', params.investmentName)
        }

        if (params.investmentCurrencyRef) {
          formData.append('investment_currency_ref', params.investmentCurrencyRef)
        }

        if (params.investmentAccountId) {
          formData.append('investment_account_id', params.investmentAccountId)
        }

        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        const baseUrl = isLocalDev ? 'http://localhost:8000' : FLOWBOT_BASE_URL
        // Backend route is defined in flowbot/src/api/routes/irm.py
        const url = `${baseUrl}/flowbot/irm/autofill_investment_form`

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body: formData
        })

        if (!res.ok) {
          throw new Error(`Failed to run investment AI autofill: ${res.status} ${res.statusText}`)
        }

        const data = (await res.json()) as InvestmentAiAutofillResponse

        // Log once for debugging; can be removed later
        if (isLocalDev) {
          console.log('[InvestmentAiAutofill] Response:', data)
        }

        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)

        console.error('[InvestmentAiAutofill] Error:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  return {
    runAutofill,
    isLoading,
    error
  }
}
