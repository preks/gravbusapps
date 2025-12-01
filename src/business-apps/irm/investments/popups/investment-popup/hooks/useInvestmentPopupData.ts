import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentById } from '@/common/data/investment/hooks/useInvestments'
import { useCatalogEntries } from '@/common/data/catalog'
import { Investment } from '@/common/data/investment/types/investmentTypes'
import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

interface UseInvestmentPopupDataParams {
  context: BusinessAppContextProps
  investmentId: string
  scope:
    | 'tile'
    | 'text'
    | 'kpi'
    | 'table'
    | 'chart'
    | 'exit'
    | 'status'
    | 'liquidity'
    | 'ppmforecast'
    | 'kpiforecast'
    | 'liquidityForecast'
    | 'delete'
  tileKey?: string // Only needed for legacy tile scope
  enabled?: boolean // Optional flag to disable data fetching
}

interface UseInvestmentPopupDataReturn {
  investment: Investment | null
  tileValue?: string // Only for tile scope
  statusOptions: CatalogEntry[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentPopupData = ({
  context,
  investmentId,
  scope,
  tileKey,
  enabled = true
}: UseInvestmentPopupDataParams): UseInvestmentPopupDataReturn => {
  const [investment, setInvestment] = useState<Investment | null>(null)
  const [tileValue, setTileValue] = useState<string | undefined>(undefined)
  const [statusOptions, setStatusOptions] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use central hooks
  const { fetchInvestmentById } = useGetInvestmentById(context)
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })

  const loadInvestmentData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (!enabled || !investmentId) {
        setInvestment(null)
        setTileValue(undefined)
        setStatusOptions([])
        return
      }
      // Load investment data using central hook
      const investmentResult = await fetchInvestmentById(investmentId)
      const investmentData = investmentResult.investment

      if (!investmentData) {
        throw new Error('Investment not found')
      }

      setInvestment(investmentData)

      // Load tile value for tile scope
      if (scope === 'tile' && tileKey) {
        const raw = investmentData.additionalProperties
        const ap: any =
          typeof raw === 'string'
            ? (() => {
                try {
                  return JSON.parse(raw)
                } catch {
                  return {}
                }
              })()
            : raw || {}
        const tiles = ap?.tiles || {}
        setTileValue(tiles[tileKey] ?? '')
      }

      // Load status options for status scope
      if (scope === 'status') {
        const statusResult = await fetchCatalogEntriesByIdentifier('InvestmentStatus', {
          limit: 100,
          offset: 0,
          version: 'v1'
        })

        setStatusOptions(statusResult.entries || [])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investment data'
      setError(errorMessage)
      console.error('Error loading investment popup data:', err)
    } finally {
      setLoading(false)
    }
  }, [enabled, investmentId, scope, tileKey, fetchInvestmentById, fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    loadInvestmentData()
  }, [loadInvestmentData])

  const refetch = useCallback(() => {
    loadInvestmentData()
  }, [loadInvestmentData])

  return {
    investment,
    tileValue,
    statusOptions,
    loading,
    error,
    refetch
  }
}
