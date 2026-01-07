import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentDashboardStats } from '../types'
import { useInvestmentDataIntegration } from '@/common/data/investment/hooks/useInvestmentDataIntegration'

export const useInvestmentDashboardStats = (context: BusinessAppContextProps) => {
  const {
    investments,
    investmentAccounts,
    investmentContacts,
    investmentOpportunities,
    investmentLeads,
    stats: integrationStats,
    isLoading,
    error,
    refetch: refetchIntegration
  } = useInvestmentDataIntegration(context)

  const [stats, setStats] = useState<InvestmentDashboardStats>({
    // IRM Stats
    totalLeads: 0,
    totalOpportunities: 0,
    totalAccounts: 0,
    totalContacts: 0,

    // Investment Stats
    totalInvestments: 0,
    equityInvestments: 0,
    realEstateInvestments: 0,
    liquidFunds: 0,
    totalPortfolioValue: 0,
    assetTypes: 0,
    averageROI: 0
  })

  const computeStats = useCallback(() => {
    // Basic counts from integration
    const totalLeads = investmentLeads.length
    const totalOpportunities = investmentOpportunities.length
    const totalAccounts = investmentAccounts.length
    const totalContacts = investmentContacts.length
    const totalInvestments = investments.length

    // Distinct asset types
    const assetTypeSet = new Set(
      investments
        .map(inv => inv.investmentType?.id || inv.investmentType?.code || inv.investmentTypeLabel)
        .filter(Boolean) as string[]
    )
    const assetTypes = assetTypeSet.size

    // Group breakdown
    let equityInvestments = 0
    let realEstateInvestments = 0
    let liquidFunds = 0

    investments.forEach(inv => {
      const group = (inv as any).investmentGroup?.value || (inv as any).investmentGroupLabel || ''
      if (group === 'Equity') equityInvestments += 1
      else if (group === 'Real Estate') realEstateInvestments += 1
      else if (group === 'Liquid Fund') liquidFunds += 1
    })

    // Portfolio value and ROI
    const totalPortfolioValue = integrationStats.totalMarketValue || 0

    let totalROI = 0
    let validROICount = 0
    investments.forEach(inv => {
      const initial = inv.initialInvestmentAmount || 0
      const market = (inv as any).investmentMarketValue || 0
      if (initial > 0 && market !== null && market !== undefined) {
        const roi = ((market - initial) / initial) * 100
        totalROI += roi
        validROICount += 1
      }
    })
    const averageROI = validROICount > 0 ? totalROI / validROICount : 0

    setStats({
      totalLeads,
      totalOpportunities,
      totalAccounts,
      totalContacts,
      totalInvestments,
      equityInvestments,
      realEstateInvestments,
      liquidFunds,
      totalPortfolioValue,
      assetTypes,
      averageROI
    })
  }, [
    investmentLeads,
    investmentOpportunities,
    investmentAccounts,
    investmentContacts,
    investments,
    integrationStats.totalMarketValue
  ])

  useEffect(() => {
    computeStats()
  }, [computeStats])

  const refetch = useCallback(() => {
    return refetchIntegration()
  }, [refetchIntegration])

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}
