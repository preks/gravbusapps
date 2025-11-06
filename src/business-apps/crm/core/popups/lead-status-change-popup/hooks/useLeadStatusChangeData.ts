import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UseLeadStatusChangeDataProps {
  context: BusinessAppContextProps
  leadId: string | null
}

export const useLeadStatusChangeData = ({ context, leadId }: UseLeadStatusChangeDataProps) => {
  const [leadData, setLeadData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  useEffect(() => {
    const loadLeadData = async () => {
      if (!leadId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetCustomerLead($id: uuid!) {
            Lead(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              firstName
              lastName
              leadStatus {
                id
                code
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{
          Lead: any[]
        }>(query, { id: leadId })

        if (result.Lead && result.Lead.length > 0) {
          setLeadData(result.Lead[0])
        } else {
          setError(getTranslationFromI18nKeyAndLabel('crm:lead.error.notFound', 'Lead not found'))
        }
      } catch (err) {
        console.error('Error loading lead data:', err)
        setError(getTranslationFromI18nKeyAndLabel('crm:lead.error.loadFailed', 'Failed to load lead data'))
      } finally {
        setIsLoading(false)
      }
    }

    loadLeadData()
  }, [leadId, context.accessToken, graphqlClient])

  return {
    leadData,
    isLoading,
    error
  }
}
