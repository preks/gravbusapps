import { useEffect, useState } from 'react'

export interface ReferenceFetchState<T> {
  data: T | null
  loading: boolean
}

/**
 * Generic by-id fetch for the non-CRM reference cards. Each card type wraps
 * its REST service in a `fetcher` and this hook handles the loading flag and
 * out-of-order/unmount safety. Fetchers must resolve to `null` (never throw)
 * on failure so the card can fall back to its label/`reference.data`.
 *
 * Dispatching by type (see `EntityReferenceCard`) means only the matched
 * card mounts, so this fires exactly one request per rendered card.
 */
export function useReferenceFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T | null>,
  deps: ReadonlyArray<unknown>
): ReferenceFetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setLoading(true)
    setData(null)

    fetcher(controller.signal)
      .then(result => {
        if (active) setData(result)
      })
      .catch(() => {
        if (active) setData(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, deps)

  return { data, loading }
}
