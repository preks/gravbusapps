import { useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { calculatePeriodBoundaries } from '../utils/periodCalculations'
import { useLoadingErrorDataState } from './useLoadingErrorDataState'
import { CategoryStatisticsGraphQLHookParams } from './statisticsHookParams'

export interface CategoryStatisticsData {
  requestType: string // Keep for backward compatibility
  id: string // Add for proper matching with catalog data
  currentPeriodAmount: number
  previousPeriodAmount: number
  differencePercentage: number
}

interface CategoryStatisticsVariables {
  currentStart: string
  currentEnd: string
  previousStart: string
  previousEnd: string
  currency: string
  selectedDepartment?: string
}

interface ExpensePosition {
  expenseGroupRef: string
  reimbursableAmount: number
}

interface GraphQLResponse {
  currentPeriod?: ExpensePosition[]
  previousPeriod?: ExpensePosition[]
}

/**
 * Hook to fetch expense category statistics based on selected period using GraphQL
 * @param accessToken - Authentication token
 * @param period - Selected period ('month', 'quarter', 'year')
 * @param requestTypes - Array of request types to filter ('TRIP', 'EXPENSES')
 * @returns Statistics data for the selected period grouped by request type
 */
export const useCategoryStatisticsGraphQL = ({
  accessToken,
  period,
  requestTypes,
  currencyRef,
  selectedDepartment,
  isActive = true // ⚡ PERFORMANCE: Only fetch when active
}: CategoryStatisticsGraphQLHookParams) => {
  const { loading, setLoading, error, setError, data, setData } = useLoadingErrorDataState<CategoryStatisticsData[]>([])

  const client = useGraphQLClient(accessToken)

  // Helper: Build OR conditions for request types (reduces cognitive complexity)
  const buildRequestTypeConditions = useCallback(
    (startDateVar: string, endDateVar: string, requestTypes: string[]): string => {
      const conditions: string[] = []

      if (requestTypes.includes('EXPENSES') || requestTypes.includes('ExpenseRequestType:v1:EXPENSES')) {
        conditions.push(`
        { _and: [
          { expenseDate: { _gte: ${startDateVar}, _lte: ${endDateVar} } },
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
        ] }`)
      }

      if (requestTypes.includes('TRIP') || requestTypes.includes('ExpenseRequestType:v1:TRIP')) {
        conditions.push(`
        { _and: [
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: ${startDateVar}, _lte: ${endDateVar} } } }
        ] }`)
      }

      return conditions.join(',')
    },
    []
  )

  // Helper: Aggregate expense data by group (reduces cognitive complexity)
  const aggregateByExpenseGroup = useCallback(
    (
      currentPeriod: Array<{ expenseGroupRef: string | null; reimbursableAmount: number }> | undefined,
      previousPeriod: Array<{ expenseGroupRef: string | null; reimbursableAmount: number }> | undefined
    ): { currentMap: Map<string, number>; previousMap: Map<string, number> } => {
      const currentMap = new Map<string, number>()
      const previousMap = new Map<string, number>()

      if (currentPeriod) {
        for (const item of currentPeriod) {
          const group = item.expenseGroupRef || 'ExpenseGroup:v1:OTHER'
          const amount = Number(item.reimbursableAmount) || 0
          currentMap.set(group, (currentMap.get(group) || 0) + amount)
        }
      }

      if (previousPeriod) {
        for (const item of previousPeriod) {
          const group = item.expenseGroupRef || 'ExpenseGroup:v1:OTHER'
          const amount = Number(item.reimbursableAmount) || 0
          previousMap.set(group, (previousMap.get(group) || 0) + amount)
        }
      }

      return { currentMap, previousMap }
    },
    []
  )

  // Helper: Process aggregated data into results (reduces cognitive complexity)
  const processAggregatedData = useCallback(
    (currentMap: Map<string, number>, previousMap: Map<string, number>): CategoryStatisticsData[] => {
      const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()])
      const results: CategoryStatisticsData[] = []

      for (const categoryId of allCategories) {
        const currentAmount = currentMap.get(categoryId) || 0
        const previousAmount = previousMap.get(categoryId) || 0
        let differencePercentage = 0

        if (previousAmount > 0) {
          differencePercentage = ((currentAmount - previousAmount) / previousAmount) * 100
        } else if (currentAmount > 0) {
          differencePercentage = 100
        }

        results.push({
          requestType: categoryId, // Keep for backward compatibility
          id: categoryId, // Add id field for proper matching
          currentPeriodAmount: currentAmount,
          previousPeriodAmount: previousAmount,
          differencePercentage
        })
      }

      return results
    },
    []
  )

  // ⚡ REFETCH: Expose fetchCategoryStatistics function for manual data reload
  const fetchCategoryStatistics = useCallback(async () => {
    if (!accessToken || !client || !requestTypes || requestTypes.length === 0) {
      setLoading(false)
      return
    }

    // ⚡ PERFORMANCE: Skip fetch if tab is inactive
    if (!isActive) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Calculate period boundaries using extracted utility
      const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = calculatePeriodBoundaries(period)

      const selectedCurrencyRef = currencyRef || 'Currency:v1:EUR'

      // Build query for current and previous periods
      // Match the exact pattern from getStatisticsByPeriod.ts
      const includeDepartment = Boolean(selectedDepartment)
      const departmentCondition = includeDepartment
        ? `{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },`
        : ''

      const query = `
        query GetCategoryStatistics(
          $currency: String!${includeDepartment ? ',\n          $selectedDepartment: uuid' : ''}
        ) {
          currentPeriod: ExpensePosition(
            where: {
              _and: [
                { isDeleted: { _eq: false } },
                { expenseItem: {
                  status: { _in: ["PAID", "CLOSED"] },
                  currencyRef: { _eq: $currency },
                  ${departmentCondition}
                  isDeleted: { _eq: false },
                  _or: [
                    ${buildRequestTypeConditions(`"${currentStartDate}"`, `"${currentEndDate}"`, requestTypes)}
                  ]
                }}
              ]
            }
          ) {
            expenseGroupRef
            reimbursableAmount
          }
          
          previousPeriod: ExpensePosition(
            where: {
              _and: [
                { isDeleted: { _eq: false } },
                { expenseItem: {
                  status: { _in: ["PAID", "CLOSED"] },
                  currencyRef: { _eq: $currency },
                  ${departmentCondition}
                  isDeleted: { _eq: false },
                  _or: [
                    ${buildRequestTypeConditions(`"${previousStartDate}"`, `"${previousEndDate}"`, requestTypes)}
                  ]
                }}
              ]
            }
          ) {
            expenseGroupRef
            reimbursableAmount
          }
        }
      `

      const variables: Partial<CategoryStatisticsVariables> = {
        currency: selectedCurrencyRef
      }

      if (includeDepartment && selectedDepartment) {
        variables.selectedDepartment = selectedDepartment
      }

      const response = await client.request<GraphQLResponse>(query, variables)

      // Aggregate by expense group and process results
      const { currentMap, previousMap } = aggregateByExpenseGroup(response.currentPeriod, response.previousPeriod)
      const results = processAggregatedData(currentMap, previousMap)

      setData(results)
    } catch (err) {
      console.error(`Error fetching category statistics for ${period} period:`, err)
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    client,
    period,
    requestTypes,
    currencyRef,
    selectedDepartment,
    isActive,
    buildRequestTypeConditions,
    aggregateByExpenseGroup,
    processAggregatedData
  ])

  useEffect(() => {
    fetchCategoryStatistics()
  }, [fetchCategoryStatistics])

  return {
    loading,
    error,
    data,
    refetch: fetchCategoryStatistics
  }
}
