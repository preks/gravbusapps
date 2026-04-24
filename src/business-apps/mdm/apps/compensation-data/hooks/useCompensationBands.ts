import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CompensationBandQueryParameters, useCompensationBandQueries } from '../queries/CompensationBandQueries'
import {
  CompensationBand,
  CompensationBandDeletionPayload,
  transformCompensationBandRow
} from '../utils/CompensationBand.types'

export function useCompensationBands(context: BusinessAppContextProps) {
  // ─── State Management ──────────────────────────────────────────────────────
  const [compensationBands, setCompensationBands] = useState<CompensationBand[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ─── External Dependencies ─────────────────────────────────────────────────
  const { fetchCompensationBands, deleteCompensationBand } = useCompensationBandQueries(context.accessToken)

  // ─── Data Loading Functions ───────────────────────────────────────────────
  const loadData = useCallback(
    async (params: CompensationBandQueryParameters = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchCompensationBands(params)
        const transformedBands = (response.compensationBands || []).map(transformCompensationBandRow)
        setCompensationBands(transformedBands)
        setTotalCount(response.CompensationBandAggregate.aggregate.count)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading compensation bands:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchCompensationBands]
  )

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  const removeCompensationBand = useCallback(
    async (compensationBand: CompensationBandDeletionPayload['compensationBand']) => {
      setDeleteLoading(true)
      setDeleteError(null)

      try {
        await deleteCompensationBand({ changeMode: 'DELETE', compensationBand })
        await refetch()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setDeleteError(errorMessage)
        console.error('Error deleting compensation band:', err)
        throw err
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteCompensationBand, refetch]
  )

  // ─── Helper Functions ──────────────────────────────────────────────────────
  const getCompensationBandById = useCallback(
    (id: string): CompensationBand | undefined => {
      return compensationBands.find(band => band.id === id)
    },
    [compensationBands]
  )

  const searchCompensationBands = useCallback(
    (searchTerm: string): CompensationBand[] => {
      if (!searchTerm) return compensationBands
      const term = searchTerm.toLowerCase()
      return compensationBands.filter(
        band =>
          band.name.toLowerCase().includes(term) ||
          band.description?.toLowerCase().includes(term) ||
          band.currencyCode.toLowerCase().includes(term)
      )
    },
    [compensationBands]
  )

  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    // Data
    compensationBands,
    totalCount,

    // State
    isLoading: isLoading || deleteLoading,
    error: error || deleteError,

    // Actions
    refetch,
    removeCompensationBand,
    deleteLoading,

    // Helper functions
    getCompensationBandById,
    searchCompensationBands,

    // Raw fetch function for advanced usage
    fetchCompensationBands,
    loadData
  }
}
