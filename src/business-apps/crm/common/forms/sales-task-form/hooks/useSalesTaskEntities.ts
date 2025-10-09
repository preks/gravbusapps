import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EntityOption {
  id: string
  name: string
  type: 'lead' | 'contact' | 'account' | 'opportunity'
  subtitle?: string
}

const SEARCH_ENTITIES_QUERY = `
  query SearchEntities($searchPattern: String!, $limit: Int) {
    Lead(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { companyName: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      companyName
      email
    }
    
    Contact(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      firstName
      lastName
      email
      account {
        name
      }
    }
    
    Account(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { website: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      website
      industry {
        value
      }
    }
    
    Opportunity(
      limit: $limit
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      estimatedAmount
      account {
        name
      }
    }
  }
`

export const useSalesTaskEntities = (accessToken: string) => {
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const searchEntities = useCallback(
    async (searchTerm: string) => {
      if (!accessToken) {
        console.warn('No access token provided to useSalesTaskEntities')
        return
      }

      if (!searchTerm?.trim() || searchTerm.trim().length < 2) {
        setEntities([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const searchPattern = `%${searchTerm.trim()}%`
        const variables = {
          searchPattern,
          limit: 20
        }

        const result = await graphqlClient.request<{
          Lead: any[]
          Contact: any[]
          Account: any[]
          Opportunity: any[]
        }>(SEARCH_ENTITIES_QUERY, variables)

        const allEntities: EntityOption[] = []

        // Process leads
        ;(result.Lead || []).forEach(lead => {
          const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.companyName || 'Lead'
          allEntities.push({
            id: lead.id,
            name: leadName,
            type: 'lead',
            subtitle: lead.companyName && leadName !== lead.companyName ? lead.companyName : lead.email
          })
        })

        // Process contacts
        ;(result.Contact || []).forEach(contact => {
          const contactName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Contact'
          allEntities.push({
            id: contact.id,
            name: contactName,
            type: 'contact',
            subtitle: contact.account?.name || contact.email
          })
        })

        // Process accounts
        ;(result.Account || []).forEach(account => {
          allEntities.push({
            id: account.id,
            name: account.name || 'Account',
            type: 'account',
            subtitle: account.industry?.value || account.website
          })
        })

        // Process opportunities
        ;(result.Opportunity || []).forEach(opportunity => {
          allEntities.push({
            id: opportunity.id,
            name: opportunity.name || 'Opportunity',
            type: 'opportunity',
            subtitle:
              opportunity.account?.name || (opportunity.estimatedAmount ? `€${opportunity.estimatedAmount}` : undefined)
          })
        })

        setEntities(allEntities)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to search entities')
        setError(error)
        console.error('Error searching entities:', error)
        setEntities([])
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  return { entities, loading, error, searchEntities }
}
