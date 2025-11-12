import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LeadCompany {
  id: string
  name: string
  companyName?: string
  accountName?: string
}

const GET_LEAD_COMPANIES_QUERY = `
  query GetLeadCompanies($where: LeadBoolExp, $limit: Int, $offset: Int) {
    Lead(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      id
      companyName
      account {
        id
        name
      }
    }
  }
`

export const useGetLeadCompanies = (context: BusinessAppContextProps, search: string = '', offset: number = 0) => {
  const [leadCompanies, setLeadCompanies] = useState<LeadCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLeadCompanies = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available for lead companies')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build where condition with company search
      const whereCondition = {
        isDeleted: { _eq: false },
        _and: [
          {
            _or: [{ companyName: { _isNull: false } }, { account: { name: { _isNull: false } } }]
          },
          ...(search.trim()
            ? [
                {
                  _or: [{ companyName: { _ilike: `%${search}%` } }, { account: { name: { _ilike: `%${search}%` } } }]
                }
              ]
            : [])
        ]
      }

      const variables = {
        where: whereCondition,
        limit: 50, // Increased limit to show more companies
        offset
      }

      const result = await graphqlClient.request(GET_LEAD_COMPANIES_QUERY, variables)

      if (result?.Lead) {
        // Process and deduplicate companies
        const companyMap = new Map<string, any>()

        result.Lead.forEach((lead: any) => {
          const companyName = lead.companyName || (lead.account ? lead.account.name : null)
          if (companyName && companyName.trim()) {
            // Use company name as both key and ID for filtering
            if (!companyMap.has(companyName)) {
              companyMap.set(companyName, {
                id: companyName, // Use company name as ID for filtering
                name: companyName,
                companyName: lead.companyName,
                accountName: lead.account ? lead.account.name : null
              })
            }
          }
        })

        // Convert map to array and sort alphabetically
        const companies = Array.from(companyMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 20) // Reasonable limit for dropdown performance

        setLeadCompanies(companies)
      } else {
        setLeadCompanies([])
      }
    } catch (err) {
      console.error('Error fetching lead companies:', err)
      setError(err)
      setLeadCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, offset]) // Removed graphqlClient from dependencies

  useEffect(() => {
    fetchLeadCompanies()
  }, [fetchLeadCompanies])

  return {
    leadCompanies,
    isLoading,
    error,
    refetch: fetchLeadCompanies
  }
}
