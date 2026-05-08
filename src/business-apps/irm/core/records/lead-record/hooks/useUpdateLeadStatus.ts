import { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { toast } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const useUpdateLeadStatus = (context: BusinessAppContextProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const updateStatus = async (
    leadId: string,
    version: number,
    newStatusRef: string,
    statusDisplayName: string,
    onSuccess?: () => void
  ) => {
    if (!context.accessToken) {
      console.error('Access token missing')
      toast.error(getTranslationFromI18nKeyAndLabel('crm:common.accessTokenMissing', 'Authentication is required'))
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        investmentLead: {
          id: leadId,
          version: version,
          leadStatusRef: newStatusRef
        }
      }

      await restClient.post('/investment-relations/updateInvestmentLead', payload, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      toast.success(
        getTranslationFromI18nKeyAndLabel(
          'crm:lead.statusUpdateSuccess',
          `Lead status updated to ${statusDisplayName} successfully`
        )
      )

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      toast.error(
        getTranslationFromI18nKeyAndLabel(
          'crm:lead.statusUpdateError',
          `Failed to update lead status to ${statusDisplayName}`
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateStatus,
    isLoading
  }
}
