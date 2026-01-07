import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

/**
 * Interface for tenure ranges used in the heatmap
 */
export interface TenureRange {
  id: string
  label: string
  minMonths: number
  maxMonths: number
}

/**
 * Interface for organizational unit information
 */
export interface OrganizationalUnit {
  id: string
  name: string
  code?: string | null
  description?: string | null
}

/**
 * Interface for tenure distribution data point
 */
export interface TenureDistributionItem {
  orgUnitId: string
  orgUnitName: string
  tenureRangeId: string
  count: number
}

/**
 * Predefined tenure ranges for categorization
 */
export const tenureRanges: TenureRange[] = [
  { id: 'less-than-6m', label: '< 6 months', minMonths: 0, maxMonths: 6 },
  { id: '6m-1y', label: '6-12 months', minMonths: 6, maxMonths: 12 },
  { id: '1y-2y', label: '1-2 years', minMonths: 12, maxMonths: 24 },
  { id: '2y-5y', label: '2-5 years', minMonths: 24, maxMonths: 60 },
  { id: 'more-than-5y', label: '5+ years', minMonths: 60, maxMonths: Number.MAX_SAFE_INTEGER }
]

/**
 * Hook to fetch and process employee tenure data by organizational unit
 *
 * @param context - Business app context containing access token and other context data
 * @param structureId - ID of the organizational structure to analyze (optional, will use current active if not provided)
 * @returns Object containing tenure distribution data, organizational units, tenure ranges, and loading/error states
 */
export const useTenureByOrgUnit = (context: BusinessAppContextProps, structureId?: string) => {
  const [tenureDistribution, setTenureDistribution] = useState<TenureDistributionItem[]>([])
  const [orgUnits, setOrgUnits] = useState<OrganizationalUnit[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)
  const { t } = useTranslation(hrTranslations)

  // Get QueryExecutor client
  const queryClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)

  /**
   * Fetch and process tenure distribution data using SQL query
   */
  const fetchTenureDistribution = useCallback(async () => {
    if (!context.accessToken) {
      if (isMounted.current) {
        setError(new Error('[useTenureByOrgUnit] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      console.log('[useTenureByOrgUnit] Fetching employee tenure data by organizational unit using SQL query')

      // Use provided structureId or get current active structure
      const targetStructureId = structureId || getCurrentActiveStructureId()

      if (!targetStructureId) {
        throw new Error('[useTenureByOrgUnit] No structure ID provided or found')
      }

      console.log('[useTenureByOrgUnit] Using structure ID:', targetStructureId)

      // Execute the SQL query
      const response = await queryClient.executeQuery('tenureDistributionByOrgUnit', QueryType.DATASET, {
        structureId: targetStructureId
      })

      if (!response || !response.data) {
        throw new Error('[useTenureByOrgUnit] Invalid response structure from SQL query')
      }

      const sqlData = response.data
      console.log('[useTenureByOrgUnit] SQL query returned', sqlData.length, 'data points')

      // Transform SQL response to expected interface
      const distributionData: TenureDistributionItem[] = sqlData.map(item => ({
        orgUnitId: item.category, // Using category as orgUnitId since we don't have separate ID
        orgUnitName: item.category,
        tenureRangeId: item.tenure_range_id as string,
        count: item.value
      }))

      // Extract unique organizational units
      const uniqueOrgUnits: Map<string, OrganizationalUnit> = new Map()
      sqlData.forEach(item => {
        if (!uniqueOrgUnits.has(item.category)) {
          uniqueOrgUnits.set(item.category, {
            id: item.category, // Using name as ID since we don't have separate ID
            name: item.category
          })
        }
      })

      // Calculate employee counts per org unit for filtering
      const orgUnitCounts: Record<string, number> = {}
      distributionData.forEach(item => {
        if (!orgUnitCounts[item.orgUnitId]) {
          orgUnitCounts[item.orgUnitId] = 0
        }
        orgUnitCounts[item.orgUnitId] += item.count
      })

      // Limit to top organizational units with the most employees to improve chart rendering
      const topOrgUnitIds = Object.entries(orgUnitCounts)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 50)
        .map(entry => entry[0])

      console.log('[useTenureByOrgUnit] Top org units by employee count:', topOrgUnitIds.slice(0, 5))

      // Filter distribution data to only include top org units
      const filteredDistributionData = distributionData.filter(item => topOrgUnitIds.includes(item.orgUnitId))

      const filteredOrgUnits = Array.from(uniqueOrgUnits.values()).filter(unit => topOrgUnitIds.includes(unit.id))

      // Ensure all tenure ranges are represented for each org unit (fill with 0 if missing)
      const completeDistributionData: TenureDistributionItem[] = []
      filteredOrgUnits.forEach(orgUnit => {
        tenureRanges.forEach(range => {
          const existingItem = filteredDistributionData.find(
            item => item.orgUnitId === orgUnit.id && item.tenureRangeId === range.id
          )

          completeDistributionData.push(
            existingItem || {
              orgUnitId: orgUnit.id,
              orgUnitName: orgUnit.name,
              tenureRangeId: range.id,
              count: 0
            }
          )
        })
      })

      console.log(
        `[useTenureByOrgUnit] Processed ${completeDistributionData.length} data points across ${filteredOrgUnits.length} organizational units`
      )

      // Update state
      if (isMounted.current) {
        setTenureDistribution(completeDistributionData)
        setOrgUnits(filteredOrgUnits)
        setLoading(false)
        setError(null)
      }
    } catch (err) {
      console.error('[useTenureByOrgUnit] Error fetching tenure distribution:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }
  }, [context.accessToken, queryClient, structureId])

  useEffect(() => {
    isMounted.current = true
    fetchTenureDistribution()

    return () => {
      isMounted.current = false
    }
  }, [fetchTenureDistribution])

  // Localize tenure range labels
  const localizedTenureRanges: TenureRange[] = tenureRanges.map(range => {
    const label =
      range.id === 'less-than-6m'
        ? t('hr-analytics-tenure-lt-6-months')
        : range.id === '6m-1y'
          ? t('hr-analytics-tenure-6-12-months')
          : range.id === '1y-2y'
            ? t('hr-analytics-tenure-1-2-years')
            : range.id === '2y-5y'
              ? t('hr-analytics-tenure-2-5-years')
              : t('hr-analytics-tenure-5-plus-years')
    return { ...range, label }
  })

  return {
    tenureDistribution,
    orgUnits,
    tenureRanges: localizedTenureRanges,
    loading,
    error,
    refetch: fetchTenureDistribution
  }
}
