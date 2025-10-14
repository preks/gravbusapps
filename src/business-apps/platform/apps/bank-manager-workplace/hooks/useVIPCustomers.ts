/**
 * Hook for fetching VIP customers from CRM
 * Integrates with existing GraphQL Account entities
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { VIPCustomer } from '../types/banking.types'

export interface VIPCustomersResponse {
  vipCustomers: VIPCustomer[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useVIPCustomers = (context: BusinessAppContextProps): VIPCustomersResponse => {
  const [vipCustomers, setVIPCustomers] = useState<VIPCustomer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchVIPCustomers = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch first 10 accounts from CRM (same query as Account List)
      const query = `
        query GetTopAccounts {
          Account(
            limit: 10
            orderBy: { createdAt: DESC }
          ) {
            id
            name
          }
        }
      `

      const result = await graphqlClient.request<{ Account: Array<{ id: string; name: string }> }>(query)

      // Get mock data with rich information
      const mockCustomers = getMockVIPCustomers()

      // Replace mock names and IDs with real account data
      const customersWithRealData = mockCustomers.map((mockCustomer, index) => {
        const realAccount = result.Account[index]
        if (realAccount) {
          return {
            ...mockCustomer,
            id: realAccount.id, // Real ID for navigation
            name: realAccount.name // Real name from CRM
          }
        }
        return mockCustomer
      })

      setVIPCustomers(customersWithRealData)
    } catch (err) {
      console.error('Error fetching VIP customers:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      
      // Fallback to pure mock data if query fails
      setVIPCustomers(getMockVIPCustomers())
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    fetchVIPCustomers()
  }, [fetchVIPCustomers])

  return {
    vipCustomers,
    isLoading,
    error,
    refetch: fetchVIPCustomers
  }
}

// Helper Functions

function calculateTotalAssets(opportunities: any[]): number {
  if (!opportunities || opportunities.length === 0) return 0
  return opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
}

function mapAccountTypeToPriority(accountType?: string): 'vip' | 'premium' | 'standard' {
  if (!accountType) return 'standard'
  const typeLower = accountType.toLowerCase()
  if (typeLower.includes('vip')) return 'vip'
  if (typeLower.includes('premium') || typeLower.includes('corporate')) return 'premium'
  return 'standard'
}

function determineCustomerStatus(account: any): 'active' | 'at-risk' | 'opportunity' {
  // Check if there are open opportunities
  if (account.opportunities && account.opportunities.length > 0) {
    return 'opportunity'
  }

  // Check last contact date
  if (account.updatedAt) {
    const daysSinceContact = (Date.now() - new Date(account.updatedAt).getTime()) / 86400000
    if (daysSinceContact > 30) return 'at-risk'
  }

  return 'active'
}

// Mock data with rich information (IDs and names will be replaced with real data)
function getMockVIPCustomers(): VIPCustomer[] {
  return [
    {
      id: 'vip-1',
      name: 'Weber Industries AG',
      accountType: 'VIP Corporate',
      relationshipManager: 'Sie',
      totalAssets: 2500000,
      lastContact: new Date(Date.now() - 172800000).toISOString(),
      nextScheduledMeeting: new Date(Date.now() + 14400000).toISOString(),
      priority: 'vip',
      status: 'active',
      opportunities: [
        { id: 'opp-1', type: 'Unternehmensanleihe', value: 500000, probability: 85 },
        { id: 'opp-1b', type: 'Expansion-Kredit', value: 300000, probability: 75 }
      ]
    },
    {
      id: 'vip-2',
      name: 'Dr. med. Klein',
      accountType: 'Premium Private',
      relationshipManager: 'Sie',
      totalAssets: 850000,
      lastContact: new Date(Date.now() - 604800000).toISOString(),
      priority: 'premium',
      status: 'opportunity',
      opportunities: [
        { id: 'opp-2', type: 'Vermögensverwaltung', value: 200000, probability: 70 }
      ]
    },
    {
      id: 'vip-3',
      name: 'Schmidt Immobilien GmbH',
      accountType: 'Corporate',
      relationshipManager: 'Sie',
      totalAssets: 1200000,
      lastContact: new Date(Date.now() - 2592000000).toISOString(),
      priority: 'premium',
      status: 'at-risk'
    },
    {
      id: 'vip-4',
      name: 'Müller Automative GmbH',
      accountType: 'VIP Corporate',
      totalAssets: 1800000,
      lastContact: new Date(Date.now() - 86400000).toISOString(),
      nextScheduledMeeting: new Date(Date.now() + 172800000).toISOString(),
      priority: 'vip',
      status: 'active',
      opportunities: [
        { id: 'opp-4', type: 'Betriebsmittelkredit', value: 400000, probability: 80 }
      ]
    },
    {
      id: 'vip-5',
      name: 'Fischer Holding AG',
      accountType: 'Premium Corporate',
      totalAssets: 950000,
      lastContact: new Date(Date.now() - 432000000).toISOString(),
      priority: 'premium',
      status: 'opportunity',
      opportunities: [
        { id: 'opp-5', type: 'Investmentfonds', value: 150000, probability: 65 }
      ]
    },
    {
      id: 'vip-6',
      name: 'Wagner Consulting',
      accountType: 'Premium',
      totalAssets: 680000,
      lastContact: new Date(Date.now() - 1209600000).toISOString(),
      priority: 'premium',
      status: 'active'
    }
  ]
}
