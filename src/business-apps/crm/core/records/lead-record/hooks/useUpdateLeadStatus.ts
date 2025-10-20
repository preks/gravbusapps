import { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { message } from 'antd'
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
    setIsLoading(true)
    try {
      const payload = {
        lead: {
          id: leadId,
          version: version,
          leadStatusRef: newStatusRef
        }
      }

      await restClient.post('/customer-relations/updateLead', payload, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      message.success(
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
      message.error(
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
