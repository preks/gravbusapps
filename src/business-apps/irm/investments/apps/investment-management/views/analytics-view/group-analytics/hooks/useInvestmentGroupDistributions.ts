import { useCallback, useEffect, useRef, useState } from 'react'
import type { InvestmentGroupDistributionDatum, DistributionDimension } from '../queries/shared'
import { useInvestmentGroupDistributionQueries } from '../queries/distributionQueries'

export interface InvestmentGroupDistributionCurrencies {
  typeCountCurrency: string
  typeAmountCurrency: string
  statusCountCurrency: string
  statusAmountCurrency: string
}

interface SliceState {
  data: InvestmentGroupDistributionDatum[]
  isLoading: boolean
  error: string | null
}

const EMPTY_SLICE: SliceState = { data: [], isLoading: false, error: null }

type FetchDistributionFn = (
  groupId: string,
  dimension: DistributionDimension,
  currencyCode?: string
) => Promise<InvestmentGroupDistributionDatum[]>

const useDistributionSlice = (
  fetchDistribution: FetchDistributionFn,
  groupId: string,
  dimension: DistributionDimension,
  currencyCode: string,
  enabled: boolean,
  accessToken: string | undefined
) => {
  const [slice, setSlice] = useState<SliceState>(EMPTY_SLICE)

  // Keep latest fetchDistribution in a ref so it never drives re-fetches on its own —
  // only this slice's own currencyCode (or groupId / enabled) should trigger a reload.
  const fetchRef = useRef<FetchDistributionFn>(fetchDistribution)
  fetchRef.current = fetchDistribution

  const load = useCallback(async () => {
    if (!enabled || !accessToken || !groupId) {
      setSlice(EMPTY_SLICE)
      return
    }

    setSlice(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const data = await fetchRef.current(groupId, dimension, currencyCode)
      setSlice({ data, isLoading: false, error: null })
    } catch (err) {
      setSlice({
        data: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load distribution'
      })
    }
  }, [accessToken, currencyCode, dimension, enabled, groupId])

  useEffect(() => {
    load()
  }, [load])

  return { ...slice, refetch: load }
}

export interface InvestmentGroupDistributionsState {
  typeCountDistribution: InvestmentGroupDistributionDatum[]
  typeAmountDistribution: InvestmentGroupDistributionDatum[]
  statusCountDistribution: InvestmentGroupDistributionDatum[]
  statusAmountDistribution: InvestmentGroupDistributionDatum[]
  currencyDistribution: InvestmentGroupDistributionDatum[]
  typeCountLoading: boolean
  typeAmountLoading: boolean
  statusCountLoading: boolean
  statusAmountLoading: boolean
  currencyLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentGroupDistributions = (
  accessToken: string | undefined,
  groupId: string,
  currencies: InvestmentGroupDistributionCurrencies,
  enabled = true,
  includeInvestmentTypes = true
): InvestmentGroupDistributionsState => {
  const { fetchDistribution } = useInvestmentGroupDistributionQueries(accessToken)

  const typeCount = useDistributionSlice(
    fetchDistribution,
    groupId,
    'investmentType',
    currencies.typeCountCurrency,
    enabled && includeInvestmentTypes,
    accessToken
  )
  const typeAmount = useDistributionSlice(
    fetchDistribution,
    groupId,
    'investmentType',
    currencies.typeAmountCurrency,
    enabled && includeInvestmentTypes,
    accessToken
  )
  const statusCount = useDistributionSlice(
    fetchDistribution,
    groupId,
    'investmentStatus',
    currencies.statusCountCurrency,
    enabled,
    accessToken
  )
  const statusAmount = useDistributionSlice(
    fetchDistribution,
    groupId,
    'investmentStatus',
    currencies.statusAmountCurrency,
    enabled,
    accessToken
  )
  const currency = useDistributionSlice(fetchDistribution, groupId, 'currency', 'all', enabled, accessToken)

  const refetch = useCallback(() => {
    typeCount.refetch()
    typeAmount.refetch()
    statusCount.refetch()
    statusAmount.refetch()
    currency.refetch()
  }, [typeCount, typeAmount, statusCount, statusAmount, currency])

  const error = typeCount.error ?? typeAmount.error ?? statusCount.error ?? statusAmount.error ?? currency.error

  return {
    typeCountDistribution: typeCount.data,
    typeAmountDistribution: typeAmount.data,
    statusCountDistribution: statusCount.data,
    statusAmountDistribution: statusAmount.data,
    currencyDistribution: currency.data,
    typeCountLoading: typeCount.isLoading,
    typeAmountLoading: typeAmount.isLoading,
    statusCountLoading: statusCount.isLoading,
    statusAmountLoading: statusAmount.isLoading,
    currencyLoading: currency.isLoading,
    error,
    refetch
  }
}
