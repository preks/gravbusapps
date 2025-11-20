import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

/**
 * Simplified hook for fetching CRM lead data in status change popup
 * Matches the signature expected by LeadStatusChangePopup: (leadId, accessToken)
 */
export const useLeadDataForStatusChange = (leadId: string, accessToken: string) => {
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
        const query = `
          query GetLeadById($leadId: uuid!) {
            Lead(where: {id: {_eq: $leadId}, isDeleted: {_eq: false}}) {
              id
              version
              firstName
              lastName
              email
              companyName
              leadStatusRef
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
        }>(query, { leadId })

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

  return {
    lead,
    loading,
    error
  }
}
