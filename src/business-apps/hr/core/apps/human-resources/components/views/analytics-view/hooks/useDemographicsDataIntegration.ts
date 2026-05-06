import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useQueryExecutionClient,
  QueryType,
  Services,
  type DatasetDTO,
  type QueryExecutionParams
} from '@/common/network/dataset'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

export interface DemographicsData {
  genderDistribution: Array<{
    category: string
    value: number
  }>
  ageDistribution: Array<{
    category: string
    value: number
  }>
  nationalityDistribution: Array<{
    category: string
    value: number
  }>
}

export interface DemographicsStatistics {
  totalEmployees: number
  averageAge: number | null
  mostCommonGender: string | null
  mostCommonNationality: string | null
  genderDiversity: number // retained for compatibility; not used in UI
  genderRatio: string | null // formatted as "femaleCount:maleCount"
  nationalityDiversity: number // number of different nationalities
}

export interface UseDemographicsDataIntegrationResponse {
  demographicsData: DemographicsData
  statistics: DemographicsStatistics
  isLoading: boolean
  error: string | null
  refetch: () => void
}

type DemographicsQueryClient = {
  executeQuery: (name: string, queryType: QueryType, params?: QueryExecutionParams) => Promise<DatasetDTO>
}

interface DemographicsFetchPayload {
  transformedData: DemographicsData
  totalEmployeesCount: number
  averageAgeValue: number | null
  femaleOverride: number | undefined
  maleOverride: number | undefined
}

async function fetchDemographicsPayload(
  queryClient: DemographicsQueryClient,
  selectedCompanyIds: string[],
  translate: (key: string) => string
): Promise<DemographicsFetchPayload> {
  const structureId = getCurrentActiveStructureId()
  const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
  const demographicFilterParams: QueryExecutionParams = {}
  if (structureId) {
    demographicFilterParams.structureId = structureId
  }
  if (companyIdsParam) {
    demographicFilterParams.companyIds = companyIdsParam
  }

  const activeLocale = getCurrentActiveUserLocale() || 'en-US'
  const [totalEmployeeData, averageAgeData, genderData, genderRatioData, ageData, nationalityData] = await Promise.all([
    queryClient.executeQuery('totalEmployeeCount', QueryType.DATASET, {
      ...demographicFilterParams
    }),
    queryClient.executeQuery('employeesAverageAge', QueryType.DATASET, {
      ...demographicFilterParams
    }),
    queryClient.executeQuery('genderDistribution', QueryType.DATASET, {
      ...demographicFilterParams,
      localeCode: activeLocale
    }),
    queryClient.executeQuery('genderMaleFemaleRatio', QueryType.DATASET, {
      ...demographicFilterParams
    }),
    queryClient.executeQuery('ageDistribution', QueryType.DATASET, {
      ...demographicFilterParams
    }),
    queryClient.executeQuery('nationalityDistribution', QueryType.DATASET, {
      ...demographicFilterParams,
      localeCode: activeLocale
    })
  ])

  const transformedData: DemographicsData = {
    genderDistribution: genderData.data.map(item => {
      const raw = String(item.category || '')
      const name =
        raw.trim().toLowerCase() === 'not specified'.toLowerCase() ? translate('hr-analytics-not-specified') : raw
      return { category: name, value: item.value }
    }),
    ageDistribution: ageData.data.map(item => ({
      category: item.category,
      value: item.value
    })),
    nationalityDistribution: nationalityData.data.map(item => {
      const raw = String(item.category || '')
      const name = raw.trim().toLowerCase() === 'unknown'.toLowerCase() ? translate('hr-analytics-not-specified') : raw
      return { category: name, value: item.value }
    })
  }

  const totalEmployeesCount = totalEmployeeData.data.length > 0 ? totalEmployeeData.data[0].value : 0
  const averageAgeValue =
    averageAgeData.data && averageAgeData.data.length > 0 ? Number(averageAgeData.data[0].value) || null : null

  let femaleOverride: number | undefined
  let maleOverride: number | undefined
  if (Array.isArray(genderRatioData?.data)) {
    for (const row of genderRatioData.data as Array<{ category: string; value: number }>) {
      const key = String(row.category ?? '')
        .trim()
        .toLowerCase()
      if (key === 'female') femaleOverride = Number(row.value) || 0
      if (key === 'male') maleOverride = Number(row.value) || 0
    }
  }

  return {
    transformedData,
    totalEmployeesCount,
    averageAgeValue,
    femaleOverride,
    maleOverride
  }
}

export const useDemographicsDataIntegration = (
  context: BusinessAppContextProps
): UseDemographicsDataIntegrationResponse => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [demographicsData, setDemographicsData] = useState<DemographicsData>({
    genderDistribution: [],
    ageDistribution: [],
    nationalityDistribution: []
  })

  const [statistics, setStatistics] = useState<DemographicsStatistics>({
    totalEmployees: 0,
    averageAge: null,
    mostCommonGender: null,
    mostCommonNationality: null,
    genderDiversity: 0,
    genderRatio: null,
    nationalityDiversity: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryClient = useQueryExecutionClient(context.accessToken, Services.EMPLOYEE)
  const { t } = useTranslation(hrTranslations)

  const calculateStatistics = useCallback(
    (
      data: DemographicsData,
      totalEmployeesFromQuery: number,
      averageAgeFromQuery: number | null,
      femaleCountOverride?: number,
      maleCountOverride?: number
    ): DemographicsStatistics => {
      // Use the authoritative total employees count from the dedicated query
      const totalEmployees = totalEmployeesFromQuery

      // Find most common values
      const mostCommonGender =
        data.genderDistribution.length > 0
          ? data.genderDistribution.reduce((prev, current) => (prev.value > current.value ? prev : current)).category
          : null

      const mostCommonNationality =
        data.nationalityDistribution.length > 0
          ? data.nationalityDistribution.reduce((prev, current) => (prev.value > current.value ? prev : current))
              .category
          : null

      // Female:Male ratio; prefer overrides from dedicated dataset if provided
      const femaleCount =
        typeof femaleCountOverride === 'number'
          ? femaleCountOverride
          : data.genderDistribution.reduce((sum, item) => {
              return sum + (/female/i.test(item.category) ? Number(item.value) || 0 : 0)
            }, 0)
      const maleCount =
        typeof maleCountOverride === 'number'
          ? maleCountOverride
          : data.genderDistribution.reduce((sum, item) => {
              return sum + (/male/i.test(item.category) ? Number(item.value) || 0 : 0)
            }, 0)
      const genderRatio = femaleCount === 0 && maleCount === 0 ? null : `${femaleCount}:${maleCount}`
      // Minority share (simpler than Simpson's): percentage of the smaller group among female/male
      const binaryTotal = femaleCount + maleCount
      const genderDiversity =
        binaryTotal > 0 ? Math.round((Math.min(femaleCount, maleCount) / binaryTotal) * 1000) / 10 : 0

      const nationalityDiversity = data.nationalityDistribution.length

      // Average age from dataset query (authoritative)
      const averageAge = averageAgeFromQuery

      return {
        totalEmployees,
        averageAge,
        mostCommonGender,
        mostCommonNationality,
        genderDiversity,
        genderRatio,
        nationalityDiversity
      }
    },
    []
  )

  const loadDemographicsData = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const payload = await fetchDemographicsPayload(queryClient, selectedCompanyIds, t)
      setDemographicsData(payload.transformedData)
      setStatistics(
        calculateStatistics(
          payload.transformedData,
          payload.totalEmployeesCount,
          payload.averageAgeValue,
          payload.femaleOverride,
          payload.maleOverride
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demographics data')
    } finally {
      setIsLoading(false)
    }
  }, [queryClient, context.accessToken, calculateStatistics, selectedCompanyIds, t])

  useEffect(() => {
    if (context.accessToken) {
      loadDemographicsData()
    }
  }, [context.accessToken, loadDemographicsData])

  return {
    demographicsData,
    statistics,
    isLoading,
    error,
    refetch: loadDemographicsData
  }
}
