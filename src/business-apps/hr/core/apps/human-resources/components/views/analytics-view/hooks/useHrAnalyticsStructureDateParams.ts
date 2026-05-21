import { useMemo } from 'react'
import dayjs from 'dayjs'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

/**
 * Shared params builder for HR analytics dataset/timeseries queries that support:
 * - startDate/endDate (YYYY-MM-DD)
 * - optional structureId (active structure)
 * - optional companyIds (from analytics filter context)
 */
export function useHrAnalyticsStructureDateParams(startDate?: string, endDate?: string): Record<string, string> {
  const { selectedCompanyIds } = useHrAnalyticsFilters()

  return useMemo(() => {
    const structureId = getCurrentActiveStructureId()
    const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''

    const next: Record<string, string> = {
      startDate: startDate || dayjs().startOf('year').format('YYYY-MM-DD'),
      endDate: endDate || dayjs().endOf('year').format('YYYY-MM-DD')
    }

    if (structureId) next.structureId = structureId
    if (companyIdsParam) next.companyIds = companyIdsParam

    return next
  }, [startDate, endDate, selectedCompanyIds])
}
