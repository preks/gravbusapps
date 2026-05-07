import { useCallback, useEffect, useState } from 'react'
import type {
  InvestmentGroupDistributionDatum,
  InvestmentGroupParetoDatum,
  TopInvestmentDatum
} from '../queries/shared'
import { useInvestmentGroupDistributionQueries } from '../queries/distributionQueries'
import { useInvestmentGroupPerformanceQueries } from '../queries/performanceQueries'

interface TopInvestmentsState {
  topInvestments: TopInvestmentDatum[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentGroupTopInvestments = (
  accessToken: string | undefined,
  groupId: string,
  selectedCurrency: string,
  enabled = true
): TopInvestmentsState => {
  const { fetchTopInvestments } = useInvestmentGroupPerformanceQueries(accessToken)
  const [topInvestments, setTopInvestments] = useState<TopInvestmentDatum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setTopInvestments([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setTopInvestments(await fetchTopInvestments(groupId, selectedCurrency))
    } catch (err) {
      setTopInvestments([])
      setError(err instanceof Error ? err.message : 'Failed to load top investments')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, fetchTopInvestments, groupId, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { topInvestments, isLoading, error, refetch: loadData }
}

interface TypePerformanceState {
  typePerformance: InvestmentGroupDistributionDatum[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentGroupTypePerformance = (
  accessToken: string | undefined,
  groupId: string,
  selectedCurrency: string,
  enabled = true
): TypePerformanceState => {
  const { fetchDistribution } = useInvestmentGroupDistributionQueries(accessToken)
  const [typePerformance, setTypePerformance] = useState<InvestmentGroupDistributionDatum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setTypePerformance([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setTypePerformance(await fetchDistribution(groupId, 'investmentType', selectedCurrency))
    } catch (err) {
      setTypePerformance([])
      setError(err instanceof Error ? err.message : 'Failed to load type performance')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, fetchDistribution, groupId, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { typePerformance, isLoading, error, refetch: loadData }
}

interface ParetoInvestmentsState {
  paretoInvestments: InvestmentGroupParetoDatum[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentGroupParetoInvestments = (
  accessToken: string | undefined,
  groupId: string,
  selectedCurrency: string,
  enabled = true
): ParetoInvestmentsState => {
  const { fetchInvestmentPareto } = useInvestmentGroupPerformanceQueries(accessToken)
  const [paretoInvestments, setParetoInvestments] = useState<InvestmentGroupParetoDatum[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setParetoInvestments([])
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setParetoInvestments(await fetchInvestmentPareto(groupId, selectedCurrency))
    } catch (err) {
      setParetoInvestments([])
      setError(err instanceof Error ? err.message : 'Failed to load pareto investments')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, fetchInvestmentPareto, groupId, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { paretoInvestments, isLoading, error, refetch: loadData }
}
