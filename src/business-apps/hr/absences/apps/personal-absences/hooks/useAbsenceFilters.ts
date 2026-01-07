import { useState, useCallback, useEffect, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_ABSENCE_TYPES } from '../queries/graphql'
import dayjs from 'dayjs'

export interface UseAbsenceFiltersProps {
  accessToken: string
  employeeId: string
}

export interface UseAbsenceFiltersReturn {
  search: string
  selectedFilters: string[]
  startDate: string | undefined
  endDate: string | undefined
  creationStartDate: string | undefined
  creationEndDate: string | undefined
  absenceGroups: Record<string, string>
  originalAbsenceGroups: Record<string, string>
  absenceTypes: Array<{ id: string; name: string; translatedName: string }>
  setSearch: (search: string) => void
  setSelectedFilters: (filters: string[]) => void
  setStartDate: (date: string | undefined) => void
  setEndDate: (date: string | undefined) => void
  setCreationStartDate: (date: string | undefined) => void
  setCreationEndDate: (date: string | undefined) => void
  handleDateRangeChange: (startDate: string | null, endDate: string | null) => void
  handleCreationDateRangeChange: (startDate: string | null, endDate: string | null) => void
  buildWhereConditions: () => any
}

export const useAbsenceFilters = ({ accessToken, employeeId }: UseAbsenceFiltersProps): UseAbsenceFiltersReturn => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const graphQLClient = useGraphQLClient(accessToken)

  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  // Default filter: Show absences for the current year or later
  // From current year January 1st to next year December 31st
  const defaultStartOfYear = dayjs().startOf('year').format('YYYY-MM-DD')
  const defaultEndOfNextYear = dayjs().add(1, 'year').endOf('year').format('YYYY-MM-DD')
  const [startDate, setStartDate] = useState<string | undefined>(defaultStartOfYear)
  const [endDate, setEndDate] = useState<string | undefined>(defaultEndOfNextYear)
  const [creationStartDate, setCreationStartDate] = useState<string | undefined>(undefined)
  const [creationEndDate, setCreationEndDate] = useState<string | undefined>(undefined)

  const [absenceGroups, setAbsenceGroups] = useState<Record<string, string>>({})
  const [originalAbsenceGroups, setOriginalAbsenceGroups] = useState<Record<string, string>>({})
  const [rawAbsenceTypes, setRawAbsenceTypes] = useState<Array<any>>([])
  const [currentLocale, setCurrentLocale] = useState(getCurrentActiveUserLocale())

  const fetchAbsenceGroups = useCallback(async () => {
    if (!accessToken) return

    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
        { limit: 1000, offset: 0, returnTotalRecords: true }
      )

      const groups: Record<string, string> = {}
      const originalGroups: Record<string, string> = {}

      response.data.forEach((entry: any) => {
        groups[entry.id] = entry.value
        originalGroups[entry.id] = entry.value
      })

      setAbsenceGroups(groups)
      setOriginalAbsenceGroups(originalGroups)
    } catch (error) {
      console.error('Error fetching absence groups:', error)
    }
  }, [accessToken, catalogClient])

  const fetchAbsenceTypes = useCallback(async () => {
    if (!accessToken) return

    try {
      const result = await graphQLClient.request<any>(GET_ABSENCE_TYPES, {
        activeUserLocale: getCurrentActiveUserLocale()
      })
      setRawAbsenceTypes(result?.CatalogEntry || [])
    } catch (error) {
      console.error('Error fetching absence types:', error)
    }
  }, [accessToken, graphQLClient])

  useEffect(() => {
    const checkLocale = () => {
      const newLocale = getCurrentActiveUserLocale()
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale)
      }
    }

    checkLocale()
    const interval = setInterval(checkLocale, 1000)
    return () => clearInterval(interval)
  }, [currentLocale])

  const absenceTypes = useMemo(() => {
    if (!rawAbsenceTypes || rawAbsenceTypes.length === 0) return []

    return rawAbsenceTypes.map((entry: any) => {
      const translatedName =
        entry.translations && entry.translations.length > 0 && entry.translations[0]?.value
          ? entry.translations[0].value
          : entry.value

      return {
        id: entry.id,
        name: entry.value,
        translatedName
      }
    })
  }, [rawAbsenceTypes, currentLocale])

  useEffect(() => {
    fetchAbsenceGroups()
  }, [fetchAbsenceGroups])

  useEffect(() => {
    fetchAbsenceTypes()
  }, [fetchAbsenceTypes, currentLocale])

  const handleDateRangeChange = useCallback((newStartDate: string | null, newEndDate: string | null) => {
    setStartDate(newStartDate || undefined)
    setEndDate(newEndDate || undefined)
  }, [])

  const handleCreationDateRangeChange = useCallback((newStartDate: string | null, newEndDate: string | null) => {
    setCreationStartDate(newStartDate || undefined)
    setCreationEndDate(newEndDate || undefined)
  }, [])

  const buildWhereConditions = useCallback(() => {
    const conditions: any = {
      employee: { id: { _eq: employeeId } },
      isDeleted: { _eq: false }
    }

    if (search && search.trim()) {
      const searchPattern = { _ilike: `%${search.trim()}%` }
      conditions._or = [{ type: { value: searchPattern } }, { status: searchPattern }, { description: searchPattern }]
    }

    const statusFilters = selectedFilters
      .filter(f => f.startsWith('status-'))
      .map(f => f.replace('status-', ''))
      .map(s => String(s).toUpperCase())
    const typeFilters = selectedFilters.filter(f => f.startsWith('type-')).map(f => f.replace('type-', ''))

    if (statusFilters.length > 0) {
      conditions.status = { _in: statusFilters }
    }

    if (typeFilters.length > 0) {
      conditions.type = { ...conditions.type, id: { _in: typeFilters } }
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        const [sY, sM, sD] = String(startDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const [eY, eM, eD] = String(endDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.startDate = { _lte: endDateTime }
        conditions.endDate = { _gte: startDateTime }
      } else if (startDate) {
        const [sY, sM, sD] = String(startDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        conditions.endDate = { _gte: startDateTime }
      } else if (endDate) {
        const [eY, eM, eD] = String(endDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.startDate = { _lte: endDateTime }
      }
    }

    if (creationStartDate || creationEndDate) {
      if (creationStartDate && creationEndDate) {
        const [sY, sM, sD] = String(creationStartDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const [eY, eM, eD] = String(creationEndDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.createdAt = { _gte: startDateTime, _lte: endDateTime }
      } else if (creationStartDate) {
        const [sY, sM, sD] = String(creationStartDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const startDateTime = new Date(Date.UTC(sY, (sM || 1) - 1, sD || 1, 0, 0, 0, 0)).toISOString()
        conditions.createdAt = { _gte: startDateTime }
      } else if (creationEndDate) {
        const [eY, eM, eD] = String(creationEndDate)
          .split('-')
          .map(n => parseInt(n, 10))
        const endDateTime = new Date(Date.UTC(eY, (eM || 1) - 1, eD || 1, 23, 59, 59, 999)).toISOString()
        conditions.createdAt = { _lte: endDateTime }
      }
    }

    return conditions
  }, [employeeId, search, selectedFilters, startDate, endDate, creationStartDate, creationEndDate])

  return {
    search,
    selectedFilters,
    startDate,
    endDate,
    creationStartDate,
    creationEndDate,
    absenceGroups,
    originalAbsenceGroups,
    absenceTypes,
    setSearch,
    setSelectedFilters,
    setStartDate,
    setEndDate,
    setCreationStartDate,
    setCreationEndDate,
    handleDateRangeChange,
    handleCreationDateRangeChange,
    buildWhereConditions
  }
}
