import { useCallback, useState } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

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

        // Backend now expects all contextual data in a single JSON field `meta_json`.
        // This keeps the FastAPI signature simple and mirrors the InvestmentAutofillMeta model.
        const metaPayload: Record<string, unknown> = {
          investment_group_ref: params.investmentGroupRef
        }

        if (params.investmentTypeRef) {
          metaPayload.investment_type_ref = params.investmentTypeRef
        }

        if (params.investmentLiquidFundTypeRef) {
          metaPayload.investment_liquid_fund_type_ref = params.investmentLiquidFundTypeRef
        }

        if (params.investmentOwnerEmployeeId) {
          metaPayload.investment_owner_employee_id = params.investmentOwnerEmployeeId
        }

        if (params.investmentName) {
          metaPayload.investment_name = params.investmentName
        }

        if (params.investmentCurrencyRef) {
          metaPayload.investment_currency_ref = params.investmentCurrencyRef
        }

        if (params.investmentAccountId) {
          metaPayload.investment_account_id = params.investmentAccountId
        }

        formData.append('meta_json', JSON.stringify(metaPayload))

        const baseUrl = FLOWBOT_BASE_URL
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
