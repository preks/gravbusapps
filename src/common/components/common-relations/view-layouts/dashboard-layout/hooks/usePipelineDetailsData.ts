import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

/**
 * Configuration for pipeline details queries (module-agnostic)
 * Each module (CRM, IRM, etc.) provides its specific configuration
 */
export interface PipelineDetailsConfig {
  opportunityTable: string
  opportunityAggregateTable: string
  activityAggregateTable: string
  activityCatalogName: string
  pipelineFieldName: string
  stageFieldName: string
  usePipelineRelationship: boolean
}

export interface PipelineInfo {
  id: string
  name: string
  ref: string
  description?: string
  color?: string
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface PipelineStage {
  id: string
  name: string
  code: string
  order: number
  color?: string
}

export interface OpportunityFunnelData {
  stage: {
    id: string
    name: string
    ref: string
    order: number
    color?: string
  }
  count: number
  value: number
  percentage: number
}

export interface PipelineMetrics {
  totalOpportunities: number
  totalValue: number
  avgOpportunitySize: number
  opportunitiesWon: number
  winRate: number // percentage
}

export interface WinRateMetrics {
  allTime: {
    won: number
    lost: number
    winRate: number
  }
  monthToDate: {
    won: number
    lost: number
    winRate: number
  }
  quarterToDate: {
    won: number
    lost: number
    winRate: number
  }
}

export interface ActivityVolumeMetrics {
  last7Days: {
    total: number
    types: Array<{
      code: string
      value: string
      count: number
    }>
  }
  last30Days: {
    total: number
    types: Array<{
      code: string
      value: string
      count: number
    }>
  }
}

export interface SalesRepPerformance {
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  opportunitiesWon: number
  opportunitiesLost: number
  totalOpportunities: number
  totalValue: number
  winRate: number // percentage
  activitiesCount: number
}

export interface PipelineData {
  pipeline: PipelineInfo
  metrics: PipelineMetrics
  funnelData: OpportunityFunnelData[]
  winRateMetrics: WinRateMetrics
  activityVolume: ActivityVolumeMetrics
  leaderboard: SalesRepPerformance[]
}

export interface UsePipelineDetailsDataProps {
  accessToken: string
  pipeline: PipelineInfo | null
  dateRange: DateRange
  selectedCurrency?: string
  enabled?: boolean
  config: PipelineDetailsConfig
}

export interface UsePipelineDetailsDataReturn {
  pipelineData: PipelineData | null
  availableCurrencies: string[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Module-agnostic hook for fetching pipeline details data
 * Uses server-side aggregates for optimal performance
 *
 * @example CRM
 * const { pipelineData, isLoading } = usePipelineDetailsData({
 *   accessToken,
 *   pipeline,
 *   dateRange,
 *   config: crmPipelineDetailsConfig
 * })
 *
 * @example IRM
 * const { pipelineData, isLoading } = usePipelineDetailsData({
 *   accessToken,
 *   pipeline,
 *   dateRange,
 *   config: irmPipelineDetailsConfig
 * })
 */
export const usePipelineDetailsData = ({
  accessToken,
  pipeline,
  dateRange,
  selectedCurrency,
  enabled = true,
  config
}: UsePipelineDetailsDataProps): UsePipelineDetailsDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['EUR'])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // Cache static data to avoid refetching on currency change
  const staticDataCache = useRef<{
    pipelineRef: string
    currencies: string[]
    stages: PipelineStage[]
    winRateMetrics: WinRateMetrics
    activityVolume: ActivityVolumeMetrics
  } | null>(null)

  /**
   * Fetch pipeline stages from catalog
   */
  const fetchPipelineStages = useCallback(
    async (pipelineRef: string): Promise<PipelineStage[]> => {
      const query = `query GetPipelineStages($pipelineRef: String!) {
      CatalogEntry(where: {parentEntryId: {_eq: $pipelineRef}, isDeleted: {_eq: false}}) {
        id
        value
        code
        displayOrder
        additionalValue1
      }
    }`

      const result = await graphqlClient.request<any>(query, { pipelineRef })

      // Helper function to format stage names to proper case
      const toProperCase = (str: string): string => {
        return str
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      const stages =
        result.CatalogEntry?.map((entry: any) => ({
          id: entry.id,
          name: toProperCase(entry.value || ''),
          code: entry.code,
          order: entry.displayOrder || 0,
          color: entry.additionalValue1
        })) || []

      return stages
    },
    [graphqlClient]
  )

  /**
   * Fetch distinct currencies for the pipeline
   */
  const fetchDistinctCurrencies = useCallback(
    async (pipelineRef: string): Promise<string[]> => {
      // Build pipeline filter based on configuration
      const pipelineFilter = config.usePipelineRelationship
        ? `_or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]`
        : `${config.pipelineFieldName}: {_eq: $pipelineRef}`

      const query = `query GetDistinctCurrencies($pipelineRef: String!) {
      ${config.opportunityTable}(
        where: {${pipelineFilter}, isDeleted: {_eq: false}}
        distinctOn: currencyRef
      ) {
        currencyRef
      }
    }`

      const result = await graphqlClient.request<any>(query, { pipelineRef })

      const currenciesRaw: string[] = result[config.opportunityTable]
        ?.map((opp: any) => {
          const currencyRef = opp.currencyRef || 'Currency:v1:EUR'
          return currencyRef.split(':').pop() || 'EUR'
        })
        .filter(Boolean) || ['EUR']

      const currencies = [...new Set(currenciesRaw)].sort((a, b) => a.localeCompare(b))
      return currencies
    },
    [graphqlClient, config]
  )

  /**
   * Fetch stage aggregates for the funnel (currency-dependent)
   */
  const fetchStageAggregates = useCallback(
    async (
      pipelineRef: string,
      stages: PipelineStage[],
      currency: string
    ): Promise<{
      stages: Array<{
        stageId: string
        stageName: string
        stageCode: string
        stageOrder: number
        stageColor: string
        count: number
        sum: number
      }>
      totalCount: number
      totalSum: number
    }> => {
      if (stages.length === 0) {
        console.warn('⚠️ No stages found! Returning empty results.')
        return { stages: [], totalCount: 0, totalSum: 0 }
      }

      const currencyFilter = `Currency:v1:${currency}`

      // Build pipeline filter based on configuration
      const pipelineFilter = config.usePipelineRelationship
        ? `_or: [
          { opportunityPipeline: { id: { _eq: "${pipelineRef}" } } },
          { opportunityPipeline: { code: { _eq: "${pipelineRef}" } } }
        ]`
        : `${config.pipelineFieldName}: {_eq: "${pipelineRef}"}`

      // Build dynamic query with one aggregate selection per stage
      // Create a map to store aliases for each stage
      const stageAliasMap = new Map<string, string>()

      const aggregateSelections = stages
        .map((stage, index) => {
          // Create safe alias (must start with letter and be unique)
          // Use stage ID hash or index to ensure uniqueness
          const stageIdHash = stage.id.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
          const alias = `stage_${index}_${stageIdHash}`

          // Store the alias for this stage
          stageAliasMap.set(stage.id, alias)

          return `${alias}: ${config.opportunityAggregateTable}(where: {${pipelineFilter}, ${config.stageFieldName}: {_eq: "${stage.id}"}, currencyRef: {_eq: "${currencyFilter}"}, isDeleted: {_eq: false}}) { 
          aggregate { 
            count 
            sum { 
              estimatedAmount 
            } 
          } 
        }`
        })
        .join('\n    ')

      // Add total aggregate for all opportunities in pipeline (server-side calculation)
      const totalAggregate = `total: ${config.opportunityAggregateTable}(where: {${pipelineFilter}, currencyRef: {_eq: "${currencyFilter}"}, isDeleted: {_eq: false}}) { 
      aggregate { 
        count 
        sum { 
          estimatedAmount 
        } 
      } 
    }`

      const dynamicQuery = `query GetPipelineStageAggregates {
    ${totalAggregate}
    ${aggregateSelections}
  }`

      const result = await graphqlClient.request<any>(dynamicQuery)

      // Extract totals from server-side aggregate
      const totalCount = result.total?.aggregate?.count || 0
      const totalSum = result.total?.aggregate?.sum?.estimatedAmount || 0

      // Transform results to match expected format using the alias map
      const stageData = stages.map(stage => {
        const alias = stageAliasMap.get(stage.id)
        const aggregate = result[alias!]?.aggregate
        const count = aggregate?.count || 0
        const sum = aggregate?.sum?.estimatedAmount || 0

        return {
          stageId: stage.id,
          stageName: stage.name,
          stageCode: stage.code,
          stageOrder: stage.order,
          stageColor: stage.color || '#1890ff', // Default color if undefined
          count,
          sum
        }
      })

      // Return both stage data and totals from server
      return {
        stages: stageData,
        totalCount,
        totalSum
      }
    },
    [graphqlClient, config]
  )

  /**
   * Fetch win rate data (static, not currency-dependent)
   */
  const fetchWinRateData = useCallback(
    async (pipelineRef: string): Promise<WinRateMetrics> => {
      // Build pipeline filter based on configuration
      const pipelineFilter = config.usePipelineRelationship
        ? `_or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]`
        : `${config.pipelineFieldName}: {_eq: $pipelineRef}`

      // Use opportunityStatus.value for both CRM and IRM
      const wonFilter = `opportunityStatus: {value: {_ilike: "%Won%"}}`
      const lostFilter = `opportunityStatus: {value: {_ilike: "%Lost%"}}`

      // Calculate time ranges
      dayjs.extend(quarterOfYear)
      const now = dayjs()
      const monthStart = now.startOf('month').toISOString()
      const quarterStart = now.startOf('quarter').toISOString()

      const query = `query GetWinRateMetrics(
      $pipelineRef: String!
      $monthStart: timestamp!
      $quarterStart: timestamp!
    ) {
      allTimeWon: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ${wonFilter}
          isDeleted: {_eq: false}
        }
      ) {
        aggregate {
          count
        }
      }
      allTimeLost: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ${lostFilter}
          isDeleted: {_eq: false}
        }
      ) {
        aggregate {
          count
        }
      }
      monthWon: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ${wonFilter}
          closeDate: {_gte: $monthStart}
          isDeleted: {_eq: false}
        }
      ) {
        aggregate {
          count
        }
      }
      monthLost: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ${lostFilter}
          closeDate: {_gte: $monthStart}
          isDeleted: {_eq: false}
        }
      ) {
        aggregate {
          count
        }
      }
      quarterWon: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ${wonFilter}
          closeDate: {_gte: $quarterStart}
          isDeleted: {_eq: false}
        }
      ) {
        aggregate {
          count
        }
      }
      quarterLost: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ${lostFilter}
          closeDate: {_gte: $quarterStart}
          isDeleted: {_eq: false}
        }
      ) {
        aggregate {
          count
        }
      }
    }`

      const result = await graphqlClient.request<any>(query, {
        pipelineRef,
        monthStart,
        quarterStart
      })

      const allTimeWon = result.allTimeWon?.aggregate?.count || 0
      const allTimeLost = result.allTimeLost?.aggregate?.count || 0
      const monthWon = result.monthWon?.aggregate?.count || 0
      const monthLost = result.monthLost?.aggregate?.count || 0
      const quarterWon = result.quarterWon?.aggregate?.count || 0
      const quarterLost = result.quarterLost?.aggregate?.count || 0

      const allTimeTotal = allTimeWon + allTimeLost
      const monthTotal = monthWon + monthLost
      const quarterTotal = quarterWon + quarterLost

      const winRateMetrics = {
        allTime: {
          won: allTimeWon,
          lost: allTimeLost,
          winRate: allTimeTotal > 0 ? (allTimeWon / allTimeTotal) * 100 : 0
        },
        monthToDate: {
          won: monthWon,
          lost: monthLost,
          winRate: monthTotal > 0 ? (monthWon / monthTotal) * 100 : 0
        },
        quarterToDate: {
          won: quarterWon,
          lost: quarterLost,
          winRate: quarterTotal > 0 ? (quarterWon / quarterTotal) * 100 : 0
        }
      }

      return winRateMetrics
    },
    [graphqlClient, config]
  )

  /**
   * Fetch activity volume metrics (static, not currency-dependent)
   * Returns total activities and breakdown by activity type
   * Filters activities by the selected pipeline (activities on opportunities in this pipeline)
   */
  const fetchActivityVolume = useCallback(
    async (pipelineRef: string, endDate: string): Promise<ActivityVolumeMetrics> => {
      const last7DaysStart = dayjs(endDate).subtract(7, 'days').toISOString()
      const last30DaysStart = dayjs(endDate).subtract(30, 'days').toISOString()

      // Step 1: Fetch all activity types from catalog
      const activityTypesQuery = `query GetActivityTypes {
      activityTypes: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "${config.activityCatalogName}" } }
          isDeleted: { _eq: false }
        }
        orderBy: { value: ASC }
      ) {
        id
        code
        value
      }
    }`

      const activityTypesResult = await graphqlClient.request<{
        activityTypes: Array<{ id: string; code: string; value: string }>
      }>(activityTypesQuery)

      const activityTypes = activityTypesResult.activityTypes || []

      if (activityTypes.length === 0) {
        console.warn(
          `⚠️ No activity types found in catalog ${config.activityCatalogName}. Activity Volume will be empty.`
        )
        return {
          last7Days: { total: 0, types: [] },
          last30Days: { total: 0, types: [] }
        }
      }

      // Build pipeline filter - only activities on opportunities in this pipeline
      const pipelineFilter = config.usePipelineRelationship
        ? `opportunity: {
            _or: [
              { opportunityPipeline: { id: { _eq: "${pipelineRef}" } } },
              { opportunityPipeline: { code: { _eq: "${pipelineRef}" } } }
            ]
          }`
        : `opportunity: { ${config.pipelineFieldName}: { _eq: "${pipelineRef}" } }`

      const baseWhere = (start: string) =>
        `{createdAt: {_gte: "${start}", _lte: "${endDate}"}, isDeleted: {_eq: false}, ${pipelineFilter}}`

      // Step 2: Build dynamic query with total aggregates + per-type aggregates
      const totalAggregates = `
      total_7days: ${config.activityAggregateTable}(where: ${baseWhere(last7DaysStart)}) { aggregate { count } }
      total_30days: ${config.activityAggregateTable}(where: ${baseWhere(last30DaysStart)}) { aggregate { count } }`

      const typeAggregates = activityTypes
        .map(type => {
          const safeCode = type.code.toLowerCase().replace(/[^a-z0-9_]/g, '_')
          const typeRef = `${config.activityCatalogName}:v1:${type.code}`
          const where7d = `{createdAt: {_gte: "${last7DaysStart}", _lte: "${endDate}"}, isDeleted: {_eq: false}, activityTypeRef: {_eq: "${typeRef}"}, ${pipelineFilter}}`
          const where30d = `{createdAt: {_gte: "${last30DaysStart}", _lte: "${endDate}"}, isDeleted: {_eq: false}, activityTypeRef: {_eq: "${typeRef}"}, ${pipelineFilter}}`

          return `
      ${safeCode}_7days: ${config.activityAggregateTable}(where: ${where7d}) { aggregate { count } }
      ${safeCode}_30days: ${config.activityAggregateTable}(where: ${where30d}) { aggregate { count } }`
        })
        .join('\n')

      const dynamicQuery = `query GetActivityVolumeAggregates {${totalAggregates}${typeAggregates}
    }`

      // Step 3: Execute query
      const result = await graphqlClient.request<Record<string, { aggregate: { count: number } }>>(dynamicQuery)

      // Step 4: Parse results
      const total7d = result.total_7days?.aggregate?.count || 0
      const total30d = result.total_30days?.aggregate?.count || 0

      const types7d: Array<{ code: string; value: string; count: number }> = []
      const types30d: Array<{ code: string; value: string; count: number }> = []

      activityTypes.forEach(type => {
        const safeCode = type.code.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        const count7d = result[`${safeCode}_7days`]?.aggregate?.count || 0
        const count30d = result[`${safeCode}_30days`]?.aggregate?.count || 0

        types7d.push({
          code: type.code,
          value: type.value,
          count: count7d
        })

        types30d.push({
          code: type.code,
          value: type.value,
          count: count30d
        })
      })

      return {
        last7Days: {
          total: total7d,
          types: [...types7d].sort((a, b) => b.count - a.count)
        },
        last30Days: {
          total: total30d,
          types: [...types30d].sort((a, b) => b.count - a.count)
        }
      }
    },
    [graphqlClient, config]
  )

  /**
   * Fetch sales rep performance leaderboard (currency-dependent)
   * Uses server-side aggregates for optimal performance
   */
  const fetchLeaderboard = useCallback(
    async (pipelineRef: string, currency?: string): Promise<SalesRepPerformance[]> => {
      // Build pipeline filter based on configuration
      const pipelineFilter = config.usePipelineRelationship
        ? `_or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]`
        : `${config.pipelineFieldName}: {_eq: $pipelineRef}`

      const currencyFilter = currency ? `, currencyRef: {_eq: "Currency:v1:${currency}"}` : ''

      // Step 1: Get distinct owners from the pipeline
      const distinctOwnersQuery = `query GetDistinctOwners($pipelineRef: String!) {
      owners: ${config.opportunityTable}(
        where: {
          ${pipelineFilter}
          isDeleted: {_eq: false}
          ownerEmployeeId: {_isNull: false}
          ${currencyFilter}
        }
        distinctOn: ownerEmployeeId
      ) {
        ownerEmployeeId
        ownerEmployee {
          id
          firstName
          lastName
          displayName
        }
      }
    }`

      const ownersResult = await graphqlClient.request<any>(distinctOwnersQuery, { pipelineRef })
      const owners = ownersResult.owners || []

      if (owners.length === 0) {
        return []
      }

      // Step 2: Build aggregate query for all owners
      // Use opportunityStatus.value for both CRM and IRM
      const wonFilter = `opportunityStatus: {value: {_ilike: "%Won%"}}`
      const lostFilter = `opportunityStatus: {value: {_ilike: "%Lost%"}}`

      const aggregateQueries = owners
        .map((owner: any, index: number) => {
          const empId = owner.ownerEmployeeId
          const safeId = `emp_${index}`

          return `
      ${safeId}_total: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ownerEmployeeId: {_eq: "${empId}"}
          isDeleted: {_eq: false}
          ${currencyFilter}
        }
      ) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
      ${safeId}_won: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ownerEmployeeId: {_eq: "${empId}"}
          ${wonFilter}
          isDeleted: {_eq: false}
          ${currencyFilter}
        }
      ) {
        aggregate {
          count
        }
      }
      ${safeId}_lost: ${config.opportunityAggregateTable}(
        where: {
          ${pipelineFilter}
          ownerEmployeeId: {_eq: "${empId}"}
          ${lostFilter}
          isDeleted: {_eq: false}
          ${currencyFilter}
        }
      ) {
        aggregate {
          count
        }
      }`
        })
        .join('\n')

      const aggregatesQuery = `query GetLeaderboardAggregates($pipelineRef: String!) {
      ${aggregateQueries}
    }`

      const aggregatesResult = await graphqlClient.request<any>(aggregatesQuery, { pipelineRef })

      // Step 3: Build leaderboard from aggregates
      const leaderboard: SalesRepPerformance[] = owners.map((owner: any, index: number) => {
        const safeId = `emp_${index}`
        const totalData = aggregatesResult[`${safeId}_total`]
        const wonData = aggregatesResult[`${safeId}_won`]
        const lostData = aggregatesResult[`${safeId}_lost`]

        const totalOpportunities = totalData?.aggregate?.count || 0
        const totalValue = totalData?.aggregate?.sum?.estimatedAmount || 0
        const opportunitiesWon = wonData?.aggregate?.count || 0
        const opportunitiesLost = lostData?.aggregate?.count || 0

        const winRate =
          opportunitiesWon + opportunitiesLost > 0
            ? (opportunitiesWon / (opportunitiesWon + opportunitiesLost)) * 100
            : 0

        return {
          employeeId: owner.ownerEmployeeId,
          firstName: owner.ownerEmployee?.firstName || '',
          lastName: owner.ownerEmployee?.lastName || '',
          displayName:
            owner.ownerEmployee?.displayName ||
            `${owner.ownerEmployee?.firstName || ''} ${owner.ownerEmployee?.lastName || ''}`.trim(),
          totalOpportunities,
          totalValue,
          opportunitiesWon,
          opportunitiesLost,
          winRate,
          activitiesCount: 0 // Not currently tracked in leaderboard
        }
      })

      // Step 4: Sort by opportunities won (primary) and total value (secondary)
      const sortedLeaderboard = [...leaderboard].sort(
        (a, b) => b.opportunitiesWon - a.opportunitiesWon || b.totalValue - a.totalValue
      )

      return sortedLeaderboard
    },
    [graphqlClient, config]
  )

  /**
   * Main data loading function
   */
  const loadData = useCallback(async () => {
    if (!accessToken || !pipeline?.ref) {
      setError(pipeline ? 'Missing access token or pipeline reference' : 'No pipeline selected')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      dayjs.extend(quarterOfYear)

      const endDate = dayjs(dateRange.endDate).toISOString()

      // Step 1: Fetch static data (only if not cached or pipeline changed)
      const needsRefetch =
        !staticDataCache.current ||
        staticDataCache.current.pipelineRef !== pipeline.ref ||
        staticDataCache.current.currencies.length === 0

      if (needsRefetch) {
        const [stages, currencies, winRateMetrics, activityVolume] = await Promise.all([
          fetchPipelineStages(pipeline.ref),
          fetchDistinctCurrencies(pipeline.ref),
          fetchWinRateData(pipeline.ref),
          fetchActivityVolume(pipeline.ref, endDate)
        ])

        staticDataCache.current = {
          pipelineRef: pipeline.ref,
          currencies,
          stages,
          winRateMetrics,
          activityVolume
        }

        setAvailableCurrencies(currencies)
      }

      // Safety check (should never be null at this point)
      if (!staticDataCache.current) {
        throw new Error('Static data cache is unexpectedly null')
      }

      const { stages, winRateMetrics, activityVolume } = staticDataCache.current
      const currencyToUse = selectedCurrency || staticDataCache.current.currencies[0] || 'EUR'

      // Step 2: Fetch currency-dependent data
      const [stageAggregatesResult, leaderboard] = await Promise.all([
        fetchStageAggregates(pipeline.ref, stages, currencyToUse),
        fetchLeaderboard(pipeline.ref, currencyToUse)
      ])

      // Step 3: Transform data - use server-side totals from aggregate query
      const totalOpportunities = stageAggregatesResult.totalCount
      const totalValue = stageAggregatesResult.totalSum
      const avgOpportunitySize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0

      const opportunitiesWon = winRateMetrics.allTime.won
      const opportunitiesLost = winRateMetrics.allTime.lost
      const totalClosed = opportunitiesWon + opportunitiesLost
      const overallWinRate = totalClosed > 0 ? (opportunitiesWon / totalClosed) * 100 : 0

      const funnelData: OpportunityFunnelData[] = stageAggregatesResult.stages
        .map(agg => ({
          stage: {
            id: agg.stageId,
            name: agg.stageName,
            ref: agg.stageCode,
            order: agg.stageOrder,
            color: agg.stageColor
          },
          count: agg.count,
          value: agg.sum,
          percentage: totalOpportunities > 0 ? (agg.count / totalOpportunities) * 100 : 0
        }))
        .sort((a: OpportunityFunnelData, b: OpportunityFunnelData) => a.stage.order - b.stage.order)

      const pipelineData: PipelineData = {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          ref: pipeline.ref,
          description: pipeline.description,
          color: pipeline.color
        },
        metrics: {
          totalOpportunities,
          totalValue,
          avgOpportunitySize,
          opportunitiesWon,
          winRate: overallWinRate
        },
        funnelData,
        winRateMetrics,
        activityVolume,
        leaderboard
      }

      setPipelineData(pipelineData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pipeline data'
      console.error('❌ Error loading pipeline data:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    pipeline?.ref,
    pipeline?.id,
    pipeline?.name,
    pipeline?.description,
    pipeline?.color,
    dateRange.startDate,
    dateRange.endDate,
    selectedCurrency,
    config,
    fetchPipelineStages,
    fetchDistinctCurrencies,
    fetchWinRateData,
    fetchActivityVolume,
    fetchStageAggregates,
    fetchLeaderboard
  ])

  const refetch = useCallback(() => {
    staticDataCache.current = null // Clear cache on manual refetch
    loadData()
  }, [loadData])

  useEffect(() => {
    if (enabled) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [enabled, loadData])

  return {
    pipelineData,
    availableCurrencies,
    isLoading,
    error,
    refetch
  }
}
