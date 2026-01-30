import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_RATING_SCALES,
  type GetRatingScalesResponse,
  type RatingScaleApi
} from '../queries/performanceCycleQueries'

export interface RatingScaleFromApi {
  id: string
  version: number
  name: string
  values: string[]
}

function mapApiScaleToUi(api: RatingScaleApi): RatingScaleFromApi {
  const values =
    (api.ratingScaleValue ?? [])
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(v => v.label ?? '')
      .filter(Boolean) ?? []
  return {
    id: api.id,
    version: api.version ?? 0,
    name: api.name ?? '',
    values
  }
}

export interface UseRatingScalesResult {
  ratingScales: RatingScaleFromApi[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRatingScales(accessToken: string | undefined): UseRatingScalesResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [ratingScales, setRatingScales] = useState<RatingScaleFromApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScales = useCallback(async () => {
    if (!accessToken) {
      setRatingScales([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetRatingScalesResponse>(GET_RATING_SCALES)
      const list = result?.RatingScale ?? []
      setRatingScales(list.map(mapApiScaleToUi))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rating scales'
      setError(message)
      setRatingScales([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchScales()
  }, [fetchScales])

  return { ratingScales, loading, error, refetch: fetchScales }
}
