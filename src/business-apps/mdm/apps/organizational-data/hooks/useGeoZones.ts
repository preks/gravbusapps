import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { toast } from '@newwork/nw-design-system'
import { useCallback, useEffect, useState } from 'react'
import { useGeoZoneQueries } from '../queries/useGeoZoneQueries'
import { GeoZone, GeoZoneFormValues } from '../types/GeoZone.types'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Search handler signature: receives the debounced query from Combobox.onSearch */
type SearchHandler = (query: string) => void

export default function useGeoZones(context: BusinessAppContextProps) {
  const structureId = getCurrentActiveStructureId() ?? ''

  // ─── State Management ────────────────────────────────────────────────────────
  const [geoZones, setGeoZones] = useState<GeoZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // ─── External Dependencies ─────────────────────────────────────────────────────
  const {
    fetchGeoZones,
    createGeoZone: createGeoZoneMutation,
    updateGeoZone: updateGeoZoneMutation,
    deleteGeoZone: deleteGeoZoneMutation
  } = useGeoZoneQueries(context.accessToken)

  // ─── Data Loading ──────────────────────────────────────────────────────────────
  const loadGeoZones = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchGeoZones({ structureId })
      setGeoZones(response.geoZones || [])
      setTotalCount(response.GeoZoneAggregate?.aggregate?.count || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading geo zones:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchGeoZones, structureId])

  useEffect(() => {
    if (context.accessToken && structureId) {
      loadGeoZones()
    }
  }, [context.accessToken, structureId, loadGeoZones])

  // ─── Helper for mutation operations ──────────────────────────────────────────────
  const handleMutation = useCallback(
    async <T>(operation: () => Promise<T>, successMessage: string): Promise<T> => {
      setMutationLoading(true)
      try {
        const result = await operation()
        toast.success(successMessage)
        loadGeoZones() // Refresh data
        return result
      } catch (error) {
        throw error
      } finally {
        setMutationLoading(false)
      }
    },
    [loadGeoZones]
  )

  // ─── Mutations (Business Logic Layer) ────────────────────────────────────────────────────
  const createGeoZone = useCallback(
    async (data: GeoZoneFormValues): Promise<GeoZone> => {
      const payload = {
        name: data.name,
        code: data.code,
        description: data.description || null,
        structureId
      }

      return handleMutation(() => createGeoZoneMutation(payload), 'Geo zone created successfully!')
    },
    [createGeoZoneMutation, structureId, handleMutation]
  )

  const updateGeoZone = useCallback(
    async (data: GeoZoneFormValues, id: string): Promise<GeoZone> => {
      const payload = {
        id,
        name: data.name,
        code: data.code,
        description: data.description || null,
        structureId
      }

      return handleMutation(() => updateGeoZoneMutation(id, payload), 'Geo zone updated successfully!')
    },
    [updateGeoZoneMutation, structureId, handleMutation]
  )

  const deleteGeoZone = useCallback(
    async (id: string): Promise<void> => {
      return handleMutation(() => deleteGeoZoneMutation(id), 'Geo zone deleted successfully!')
    },
    [deleteGeoZoneMutation, handleMutation]
  )

  // ─── Search Handlers ─────────────────────────────────────────────────────────────
  const handleGeoZoneSearch: SearchHandler = useCallback(
    (query: string) => {
      fetchGeoZones({ search: query, structureId }).then(res => {
        setGeoZones(res.geoZones || [])
        setTotalCount(res.GeoZoneAggregate?.aggregate?.count || 0)
      })
    },
    [fetchGeoZones, structureId]
  )

  // ─── Return API ────────────────────────────────────────────────────────────────
  return {
    // Data
    geoZones,
    isLoading,
    error,
    totalCount,
    structureId,

    // Search handlers
    handleGeoZoneSearch,

    // Fetch functions
    fetchGeoZones,

    // Mutations (Business Logic with built-in toasts and error handling)
    createGeoZone,
    updateGeoZone,
    deleteGeoZone,
    mutationLoading,

    refetch: loadGeoZones
  }
}
