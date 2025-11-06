import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UseInvestmentStatusChangeDataProps {
  context: BusinessAppContextProps
  leadId: string | null
}

export const useInvestmentStatusChangeData = ({ context, leadId }: UseInvestmentStatusChangeDataProps) => {
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
          query GetInvestmentLead($id: uuid!) {
            InvestmentLead(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
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
          InvestmentLead: any[]
        }>(query, { id: leadId })

        if (result.InvestmentLead && result.InvestmentLead.length > 0) {
          setLeadData(result.InvestmentLead[0])
        } else {
          setError(getTranslationFromI18nKeyAndLabel('irm:lead.error.notFound', 'Lead not found'))
        }
      } catch (err) {
        console.error('Error loading lead data:', err)
        setError(getTranslationFromI18nKeyAndLabel('irm:lead.error.loadFailed', 'Failed to load lead data'))
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
