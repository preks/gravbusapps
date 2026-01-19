import { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { message } from 'antd'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const useMarkLeadAsLost = (context: BusinessAppContextProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const markAsLost = async (leadId: string, version: string, onSuccess?: () => void) => {
    setIsLoading(true)
    try {
      const payload = {
        investmentLead: {
          id: leadId,
          version: parseInt(version, 10),
          leadStatusRef: 'InvestmentLeadStatus:v1:LOST'
        }
      }

      await restClient.post('/investment-relations/updateInvestmentLead', payload, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      message.success(
        getTranslationFromI18nKeyAndLabel('crm:lead.markAsLostSuccess', 'Lead marked as lost successfully')
      )

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error marking lead as lost:', error)
      message.error(getTranslationFromI18nKeyAndLabel('crm:lead.markAsLostError', 'Failed to mark lead as lost'))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markAsLost,
    isLoading
  }
}
