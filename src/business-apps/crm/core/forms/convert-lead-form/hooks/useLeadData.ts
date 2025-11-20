import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface LeadData {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phoneNumber?: string
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  companyWebsite?: string
  position?: string
  academicTitle?: {
    id: string
    value: string
    code: string
  }
  academicTitleRef?: string
  addresses?: Array<{
    addressLine?: string
    city?: string
    postalCode?: string
    country?: {
      id: string
      value: string
      code: string
    }
    region?: {
      id: string
      value: string
      code: string
    }
  }>
}

const LEAD_QUERY = `
  query GetLead($leadId: uuid!) {
    Lead(where: { id: { _eq: $leadId }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      name
      email
      phoneNumber
      companyName
      companyEmail
      companyPhone
      companyWebsite
      position
      academicTitle {
        id
        value
        code
      }
      academicTitleRef
      addresses {
        addressLine
        city
        postalCode
        country {
          id
          value
          code
        }
        region {
          id
          value
          code
        }
      }
    }
  }
`

interface UseLeadDataReturn {
  leadData: LeadData | null
  loading: boolean
  error: string | null
  actualLeadId: string
}

export const useLeadData = (accessToken: string, additionalData: any): UseLeadDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [leadData, setLeadData] = useState<LeadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract leadId from additionalData (supports both direct and nested structures)
  const actualLeadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || ''

  useEffect(() => {
    const fetchLead = async () => {
      if (!actualLeadId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<{ Lead: LeadData[] }>(LEAD_QUERY, {
          leadId: actualLeadId
        })

        if (result.Lead && result.Lead.length > 0) {
          setLeadData(result.Lead[0])
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
  }, [actualLeadId, accessToken, graphqlClient])

  return {
    leadData,
    loading,
    error,
    actualLeadId
  }
}
