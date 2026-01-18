import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetTravelRegionRulesData,
  TravelRegionRuleData,
  TravelRegionRuleQueryVariables
} from '../queries/TravelRegionRuleQueries'

export interface EnhancedTravelRegionRule {
  id: string
  name: string
  code: string
  effectiveFrom: string
  effectiveTo?: string
  isActive: boolean
  description?: string
  createdAt: string
  updatedAt: string
  version?: number
  details: {
    id: string
    amount: number
    country: string
    currency: string
    countryRef?: string
    currencyRef?: string
    travelRegion: string
    travelRegionRef?: string
    home: boolean
    activeFrom?: string
    activeTo?: string
  }[]
}

export const useTravelRegionRulesIntegration = (context: BusinessAppContextProps) => {
  const [travelRegionRules, setTravelRegionRules] = useState<EnhancedTravelRegionRule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { fetchTravelRegionRules } = useGetTravelRegionRulesData(context)

  // Transform GraphQL data to enhanced UI format
  const transformTravelRegionRuleData = useCallback((data: TravelRegionRuleData[]): EnhancedTravelRegionRule[] => {
    return data.map(rule => {
      // Check if rule is currently active
      const now = new Date()
      const activeFrom = rule.activeFrom ? new Date(rule.activeFrom) : null
      const activeTo = rule.activeTo ? new Date(rule.activeTo) : null
      const isActive = !rule.isDeleted && (!activeFrom || activeFrom <= now) && (!activeTo || activeTo >= now)

      return {
        id: rule.id,
        name: rule.name,
        code: rule.code,
        effectiveFrom: rule.activeFrom || rule.createdAt,
        effectiveTo: rule.activeTo,
        isActive,
        description: rule.name,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        version: rule.version,
        details: rule.allowanceRegionRuleDetail.map(detail => ({
          id: detail.id,
          amount: detail.amount,
          country: detail.country?.value || 'Unknown',
          currency: detail.currency?.code || 'EUR',
          countryRef: detail.country?.id || detail.countryRef,
          currencyRef: detail.currency?.id || detail.currencyRef,
          travelRegion: detail.travelRegion?.value || 'Unknown',
          travelRegionRef: detail.travelRegion?.id || detail.travelRegionRef,
          home: detail.home || false,
          activeFrom: detail.activeFrom,
          activeTo: detail.activeTo
        }))
      }
    })
  }, [])

  const loadTravelRegionRules = useCallback(
    async (variables: TravelRegionRuleQueryVariables = {}) => {
      if (!context.accessToken) {
        setError('Access token is required')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchTravelRegionRules(variables)

        if (result?.AllowanceRegionRule) {
          const enhancedRules = transformTravelRegionRuleData(result.AllowanceRegionRule)
          setTravelRegionRules(enhancedRules)
          setTotalCount(result.AllowanceRegionRuleAggregate?.aggregate?.count || 0)
        } else {
          setTravelRegionRules([])
          setTotalCount(0)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load travel region rules'
        setError(errorMessage)
        setTravelRegionRules([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, fetchTravelRegionRules, transformTravelRegionRuleData]
  )

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      loadTravelRegionRules()
    }
  }, [context.accessToken, loadTravelRegionRules])

  const searchTravelRegionRules = useCallback(
    async (searchTerm: string, variables: TravelRegionRuleQueryVariables = {}) => {
      await loadTravelRegionRules({
        ...variables,
        search: searchTerm
      })
    },
    [loadTravelRegionRules]
  )

  const refetch = useCallback(() => {
    loadTravelRegionRules()
  }, [loadTravelRegionRules])

  return {
    travelRegionRules,
    isLoading,
    error,
    totalCount,
    loadTravelRegionRules,
    searchTravelRegionRules,
    refetch
  }
}
