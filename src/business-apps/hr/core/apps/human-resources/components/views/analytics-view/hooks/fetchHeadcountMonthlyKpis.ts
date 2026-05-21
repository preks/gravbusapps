import { QueryType } from '@/common/network/dataset'

const inFlightHeadcountMonthlyKpis = new Map<string, Promise<any>>()

export const fetchHeadcountMonthlyKpis = (
  datasetClient: { executeQuery: (name: string, type: QueryType, params: Record<string, string>) => Promise<any> },
  cacheKey: string,
  params: Record<string, string>
) => {
  let requestPromise = inFlightHeadcountMonthlyKpis.get(cacheKey)
  if (!requestPromise) {
    requestPromise = datasetClient
      .executeQuery('headcountMonthlyKpis', QueryType.TIMESERIES, params)
      .finally(() => inFlightHeadcountMonthlyKpis.delete(cacheKey))
    inFlightHeadcountMonthlyKpis.set(cacheKey, requestPromise)
  }
  return requestPromise
}
