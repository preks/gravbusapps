import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AggregatedFunnelStage } from '../overview/widgets/PipelineFunnel'

/**
 * Configuration for aggregated funnel queries (module-agnostic)
 * Each module (CRM, IRM, etc.) provides its specific configuration
 */
export interface AggregatedFunnelConfig {
  /** Opportunity table name (e.g., 'Opportunity', 'InvestmentOpportunity') */
  opportunityTable: string
  /** Aggregate table name (e.g., 'OpportunityAggregate', 'InvestmentOpportunityAggregate') */
  aggregateTable: string
  /** Pipeline field name (e.g., 'salesPipelineRef', 'opportunityPipelineRef') */
  pipelineFieldName: string
  /** Stage field path (e.g., 'salesPipelineStage', 'opportunityPipelineStage') */
  stageFieldPath: string
  /** Stage ref field (e.g., 'salesPipelineStageRef', 'opportunityPipelineStageRef') */
  stageRefField: string
  /** Optional stage type catalog for catalog-driven funnel stages (e.g. SalesPipelineStageType, InvestmentOpportunityPipelineStageType) */
  stageTypeCatalog?: string
  /** Catalog version (default 'v1') */
  version?: string
}

/** Stage type from catalog for funnel ordering and labels */
export interface CatalogStageType {
  code: string
  name: string
  order: number
}

// Helper: Format stage names to proper case
const toProperCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Helper: Fetch distinct currencies
const fetchDistinctCurrencies = async (
  graphqlClient: any,
  config: AggregatedFunnelConfig,
  currentYearStart?: string,
  currentYearEnd?: string,
  stageFieldPath?: string
): Promise<string[]> => {
  const hasYearFilter = currentYearStart && currentYearEnd

  const currenciesQuery = `
    query GetDistinctCurrencies${hasYearFilter ? '($currentYearStart: timestamptz, $currentYearEnd: timestamptz)' : ''} {
      distinctCurrencies: ${config.opportunityTable}(
        where: {
          isDeleted: { _eq: false }
          currencyRef: { _isNull: false }
          ${hasYearFilter ? 'createdAt: { _gte: $currentYearStart, _lte: $currentYearEnd }' : ''}
          ${stageFieldPath ? `${stageFieldPath}: { type: { _isNull: false } }` : ''}
        }
        distinctOn: [currencyRef]
        orderBy: [{ currencyRef: ASC }]
      ) {
        currencyRef
      }
    }
  `

  const currenciesResult = await graphqlClient.request(
    currenciesQuery,
    hasYearFilter ? { currentYearStart, currentYearEnd } : {}
  )

  const currencies =
    currenciesResult.distinctCurrencies?.map((opp: any) => opp.currencyRef?.split(':').pop()).filter(Boolean) || []

  return Array.from(new Set<string>(currencies as string[])).sort((a, b) => a.localeCompare(b))
}

// Helper: Fetch distinct stage types
const fetchDistinctStageTypes = async (
  graphqlClient: any,
  config: AggregatedFunnelConfig,
  currentYearStart?: string,
  currentYearEnd?: string
): Promise<Map<string, { order: number; name: string }>> => {
  const hasYearFilter = currentYearStart && currentYearEnd

  const stageTypesQuery = `
    query GetDistinctStageTypes${hasYearFilter ? '($currentYearStart: timestamptz, $currentYearEnd: timestamptz)' : ''} {
      distinctStages: ${config.opportunityTable}(
        where: {
          isDeleted: { _eq: false }
          ${hasYearFilter ? 'createdAt: { _gte: $currentYearStart, _lte: $currentYearEnd }' : ''}
          ${config.stageFieldPath}: { type: { _isNull: false } }
        }
        distinctOn: [${config.stageRefField}]
      ) {
        ${config.stageRefField}
        ${config.stageFieldPath} {
          type
          value
          additionalValue1
        }
      }
    }
  `

  const stageTypesResult = await graphqlClient.request(
    stageTypesQuery,
    hasYearFilter ? { currentYearStart, currentYearEnd } : {}
  )

  const stageTypeMap = new Map<string, { order: number; name: string }>()

  stageTypesResult.distinctStages?.forEach((opp: any) => {
    const stage = opp[config.stageFieldPath]
    if (!stage) return

    const stageType = stage.type
    const stageOrder = Number.parseInt(stage.additionalValue1 || '999', 10)

    if (stageType && !stageTypeMap.has(stageType)) {
      const formattedName = toProperCase(stageType.replace(/_/g, ' '))
      stageTypeMap.set(stageType, { order: stageOrder, name: formattedName })
    }
  })

  return stageTypeMap
}

// Helper: Fetch or reuse cached static data
interface FetchCachedDataOptions {
  graphqlClient: any
  config: AggregatedFunnelConfig
  dateRange?: {
    start: string
    end: string
  }
  cacheParams: {
    pipelineRefsKey: string
    currentYear: number | string
  }
  staticDataCache: React.MutableRefObject<{
    currencies: string[]
    stageTypeMap: Map<string, { order: number; name: string }>
    pipelineKey: string
    yearKey: number | string
  } | null>
  setAvailableCurrencies: (currencies: string[]) => void
}

const fetchOrReuseCachedData = async ({
  graphqlClient,
  config,
  dateRange,
  cacheParams,
  staticDataCache,
  setAvailableCurrencies
}: FetchCachedDataOptions): Promise<Map<string, { order: number; name: string }> | null> => {
  const { pipelineRefsKey, currentYear } = cacheParams
  const currentYearStart = dateRange?.start
  const currentYearEnd = dateRange?.end
  const cacheKey = `${pipelineRefsKey}-${currentYear}`
  const canReuseCachedData =
    staticDataCache.current?.pipelineKey === cacheKey && (staticDataCache.current?.currencies.length ?? 0) > 0

  if (canReuseCachedData) {
    setAvailableCurrencies(staticDataCache.current!.currencies)
    return staticDataCache.current!.stageTypeMap
  }

  // Fetch currencies
  const uniqueCurrencies = await fetchDistinctCurrencies(
    graphqlClient,
    config,
    currentYearStart,
    currentYearEnd,
    config.stageFieldPath
  )
  setAvailableCurrencies(uniqueCurrencies.length > 0 ? uniqueCurrencies : ['EUR'])

  // Fetch stage types
  const stageTypeMap = await fetchDistinctStageTypes(graphqlClient, config, currentYearStart, currentYearEnd)

  if (stageTypeMap.size === 0) {
    return null
  }

  // Cache static data for reuse
  staticDataCache.current = {
    currencies: uniqueCurrencies,
    stageTypeMap,
    pipelineKey: cacheKey,
    yearKey: currentYear
  }

  return stageTypeMap
}

export interface UseAggregatedFunnelDataProps {
  accessToken: string
  pipelineRefs: string[]
  selectedCurrency?: string
  currentYear?: number | null // null means no year filter
  enabled?: boolean
  config: AggregatedFunnelConfig
  /** When provided, funnel stages and order come from this catalog (CRM/IRM stage type catalog) */
  catalogStageTypes?: CatalogStageType[]
}

export interface UseAggregatedFunnelDataReturn {
  aggregatedFunnel: AggregatedFunnelStage[]
  availableCurrencies: string[]
  totalPipelineValue: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generic hook for fetching aggregated funnel data across all pipelines
 * Module-agnostic - accepts configuration for any module
 * Uses server-side aggregation for optimal performance
 *
 * @param accessToken - Authentication token
 * @param pipelineRefs - Array of pipeline references to aggregate
 * @param selectedCurrency - Optional currency filter (defaults to 'EUR')
 * @param currentYear - Optional year filter (defaults to current year)
 * @param enabled - Whether to automatically fetch data (defaults to true)
 * @param config - Configuration for table and field names
 */
export const useAggregatedFunnelData = ({
  accessToken,
  pipelineRefs,
  selectedCurrency = 'EUR',
  currentYear = null, // null means no year filter
  enabled = true,
  config,
  catalogStageTypes
}: UseAggregatedFunnelDataProps): UseAggregatedFunnelDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [aggregatedFunnel, setAggregatedFunnel] = useState<AggregatedFunnelStage[]>([])
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['EUR']) // Default to EUR
  const [totalPipelineValue, setTotalPipelineValue] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache static data (currencies and stage types) to avoid refetching
  const staticDataCache = useRef<{
    currencies: string[]
    stageTypeMap: Map<string, { order: number; name: string }>
    pipelineKey: string
    yearKey: number
  } | null>(null)

  // Stringify pipelineRefs to avoid infinite loops from array reference changes
  const pipelineRefsKey = JSON.stringify(pipelineRefs)

  // Type definition for stage information
  type StageInfo = { order: number; name: string }

  // Helper to prepare year filter parameters
  const prepareYearFilter = (year: number | null) => {
    const hasYearFilter = year !== null && year !== undefined
    return {
      hasYearFilter,
      currentYearStart: hasYearFilter ? `${year}-01-01` : undefined,
      currentYearEnd: hasYearFilter ? `${year}-12-31` : undefined
    }
  }

  // Helper to process stage aggregates from API response
  const processStageAggregates = (
    result: any,
    stageTypes: string[],
    stageTypeMap: Map<string, StageInfo>,
    includeZeroCountStages: boolean = false
  ): { funnelData: AggregatedFunnelStage[]; total: number } => {
    const funnelDataWithOrder: Array<AggregatedFunnelStage & { order: number }> = []
    let total = 0

    for (const stageType of stageTypes) {
      const alias = `stage_${stageType.replace(/\W/g, '_')}`
      const aggregate = result[alias]?.aggregate
      const count = aggregate?.count || 0
      const sum = aggregate?.sum?.estimatedAmount || 0

      if (count > 0 || sum > 0 || includeZeroCountStages) {
        const stageInfo = stageTypeMap.get(stageType)
        funnelDataWithOrder.push({
          stage: stageInfo?.name || stageType,
          count,
          value: sum,
          color: undefined,
          order: stageInfo?.order ?? 999
        })
        total += sum
      }
    }

    funnelDataWithOrder.sort((a, b) => a.order - b.order)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const funnelData: AggregatedFunnelStage[] = funnelDataWithOrder.map(({ order, ...rest }) => rest)
    return { funnelData, total }
  }

  const fetchData = useCallback(async () => {
    const parsedPipelineRefs = JSON.parse(pipelineRefsKey)

    if (!enabled || !accessToken || parsedPipelineRefs.length === 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { hasYearFilter, currentYearStart, currentYearEnd } = prepareYearFilter(currentYear)
      const currencyFilter = selectedCurrency ? `Currency:v1:${selectedCurrency}` : null

      let stageTypeMap: Map<string, StageInfo>
      let stageTypes: string[]
      let includeZeroCountStages: boolean

      if (catalogStageTypes && catalogStageTypes.length > 0) {
        // Catalog-driven: use stage types from CRM/IRM stage type catalog
        stageTypeMap = new Map(catalogStageTypes.map(s => [s.code, { order: s.order, name: s.name }]))
        stageTypes = catalogStageTypes.map(s => s.code)
        includeZeroCountStages = true
        // Fetch currencies only (no cache reuse for catalog path)
        const uniqueCurrencies = await fetchDistinctCurrencies(
          graphqlClient,
          config,
          currentYearStart,
          currentYearEnd,
          config.stageFieldPath
        )
        setAvailableCurrencies(uniqueCurrencies.length > 0 ? uniqueCurrencies : ['EUR'])
      } else {
        // Data-driven: discover stage types from opportunities
        const map = await fetchOrReuseCachedData({
          graphqlClient,
          config,
          dateRange: hasYearFilter
            ? {
                start: currentYearStart!,
                end: currentYearEnd!
              }
            : undefined,
          cacheParams: {
            pipelineRefsKey,
            currentYear: currentYear ?? 'all'
          },
          staticDataCache,
          setAvailableCurrencies
        })

        if (!map) {
          setAggregatedFunnel([])
          setTotalPipelineValue(0)
          return
        }
        stageTypeMap = map
        stageTypes = Array.from(stageTypeMap.keys())
        includeZeroCountStages = false
      }

      const buildStageAggregate = (stageType: string) => {
        // Create valid GraphQL alias (replace special characters)
        const alias = `stage_${stageType.replace(/\W/g, '_')}`
        return `
          ${alias}: ${config.aggregateTable}(
            where: {
              isDeleted: { _eq: false }
              ${config.pipelineFieldName}: { _in: $pipelineRefs }
              ${config.stageFieldPath}: { type: { _eq: "${stageType}" } }
              ${hasYearFilter ? 'createdAt: { _gte: $currentYearStart, _lte: $currentYearEnd }' : ''}
              ${currencyFilter ? `currencyRef: { _eq: "${currencyFilter}" }` : ''}
            }
          ) {
            aggregate {
              count
              sum {
                estimatedAmount
              }
            }
          }
        `
      }

      const aggregatesQuery = `
        query GetAllPipelinesOpportunitiesAggregated(
          $pipelineRefs: [String!]
          ${hasYearFilter ? '$currentYearStart: timestamptz' : ''}
          ${hasYearFilter ? '$currentYearEnd: timestamptz' : ''}
        ) {
          ${stageTypes.map(type => buildStageAggregate(type)).join('\n')}
        }
      `

      const aggregatesVariables: any = {
        pipelineRefs: parsedPipelineRefs
      }

      if (hasYearFilter) {
        aggregatesVariables.currentYearStart = currentYearStart
        aggregatesVariables.currentYearEnd = currentYearEnd
      }

      const result = await graphqlClient.request<any>(aggregatesQuery, aggregatesVariables)

      // Process stage aggregates (include zero-count stages when using catalog)
      const { funnelData, total } = processStageAggregates(result, stageTypes, stageTypeMap, includeZeroCountStages)

      setAggregatedFunnel(funnelData)
      setTotalPipelineValue(total)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch aggregated funnel data'
      setError(errorMessage)
      console.error('❌ Error fetching aggregated funnel data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, pipelineRefsKey, selectedCurrency, currentYear, enabled, config, graphqlClient, catalogStageTypes])

  useEffect(() => {
    if (enabled) {
      void fetchData()
    }
  }, [enabled, fetchData])

  return {
    aggregatedFunnel,
    availableCurrencies,
    totalPipelineValue,
    isLoading,
    error,
    refetch: () => {
      fetchData()
    }
  }
}
