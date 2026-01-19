import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { QueryExecutionClient } from '@/common/network/dataset/QueryExecutionClient'
import { Services } from '@/common/types/enums/Services'

// Initialize dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
dayjs.extend(quarterOfYear)

export interface CategoryStatisticsData {
  requestType: string
  currentPeriodAmount: number
  previousPeriodAmount: number
  differencePercentage: number
  // For quarterly and yearly periods with month breakdown
  monthlyData?: Array<{
    month: string
    currentAmount: number
    previousAmount: number
  }>
  // Period label for display purposes
  periodLabel?: string
}

interface DatasetItem {
  category: string
  value: number
}

/**
 * Hook to fetch expense category statistics based on selected period
 * @param accessToken - Authentication token
 * @param period - Selected period ('month', 'quarter', 'year')
 * @param requestTypes - Array of request types to filter ('TRIP', 'EXPENSES')
 * @returns Statistics data for the selected period grouped by request type
 */
export const useCategoryStatistics = ({
  accessToken,
  period,
  requestTypes,
  currencyRef,
  selectedDepartment
}: BusinessAppContextProps & {
  period: 'month' | 'quarter' | 'year'
  requestTypes: string[]
  currencyRef?: string
  selectedDepartment?: string
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<CategoryStatisticsData[]>([])

  // Constant for item status values
  const ITEM_STATUS = ['PAID', 'CLOSE']

  // Helper: Calculate period boundaries (reduces cognitive complexity)
  const calculatePeriodBoundaries = (
    period: 'month' | 'quarter' | 'year'
  ): {
    currentStartDate: string
    currentEndDate: string
    previousStartDate: string
    previousEndDate: string
  } => {
    const now = dayjs()
    const currentYear = now.year()
    const currentMonth = now.month()

    switch (period) {
      case 'month':
        return {
          currentStartDate: now.startOf('month').format('YYYY-MM-DDT00:00:00.0000'),
          currentEndDate: now.endOf('month').format('YYYY-MM-DDT23:59:59.0000'),
          previousStartDate: now.subtract(1, 'month').startOf('month').format('YYYY-MM-DDT00:00:00.0000'),
          previousEndDate: now.subtract(1, 'month').endOf('month').format('YYYY-MM-DDT23:59:59.0000')
        }

      case 'quarter': {
        // Initialize with Q1 values (months 0-3), update for Q2 and Q3
        let startMonth = 0
        let endMonth = 3
        if (currentMonth >= 4 && currentMonth <= 7) {
          startMonth = 4
          endMonth = 7
        } else if (currentMonth >= 8 && currentMonth <= 11) {
          startMonth = 8
          endMonth = 11
        }

        const currentStartDate = dayjs()
          .year(currentYear)
          .month(startMonth)
          .startOf('month')
          .format('YYYY-MM-DDT00:00:00.0000')
        const currentEndDate = dayjs()
          .year(currentYear)
          .month(endMonth)
          .endOf('month')
          .format('YYYY-MM-DDT23:59:59.0000')

        if (startMonth === 0) {
          return {
            currentStartDate,
            currentEndDate,
            previousStartDate: dayjs()
              .year(currentYear - 1)
              .month(8)
              .startOf('month')
              .format('YYYY-MM-DDT00:00:00.0000'),
            previousEndDate: dayjs()
              .year(currentYear - 1)
              .month(11)
              .endOf('month')
              .format('YYYY-MM-DDT23:59:59.0000')
          }
        }

        return {
          currentStartDate,
          currentEndDate,
          previousStartDate: dayjs()
            .year(currentYear)
            .month(startMonth - 4)
            .startOf('month')
            .format('YYYY-MM-DDT00:00:00.0000'),
          previousEndDate: dayjs()
            .year(currentYear)
            .month(endMonth - 4)
            .endOf('month')
            .format('YYYY-MM-DDT23:59:59.0000')
        }
      }

      case 'year':
        return {
          currentStartDate: dayjs().year(currentYear).startOf('year').format('YYYY-MM-DDT00:00:00.0000'),
          currentEndDate: dayjs()
            .year(currentYear)
            .month(currentMonth)
            .endOf('month')
            .format('YYYY-MM-DDT23:59:59.0000'),
          previousStartDate: dayjs()
            .year(currentYear - 1)
            .startOf('year')
            .format('YYYY-MM-DDT00:00:00.0000'),
          previousEndDate: dayjs()
            .year(currentYear - 1)
            .endOf('year')
            .format('YYYY-MM-DDT23:59:59.0000')
        }
    }
  }

  // Helper: Process category data into results (reduces cognitive complexity)
  const processCategoryData = (
    currentCategories: DatasetItem[],
    previousCategories: DatasetItem[]
  ): CategoryStatisticsData[] => {
    const currentCategoryMap = new Map(currentCategories.map((item: DatasetItem) => [item.category, item.value]))
    const previousCategoryMap = new Map(previousCategories.map((item: DatasetItem) => [item.category, item.value]))

    const allCategories = new Set([
      ...currentCategories.map((item: DatasetItem) => item.category),
      ...previousCategories.map((item: DatasetItem) => item.category)
    ])

    const results: CategoryStatisticsData[] = []
    for (const categoryId of allCategories) {
      const currentAmount = Number(currentCategoryMap.get(categoryId)) || 0
      const previousAmount = Number(previousCategoryMap.get(categoryId)) || 0
      let differencePercentage = 0
      if (previousAmount > 0) {
        differencePercentage = ((currentAmount - previousAmount) / previousAmount) * 100
      }
      results.push({
        requestType: categoryId,
        currentPeriodAmount: currentAmount,
        previousPeriodAmount: previousAmount,
        differencePercentage
      })
    }

    return results
  }

  useEffect(() => {
    const fetchCategoryStatistics = async () => {
      if (!accessToken || !requestTypes || requestTypes.length === 0) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Calculate period boundaries
        const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } =
          calculatePeriodBoundaries(period)

        const selectedCurrencyRef = currencyRef || 'Currency:v1:RON'
        const departmentParam = selectedDepartment || ''

        // Format request types as ExpenseRequestType references
        const formattedRequestTypes = requestTypes.map(type => `ExpenseRequestType:v1:${type}`)

        // Use QueryExecutionClient for dataset queries
        const client = new QueryExecutionClient(Services.EMPLOYEE)
        client.setAccessToken(accessToken)

        const queryName = 'monthlyCostBreakdownByExpenseGroup'
        const commonParams = {
          itemStatus: JSON.stringify(ITEM_STATUS),
          localeCode: getCurrentActiveUserLocale(),
          aggregate: 'sum',
          currencyRef: selectedCurrencyRef,
          departmentId: departmentParam,
          requestType: JSON.stringify(formattedRequestTypes)
        } as Record<string, string>

        const currentDataset = await client.executeDatasetQuery(queryName, {
          ...commonParams,
          startDate: currentStartDate,
          endDate: currentEndDate
        })

        const previousDataset = await client.executeDatasetQuery(queryName, {
          ...commonParams,
          startDate: previousStartDate,
          endDate: previousEndDate
        })

        const currentCategories = currentDataset.data || []
        const previousCategories = previousDataset.data || []

        // Process category data
        const results = processCategoryData(currentCategories, previousCategories)
        setData(results)
      } catch (err) {
        console.error(`Error fetching category statistics for ${period} period:`, err)
        setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryStatistics()
  }, [accessToken, period, requestTypes, currencyRef, selectedDepartment])

  return {
    loading,
    error,
    data
  }
}

export default useCategoryStatistics
