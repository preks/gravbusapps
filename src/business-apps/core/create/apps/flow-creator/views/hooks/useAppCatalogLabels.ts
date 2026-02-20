import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

type AppLabelMap = Record<string, string>

const APP_CATALOG_QUERY = `
  query FlowStudioAppCatalogLabels($codes: [String!]) {
    CatalogEntry(
      where: {
        _and: [
          { isDeleted: { _neq: true } }
          { code: { _in: $codes } }
          { catalog: { identifier: { _eq: "AppCatalog" }, version: { _eq: "1" } } }
        ]
      }
      limit: 200
    ) {
      code
      value
    }
  }
`

export function useAppCatalogLabels(
  accessToken: string,
  codes: string[]
): {
  labelsByCode: AppLabelMap
  isLoading: boolean
} {
  const graphqlClient = useGraphQLClient(accessToken)
  const [labelsByCode, setLabelsByCode] = useState<AppLabelMap>({})
  const [isLoading, setIsLoading] = useState(false)

  const stableCodes = useMemo(() => Array.from(new Set(codes.filter(Boolean))).sort(), [codes])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!accessToken) return
      if (stableCodes.length === 0) {
        setLabelsByCode({})
        return
      }
      setIsLoading(true)
      try {
        const res = await graphqlClient.request<{
          CatalogEntry: Array<{ code?: string | null; value?: string | null }>
        }>(APP_CATALOG_QUERY, { codes: stableCodes })
        if (cancelled) return
        const next: AppLabelMap = {}
        for (const row of res?.CatalogEntry ?? []) {
          const code = String(row.code || '').trim()
          const value = String(row.value || '').trim()
          if (code && value) next[code] = value
        }
        setLabelsByCode(next)
      } catch {
        if (!cancelled) setLabelsByCode({})
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, stableCodes])

  return { labelsByCode, isLoading }
}
