import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OpportunityData {
  id: string
  name: string
  investmentName?: string
  investmentTypeRef?: string
  ownerEmployee?: {
    id: string
    displayName: string
    firstName: string
    lastName: string
    employeePosition?: {
      organizationalUnit?: {
        id: string
        name: string
      }
      jobPosition?: {
        name: string
      }
    }
  }
  investmentCompany?: {
    id: string
    name: string
  }
  addresses?: Array<{
    addressLine?: any
    postalCode?: string
    locality?: string
    region?: {
      value: string
    }
    country?: {
      value: string
    }
  }>
  opportunityAccounts: Array<{
    accountId: string
    accountTypeRef?: string
    account: {
      id: string
      name: string
      addresses?: Array<{
        addressLine?: any // GraphQL returns as scalar but actual data is {lines: string[]}
        postalCode?: string
        locality?: string
        region?: {
          value: string
        }
        country?: {
          value: string
        }
      }>
    }
    accountType?: {
      value: string
    }
  }>
  investmentOpportunityContact: Array<{
    contactId: string
    contact: {
      id: string
      firstName?: string
      lastName?: string
      fullName?: string
      email?: string
      pictureThumbnail?: string
      jobPosition?: string
    }
  }>
}

const OPPORTUNITY_QUERY = `
  query GetOpportunityForGenerateNda($id: uuid!) {
    InvestmentOpportunity(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      id
      name
      investmentName
      investmentTypeRef
      ownerEmployee {
        id
        displayName
        firstName
        lastName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          jobPosition {
            name
          }
        }
      }
      investmentCompany {
        id
        name
      }
      addresses(where: { isDeleted: { _eq: false } }, limit: 1) {
        addressLine
        postalCode
        locality
        region {
          value
        }
        country {
          value
        }
      }
      opportunityAccounts(where: { isDeleted: { _eq: false } }) {
        accountId
        accountTypeRef
        account {
          id
          name
          addresses(
            where: { 
              isDeleted: { _eq: false }
              addressType: { _eq: "PRIMARY_ADDRESS" }
            }
            limit: 1
          ) {
            addressLine
            postalCode
            locality
            region {
              value
            }
            country {
              value
            }
          }
        }
        accountType {
          value
        }
      }
      investmentOpportunityContact(where: { isDeleted: { _eq: false } }) {
        contactId
        contact {
          id
          firstName
          lastName
          fullName
          email
          pictureThumbnail
          jobPosition
        }
      }
    }
  }
`

export const useOpportunityData = (accessToken: string, opportunityId: string) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [opportunity, setOpportunity] = useState<OpportunityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOpportunity = async () => {
      if (!opportunityId || !accessToken) {
        setError('Opportunity ID not provided or access token missing')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await graphqlClient.request<{
          InvestmentOpportunity: OpportunityData[]
        }>(OPPORTUNITY_QUERY, { id: opportunityId })

        if (!response?.InvestmentOpportunity?.[0]) {
          setError('Opportunity not found')
          setLoading(false)
          return
        }

        setOpportunity(response.InvestmentOpportunity[0])
        setLoading(false)
      } catch (err) {
        console.error('Error loading opportunity data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load opportunity')
        setLoading(false)
      }
    }

    loadOpportunity()
  }, [opportunityId, accessToken, graphqlClient])

  return {
    opportunity,
    loading,
    error
  }
}
