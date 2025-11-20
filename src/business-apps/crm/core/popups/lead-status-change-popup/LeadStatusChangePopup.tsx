import React, { useState, useEffect } from 'react'
import { LeadStatusChangePopup as SharedLeadStatusChangePopup } from '@/common/components/common-relations/popups/lead-status-change-popup/LeadStatusChangePopup'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_LEAD_BY_ID } from '../../forms/lead-form/queries/LeadQueries'

export interface CRMLeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const useLeadData = (leadId: string, accessToken: string) => {
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<{ Lead: any[] }>(GET_LEAD_BY_ID, { leadId })
        if (result.Lead && result.Lead.length > 0) {
          setLead(result.Lead[0])
        } else {
          setError('Lead not found')
        }
      } catch (err) {
        console.error('Error fetching lead data:', err)
        setError('Failed to load lead data')
      } finally {
        setLoading(false)
      }
    }

    fetchLead()
  }, [leadId, accessToken, graphqlClient])

  return { lead, loading, error }
}

const LeadStatusChangePopup: React.FC<CRMLeadStatusChangePopupProps> = props => {
  return (
    <SharedLeadStatusChangePopup
      {...props}
      config={{
        translationPrefix: 'crm:lead',
        entityKey: 'lead',
        testIdPrefix: 'lead-status-change-popup',
        statusFieldName: 'leadStatus',
        useLeadDataHook: useLeadData
      }}
    />
  )
}

LeadStatusChangePopup.displayName = 'LeadStatusChangePopup'

export default LeadStatusChangePopup
