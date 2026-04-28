import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  CATALOG_VERSION,
  InvestmentCatalogType,
  type FolderNode
} from '@/common/components/common-relations/setting-pages/folder-templates/types'

/**
 * Collects every folder name that appears anywhere in any investment
 * folder template configured on the `InvestmentGroup`, `InvestmentType`
 * and `InvestmentLiquidFundType` catalogs. Used by the investment portal
 * to hide empty template-skeleton folders from the Documents tab while
 * keeping user-created folders (even empty ones) visible.
 *
 * Fetches entries for all three catalogs in a single GraphQL request and
 * memoizes the result at module level so the whole page session only pays
 * one network call regardless of how many investments are opened or how
 * many times the portal is mounted.
 */
const INVESTMENT_TEMPLATE_CATALOGS: readonly InvestmentCatalogType[] = [
  InvestmentCatalogType.GROUP,
  InvestmentCatalogType.TYPE,
  InvestmentCatalogType.LIQUID_FUND_TYPE
]

interface TemplateCatalogEntry {
  id: string
  objectValue?: {
    initFolders?: FolderNode[]
  } | null
}

interface TemplateEntriesResponse {
  CatalogEntry: TemplateCatalogEntry[]
}

interface GraphQLClient {
  request<T>(query: string): Promise<T>
}

function buildTemplateEntriesQuery(): string {
  const identifiers = INVESTMENT_TEMPLATE_CATALOGS.map(identifier => `"${identifier}"`).join(', ')
  return `
    query GetInvestmentFolderTemplateEntries {
      CatalogEntry(
        where: {
          _and: [
            { isDeleted: { _neq: true } },
            { catalog: { identifier: { _in: [${identifiers}] }, version: { _eq: "${CATALOG_VERSION}" } } }
          ]
        }
        limit: 500
      ) {
        id
        objectValue
      }
    }
  `
}

function collectFolderNames(nodes: FolderNode[] | undefined, into: Set<string>): void {
  if (!nodes || nodes.length === 0) return
  for (const node of nodes) {
    if (node?.name) {
      into.add(node.name)
    }
    if (node?.folders?.length) {
      collectFolderNames(node.folders, into)
    }
  }
}

// Module-level cache: at most one fetch per page session, shared across
// every investment portal instance. Resets only on full page reload.
let cachedTemplateNames: Set<string> | null = null
let inflightRequest: Promise<Set<string>> | null = null

async function loadTemplateNames(client: GraphQLClient): Promise<Set<string>> {
  if (cachedTemplateNames) return cachedTemplateNames
  if (inflightRequest) return inflightRequest

  inflightRequest = client
    .request<TemplateEntriesResponse>(buildTemplateEntriesQuery())
    .then(result => {
      const names = new Set<string>()
      for (const entry of result.CatalogEntry ?? []) {
        collectFolderNames(entry?.objectValue?.initFolders, names)
      }
      cachedTemplateNames = names
      return names
    })
    .finally(() => {
      inflightRequest = null
    })

  return inflightRequest
}

interface UseInvestmentFolderTemplateNamesResult {
  templateNames: Set<string>
  isLoading: boolean
  error: string | null
}

export function useInvestmentFolderTemplateNames(accessToken: string): UseInvestmentFolderTemplateNamesResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [templateNames, setTemplateNames] = useState<Set<string>>(() => cachedTemplateNames ?? new Set())
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedTemplateNames)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!accessToken) {
      setTemplateNames(new Set())
      setIsLoading(false)
      return
    }

    if (cachedTemplateNames) {
      setTemplateNames(cachedTemplateNames)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    loadTemplateNames(graphqlClient)
      .then(names => {
        if (cancelled) return
        setTemplateNames(names)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Error loading investment folder template names:', err)
        setError(err instanceof Error ? err.message : 'Failed to load investment folder templates')
        setTemplateNames(new Set())
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient])

  return useMemo(() => ({ templateNames, isLoading, error }), [templateNames, isLoading, error])
}

export default useInvestmentFolderTemplateNames
