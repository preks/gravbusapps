import React, { useState, useEffect } from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/components/common-relations/popups/lead-status-change-popup/LeadStatusChangePopup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentLeadById } from '../../forms/lead-form/queries/LeadQueries'

export interface IRMInvestmentStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const useInvestmentLeadData = (leadId: string, accessToken: string) => {
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentLeadById } = useGetInvestmentLeadById({ accessToken } as BusinessAppContextProps)

  useEffect(() => {
    const loadLead = async () => {
      if (!leadId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await fetchInvestmentLeadById(leadId)
        setLead(result)
      } catch (err) {
        console.error('Error fetching lead data:', err)
        setError('Failed to load lead data')
      } finally {
        setLoading(false)
      }
    }

    loadLead()
  }, [leadId, accessToken, fetchInvestmentLeadById])

  return { lead, loading, error }
}

const InvestmentStatusChangePopup: React.FC<IRMInvestmentStatusChangePopupProps> = props => {
  return (
    <SharedLeadStatusChangePopup
      {...props}
      config={{
        translationPrefix: 'irm:investmentLead',
        entityKey: 'investmentLead',
        testIdPrefix: 'investment-lead-status-change-popup',
        statusFieldName: 'leadStatus',
        useLeadDataHook: useInvestmentLeadData
      }}
    />
  )
}

InvestmentStatusChangePopup.displayName = 'InvestmentStatusChangePopup'

export default InvestmentStatusChangePopup
