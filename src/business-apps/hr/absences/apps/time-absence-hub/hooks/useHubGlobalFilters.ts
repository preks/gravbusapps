import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_TIME_SCOPE, TimeScope, URL_PARAMS, isTimeScope } from '../constants/routes'

export interface HubGlobalFilters {
  timeScope: TimeScope
  dateFrom?: string
  dateTo?: string
  departmentIds: string[]
  locationIds: string[]
  legalEntityIds: string[]
  managerIds: string[]
  employeeQuery: string
  absenceTypeIds: string[]
  statusIds: string[]
}

export interface UseHubGlobalFiltersReturn {
  filters: HubGlobalFilters
  setTimeScope: (scope: TimeScope) => void
  setDateRange: (from?: string, to?: string) => void
  setDepartmentIds: (ids: string[]) => void
  setLocationIds: (ids: string[]) => void
  setLegalEntityIds: (ids: string[]) => void
  setManagerIds: (ids: string[]) => void
  setEmployeeQuery: (query: string) => void
  setAbsenceTypeIds: (ids: string[]) => void
  setStatusIds: (ids: string[]) => void
  resetFilters: () => void
  legacyTimeFilter: 'current-year' | 'quarter' | 'month' | 'everything'
  derivedDateRange: { dateFrom: string; dateTo: string } | null
}

const DEFAULT_FILTERS: HubGlobalFilters = {
  timeScope: DEFAULT_TIME_SCOPE,
  dateFrom: undefined,
  dateTo: undefined,
  departmentIds: [],
  locationIds: [],
  legalEntityIds: [],
  managerIds: [],
  employeeQuery: '',
  absenceTypeIds: [],
  statusIds: []
}

const readSearchParams = (): URLSearchParams =>
  typeof globalThis.location === 'undefined' ? new URLSearchParams() : new URLSearchParams(globalThis.location.search)

const writeUrl = (mutator: (params: URLSearchParams) => void): void => {
  if (typeof globalThis.location === 'undefined' || typeof globalThis.history === 'undefined') {
    return
  }
  const url = new URL(globalThis.location.href)
  mutator(url.searchParams)
  globalThis.history.replaceState({}, '', url.toString())
}

const parseListParam = (raw: string | null): string[] => {
  if (!raw) {
    return []
  }
  return raw
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
}

const writeListParam = (params: URLSearchParams, key: string, ids: string[]): void => {
  if (ids.length === 0) {
    params.delete(key)
    return
  }
  params.set(key, ids.join(','))
}

const writeStringParam = (params: URLSearchParams, key: string, value?: string): void => {
  if (!value) {
    params.delete(key)
    return
  }
  params.set(key, value)
}

const readFiltersFromUrl = (): HubGlobalFilters => {
  const params = readSearchParams()
  const tsRaw = params.get(URL_PARAMS.timeScope)
  const dateFrom = params.get(URL_PARAMS.dateFrom) ?? undefined
  const dateTo = params.get(URL_PARAMS.dateTo) ?? undefined
  const timeScope = isTimeScope(tsRaw) ? tsRaw : DEFAULT_TIME_SCOPE
  const hasValidCustomRange = timeScope !== 'custom' || Boolean(dateFrom && dateTo)

  return {
    timeScope: hasValidCustomRange ? timeScope : DEFAULT_TIME_SCOPE,
    dateFrom: hasValidCustomRange ? dateFrom : undefined,
    dateTo: hasValidCustomRange ? dateTo : undefined,
    departmentIds: parseListParam(params.get(URL_PARAMS.departmentIds)),
    locationIds: parseListParam(params.get(URL_PARAMS.locationIds)),
    legalEntityIds: parseListParam(params.get(URL_PARAMS.legalEntityIds)),
    managerIds: parseListParam(params.get(URL_PARAMS.managerIds)),
    employeeQuery: params.get(URL_PARAMS.employeeQuery) ?? '',
    absenceTypeIds: parseListParam(params.get(URL_PARAMS.absenceTypeIds)),
    statusIds: parseListParam(params.get(URL_PARAMS.statusIds))
  }
}

const persistFiltersToUrl = (next: HubGlobalFilters): void => {
  writeUrl(params => {
    if (next.timeScope === DEFAULT_TIME_SCOPE) {
      params.delete(URL_PARAMS.timeScope)
    } else {
      params.set(URL_PARAMS.timeScope, next.timeScope)
    }
    writeStringParam(params, URL_PARAMS.dateFrom, next.dateFrom)
    writeStringParam(params, URL_PARAMS.dateTo, next.dateTo)
    writeListParam(params, URL_PARAMS.departmentIds, next.departmentIds)
    writeListParam(params, URL_PARAMS.locationIds, next.locationIds)
    writeListParam(params, URL_PARAMS.legalEntityIds, next.legalEntityIds)
    writeListParam(params, URL_PARAMS.managerIds, next.managerIds)
    writeStringParam(params, URL_PARAMS.employeeQuery, next.employeeQuery || undefined)
    writeListParam(params, URL_PARAMS.absenceTypeIds, next.absenceTypeIds)
    writeListParam(params, URL_PARAMS.statusIds, next.statusIds)
  })
}

const computeDerivedDateRange = (filters: HubGlobalFilters): { dateFrom: string; dateTo: string } | null => {
  if (filters.timeScope === 'custom') {
    if (filters.dateFrom && filters.dateTo) {
      return { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
    }
    return null
  }
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const formatIso = (date: Date): string => date.toISOString().slice(0, 10)
  if (filters.timeScope === 'everything') {
    return { dateFrom: '2000-01-01', dateTo: formatIso(today) }
  }
  if (filters.timeScope === 'current-year') {
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` }
  }
  if (filters.timeScope === 'month') {
    const monthStart = new Date(Date.UTC(year, month, 1))
    const monthEnd = new Date(Date.UTC(year, month + 1, 0))
    return { dateFrom: formatIso(monthStart), dateTo: formatIso(monthEnd) }
  }
  if (filters.timeScope === 'quarter') {
    const quarter = Math.floor(month / 3)
    const quarterStart = new Date(Date.UTC(year, quarter * 3, 1))
    const quarterEnd = new Date(Date.UTC(year, quarter * 3 + 3, 0))
    return { dateFrom: formatIso(quarterStart), dateTo: formatIso(quarterEnd) }
  }
  return null
}

const mapTimeScopeToLegacy = (scope: TimeScope): 'current-year' | 'quarter' | 'month' | 'everything' => {
  if (scope === 'current-year' || scope === 'quarter' || scope === 'month' || scope === 'everything') {
    return scope
  }
  return 'current-year'
}

export const useHubGlobalFilters = (): UseHubGlobalFiltersReturn => {
  const [filters, setFilters] = useState<HubGlobalFilters>(() => readFiltersFromUrl())

  useEffect(() => {
    const handlePopState = () => {
      setFilters(readFiltersFromUrl())
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const updateFilters = useCallback((mutator: (current: HubGlobalFilters) => HubGlobalFilters) => {
    setFilters(prev => {
      const next = mutator(prev)
      persistFiltersToUrl(next)
      return next
    })
  }, [])

  const setTimeScope = useCallback(
    (scope: TimeScope) => {
      updateFilters(current => ({
        ...current,
        timeScope: scope,
        dateFrom: scope === 'custom' ? current.dateFrom : undefined,
        dateTo: scope === 'custom' ? current.dateTo : undefined
      }))
    },
    [updateFilters]
  )

  const setDateRange = useCallback(
    (from?: string, to?: string) => {
      updateFilters(current => ({
        ...current,
        timeScope: 'custom',
        dateFrom: from,
        dateTo: to
      }))
    },
    [updateFilters]
  )

  const setDepartmentIds = useCallback(
    (ids: string[]) => updateFilters(current => ({ ...current, departmentIds: ids })),
    [updateFilters]
  )
  const setLocationIds = useCallback(
    (ids: string[]) => updateFilters(current => ({ ...current, locationIds: ids })),
    [updateFilters]
  )
  const setLegalEntityIds = useCallback(
    (ids: string[]) => updateFilters(current => ({ ...current, legalEntityIds: ids })),
    [updateFilters]
  )
  const setManagerIds = useCallback(
    (ids: string[]) => updateFilters(current => ({ ...current, managerIds: ids })),
    [updateFilters]
  )
  const setEmployeeQuery = useCallback(
    (query: string) => updateFilters(current => ({ ...current, employeeQuery: query })),
    [updateFilters]
  )
  const setAbsenceTypeIds = useCallback(
    (ids: string[]) => updateFilters(current => ({ ...current, absenceTypeIds: ids })),
    [updateFilters]
  )
  const setStatusIds = useCallback(
    (ids: string[]) => updateFilters(current => ({ ...current, statusIds: ids })),
    [updateFilters]
  )

  const resetFilters = useCallback(() => {
    updateFilters(() => ({ ...DEFAULT_FILTERS }))
  }, [updateFilters])

  const derivedDateRange = useMemo(() => computeDerivedDateRange(filters), [filters])
  const legacyTimeFilter = useMemo(() => mapTimeScopeToLegacy(filters.timeScope), [filters.timeScope])

  return {
    filters,
    setTimeScope,
    setDateRange,
    setDepartmentIds,
    setLocationIds,
    setLegalEntityIds,
    setManagerIds,
    setEmployeeQuery,
    setAbsenceTypeIds,
    setStatusIds,
    resetFilters,
    legacyTimeFilter,
    derivedDateRange
  }
}
