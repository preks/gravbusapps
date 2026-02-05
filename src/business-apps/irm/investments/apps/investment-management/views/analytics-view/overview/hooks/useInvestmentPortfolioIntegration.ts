import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentPortfolioKPIs, InvestmentQueryVariables } from '../types'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useGetPortfolioKPIs } from '../queries/PortfolioKPIQueries'
import type { Investment as CentralInvestment } from '@/common/data/investment/types/investmentTypes'
import { safeCurrencyExtraction } from '@/common/utils/numberFormatter'
import { calculateInvestmentDuration } from '../../shared/utils/dateUtils'

// Helper functions for investment-specific business logic
const getInvestmentStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'green'
    case 'inactive':
      return 'red'
    case 'pending':
      return 'orange'
    case 'completed':
      return 'blue'
    case 'cancelled':
      return 'gray'
    default:
      return 'blue'
  }
}

const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      return 'green'
    case 'medium':
      return 'orange'
    case 'high':
      return 'red'
    default:
      return 'blue'
  }
}

export interface EnhancedInvestmentSummary {
  id: string
  name: string
  accountId?: string
  opportunityId?: string
  ownerEmployeeId?: string
  investmentGroup?: string
  investmentType?: string
  investmentPhase?: string
  investmentStatus?: string
  investmentRiskLevel?: string
  currency?: string
  acquisitionDate?: string
  exitDate?: string
  plannedExitDate?: string
  activeFrom?: string
  activeTo?: string
  marketValue?: number
  initialInvestmentAmount?: number
  totalInvestmentAmount?: number
  stakePercent?: number
  debtFinancing?: number
  leverageRatio?: number
  notesSummary?: string
  displayName: string
  statusColor: string
  riskLevelColor: string
  currencyCode: string
  roi: number
  isActive: boolean
  profitLoss: number
  investmentAge: number
  accountName?: string
  opportunityName?: string
}

export const useInvestmentPortfolioIntegration = (
  context: BusinessAppContextProps,
  selectedCurrency?: string,
  filters?: Record<string, any>,
  enabled: boolean = true
) => {
  const [investments, setInvestments] = useState<EnhancedInvestmentSummary[]>([])
  const [kpis, setKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    totalAmountInvested: 0,
    activeInvestments: 0,
    averageInvestmentValue: 0,
    averageMarketValue: 0
  })
  const [previousKpis, setPreviousKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    totalAmountInvested: 0,
    activeInvestments: 0,
    averageInvestmentValue: 0,
    averageMarketValue: 0
  })
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  const { fetchInvestments } = useGetInvestments(context)
  const { fetchPortfolioKPIs } = useGetPortfolioKPIs(context)

  /**
   * Extract currency code from investment, using shared utility for safe extraction
   */
  const extractCurrencyCode = (inv: CentralInvestment): string => {
    return safeCurrencyExtraction(inv.currency) || 'EUR'
  }

  /**
   * Calculate ROI (Return on Investment) percentage
   */
  const calculateROI = (marketValue: number, initialInvestment: number): number => {
    if (!initialInvestment || initialInvestment === 0) return 0
    return ((marketValue - initialInvestment) / initialInvestment) * 100
  }

  /**
   * Calculate investment age in days using shared utility
   */
  const calculateInvestmentAge = (acquisitionDate: string): number => {
    return calculateInvestmentDuration(acquisitionDate)
  }

  const transformInvestmentData = useCallback((central: CentralInvestment[]): EnhancedInvestmentSummary[] => {
    return central.map(inv => {
      const marketValue = inv.investmentMarketValue ?? inv.equityInvestment?.marketValue ?? 0

      const initial = inv.initialInvestmentAmount || 0
      const total = inv.totalInvestmentAmount || 0
      const debt = inv.debtFinancingAmount || 0
      const leverageRatio = total > 0 ? debt / total : undefined

      const statusLabel = inv.investmentStatusLabel || inv.investmentStatus?.value || ''
      const riskLabel = inv.realEstateInvestment?.investmentRiskLevel?.value || inv.investmentRiskLevel?.value || ''

      return {
        id: inv.id,
        name: inv.name || inv.code || `Investment ${inv.id}`,
        accountId: inv.investmentAccount?.id,
        opportunityId: inv.investmentOpportunity?.id,
        ownerEmployeeId: inv.ownerEmployee?.id,
        investmentGroup: inv.investmentGroup?.value,
        investmentType: inv.investmentType?.value,
        investmentPhase: (inv as any).investmentPhase?.value,
        investmentStatus: statusLabel,
        investmentRiskLevel: riskLabel,
        currency: inv.currency?.value,
        acquisitionDate: inv.acquisitionDate || undefined,
        exitDate: inv.exitDate || undefined,
        plannedExitDate: inv.plannedExitDate || (inv as any).planedExit || undefined,
        activeFrom: inv.acquisitionDate || undefined,
        activeTo: inv.exitDate || undefined,
        marketValue,
        initialInvestmentAmount: initial,
        totalInvestmentAmount: total,
        stakePercent: (inv as any).stakePercent ?? inv.stakePercentage,
        debtFinancing: debt,
        leverageRatio,
        notesSummary: (inv as any).notesSummary,
        displayName: inv.displayName || inv.name || inv.code || `Investment ${inv.id}`,
        statusColor: getInvestmentStatusColor(statusLabel),
        riskLevelColor: getRiskLevelColor(riskLabel),
        currencyCode: extractCurrencyCode(inv),
        roi: calculateROI(marketValue, initial),
        isActive: (inv.investmentStatus?.code || '').toLowerCase() === 'active',
        profitLoss: marketValue - initial,
        investmentAge: calculateInvestmentAge(inv.acquisitionDate || ''),
        accountName: inv.investmentAccount?.name,
        opportunityName: inv.investmentOpportunity?.name
      }
    })
  }, [])

  const loadData = useCallback(
    async (variables: InvestmentQueryVariables = {}) => {
      if (!context.accessToken || isLoadingRef.current) {
        return
      }

      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        // Fetch both investment data and KPIs with real historical comparison in parallel
        const [investmentResult, kpiResult] = await Promise.all([
          fetchInvestments({
            limit: variables.limit,
            offset: variables.offset,
            search: variables.search,
            orderBy: variables.orderBy?.map((o: any) => ({
              field: o.field || 'createdAt',
              direction: (o.direction || 'DESC') as 'ASC' | 'DESC'
            }))
          }),
          fetchPortfolioKPIs(selectedCurrency, filters)
        ])

        // Process investment data for list display
        const enhancedInvestments = transformInvestmentData(
          investmentResult.Investment as unknown as CentralInvestment[]
        )

        // Use real KPI data with historical comparison
        setInvestments(enhancedInvestments)
        setKPIs(kpiResult.current)
        setPreviousKPIs(kpiResult.previous)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [context.accessToken, fetchInvestments, fetchPortfolioKPIs, transformInvestmentData, selectedCurrency, filters]
  )

  useEffect(() => {
    if (enabled && context.accessToken) {
      void loadData()
    } else if (!enabled) {
      setIsLoading(false)
    }
  }, [enabled, context.accessToken, selectedCurrency, filters])

  return {
    investments,
    kpis,
    previousKpis,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
