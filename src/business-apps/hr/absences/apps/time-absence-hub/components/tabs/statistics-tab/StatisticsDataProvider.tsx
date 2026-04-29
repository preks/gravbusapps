import React, { createContext, useContext, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCombinedStatistics, CombinedStatisticsResult } from '../../../utils/getCombinedStatistics'
import dayjs from 'dayjs'

interface StatisticsDataContextType {
  data: CombinedStatisticsResult | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const StatisticsDataContext = createContext<StatisticsDataContextType | null>(null)

interface StatisticsDataProviderProps {
  children: React.ReactNode
  accessToken?: string
  typeNames: string[]
  vacationGroupIds: string[]
  sickGroupIds: string[]
}

export const StatisticsDataProvider: React.FC<StatisticsDataProviderProps> = ({
  children,
  accessToken,
  typeNames,
  vacationGroupIds,
  sickGroupIds
}) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const [data, setData] = useState<CombinedStatisticsResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentYear = dayjs().year()

  const fetchData = async () => {
    if (!accessToken || !graphQLClient || vacationGroupIds.length === 0 || sickGroupIds.length === 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await getCombinedStatistics(graphQLClient, {
        year: currentYear,
        typeNames: typeNames.length > 0 ? typeNames : [],
        vacationGroupIds,
        sickGroupIds
      })
      setData(result)
    } catch (err: any) {
      const errorMsg = err?.response?.errors?.[0]?.message || err?.message || 'Failed to load statistics'
      setError(errorMsg)
      console.error('StatisticsDataProvider: fetch error ->', errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [
    accessToken,
    currentYear,
    JSON.stringify(typeNames),
    JSON.stringify(vacationGroupIds),
    JSON.stringify(sickGroupIds)
  ])

  return (
    <StatisticsDataContext.Provider value={{ data, isLoading, error, refetch: fetchData }}>
      {children}
    </StatisticsDataContext.Provider>
  )
}

export const useStatisticsData = (): StatisticsDataContextType => {
  const context = useContext(StatisticsDataContext)
  if (!context) {
    throw new Error('useStatisticsData must be used within a StatisticsDataProvider')
  }
  return context
}
