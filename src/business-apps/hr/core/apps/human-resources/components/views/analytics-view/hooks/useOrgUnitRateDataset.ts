import { useEffect, useMemo, useRef, useState } from 'react'
import { QueryType, Services, useQueryExecutionClient } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

type DatasetRow = { category?: string; value?: number }

const orgUnitRateStaticCache = new Map<string, Promise<DatasetRow[]>>()

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

interface UseOrgUnitRateDatasetArgs<T> {
  accessToken: string
  queryName: string
  logPrefix: string
  mapRow: (row: DatasetRow, utils: { roundToOneDecimal: (value: number) => number }) => T
  sort?: (a: T, b: T) => number
}

export function useOrgUnitRateDataset<T>({
  accessToken,
  queryName,
  logPrefix,
  mapRow,
  sort
}: UseOrgUnitRateDatasetArgs<T>) {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const lastFetchKeyRef = useRef<string>('')
  const requestIdRef = useRef(0)
  const mapRowRef = useRef(mapRow)
  const sortRef = useRef(sort)

  const companyIdsParam = useMemo(
    () => (selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''),
    [selectedCompanyIds]
  )

  useEffect(() => {
    mapRowRef.current = mapRow
  }, [mapRow])

  useEffect(() => {
    sortRef.current = sort
  }, [sort])

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    let isActive = true

    if (!datasetClient) {
      setError(prev =>
        prev?.message === 'Dataset client is not available' ? prev : new Error('Dataset client is not available')
      )
      setLoading(false)
      return
    }

    const structureId = getCurrentActiveStructureId()
    if (!structureId) {
      console.warn(`${logPrefix} No active structure ID found`)
      setError(prev =>
        prev?.message === 'No active structure ID found' ? prev : new Error('No active structure ID found')
      )
      setLoading(false)
      return
    }

    const fetchKey = `${queryName}|${accessToken}|${structureId}|${companyIdsParam}`
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey

    setLoading(true)
    setError(null)
    console.info(`${logPrefix} Fetching data for structure:`, structureId)

    let pending = orgUnitRateStaticCache.get(fetchKey)
    if (!pending) {
      pending = datasetClient
        .executeQuery(queryName, QueryType.DATASET, {
          structureId,
          ...(companyIdsParam ? { companyIds: companyIdsParam } : {})
        })
        .then(resp => resp?.data ?? [])
      orgUnitRateStaticCache.set(fetchKey, pending)
    }

    pending
      .then(rows => {
        const mapped = (rows ?? []).map(r =>
          mapRowRef.current({ category: r.category, value: r.value }, { roundToOneDecimal })
        )
        const sorted = sortRef.current ? [...mapped].sort(sortRef.current) : mapped
        if (!isActive || requestId !== requestIdRef.current) return
        setData(sorted)
        setLoading(false)
      })
      .catch((err: unknown) => {
        console.error(`${logPrefix} Error fetching data:`, err)
        if (!isActive || requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err : new Error('Failed to fetch data'))
        setLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [accessToken, companyIdsParam, datasetClient, logPrefix, queryName])

  return { data, loading, error }
}
