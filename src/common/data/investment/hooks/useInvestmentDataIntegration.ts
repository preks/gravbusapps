// Investment data integration hook - combines multiple data sources
import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '../types/investmentTypes'
import type { InvestmentAccount } from '../types/investmentAccountTypes'
import type { InvestmentContact } from '../types/investmentContactTypes'
import type { InvestmentOpportunity } from '../types/investmentOpportunityTypes'
import type { InvestmentLead } from '../types/investmentLeadTypes'

// Import the individual hooks
import { useGetInvestments } from './useInvestments'
import { useGetInvestmentAccounts } from './useInvestmentAccounts'
import { useGetInvestmentContacts } from './useInvestmentContacts'
import { useGetInvestmentLeads } from './useInvestmentLeads'
import { useGetInvestmentOpportunities } from './useInvestmentOpportunities'

// Interface for the combined investment data
export interface InvestmentDataIntegration {
  // Core data (enhanced types with computed fields)
  investments: Investment[]
  investmentAccounts: InvestmentAccount[]
  investmentContacts: InvestmentContact[]
  investmentOpportunities: InvestmentOpportunity[]
  investmentLeads: InvestmentLead[]

  // Aggregate data
  stats: {
    totalInvestments: number
    totalAccounts: number
    totalContacts: number
    totalOpportunities: number
    totalLeads: number
    totalMarketValue: number
  }

  // Loading states
  isLoading: boolean
  error: string | null

  // Refetch function
  refetch: () => Promise<void>
}

// Main data integration hook
export const useInvestmentDataIntegration = (context: BusinessAppContextProps): InvestmentDataIntegration => {
  // Individual hook instances
  const { fetchInvestments } = useGetInvestments(context)
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context)

  // State management (enhanced types with computed fields)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccount[]>([])
  const [investmentContacts, setInvestmentContacts] = useState<InvestmentContact[]>([])
  const [investmentOpportunities, setInvestmentOpportunities] = useState<InvestmentOpportunity[]>([])
  const [investmentLeads, setInvestmentLeads] = useState<InvestmentLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data in parallel
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [investmentsResult, accountsResult, contactsResult, opportunitiesResult, leadsResult] = await Promise.all([
        fetchInvestments({ limit: 100 }),
        fetchInvestmentAccounts({ limit: 100 }),
        fetchInvestmentContacts({ limit: 100 }),
        fetchInvestmentOpportunities({ limit: 100 }),
        fetchInvestmentLeads({ limit: 100 })
      ])

      setInvestments(investmentsResult.Investment || [])
      setInvestmentAccounts(accountsResult.InvestmentAccount || [])
      setInvestmentContacts(contactsResult.InvestmentContact || [])
      setInvestmentOpportunities(opportunitiesResult.InvestmentOpportunity || [])
      setInvestmentLeads(leadsResult.InvestmentLead || [])
    } catch (err) {
      console.error('Error loading investment data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [
    fetchInvestments,
    fetchInvestmentAccounts,
    fetchInvestmentContacts,
    fetchInvestmentOpportunities,
    fetchInvestmentLeads
  ])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  // Calculate aggregate statistics
  const stats = {
    totalInvestments: investments.length,
    totalAccounts: investmentAccounts.length,
    totalContacts: investmentContacts.length,
    totalOpportunities: investmentOpportunities.length,
    totalLeads: investmentLeads.length,
    totalMarketValue: investments.reduce((sum, inv) => sum + (inv.investmentMarketValue || 0), 0)
  }

  return {
    investments,
    investmentAccounts,
    investmentContacts,
    investmentOpportunities,
    investmentLeads,
    stats,
    isLoading,
    error,
    refetch: loadData
  }
}
