import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseCalculationRulesQueries } from '../queries/ExpenseCalculationRules.queries'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface CalculationTypeOption {
  id: string
  code: string
  value: string
  translations?: { localeCode: string; value: string }[]
}

export interface ExpenseRuleListItem {
  id: string
  code?: string
  name?: string
  calculationType?: any
  standard?: boolean
  activeFrom?: string | null
  activeTo?: string | null
  currency?: any
}

export interface CatalogOption {
  id: string
  code: string
  name: string
}

export interface FormCatalogs {
  calculationTypes: CatalogOption[]
  currencies: CatalogOption[]
  countries: CatalogOption[]
}

export interface UseExpenseCalculationRulesResult {
  items: ExpenseRuleListItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  calculationTypes: CalculationTypeOption[]
  formCatalogs: FormCatalogs
  reload: () => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  setSearch: (value: string) => void
  setSort: (field: string, order: 'ASC' | 'DESC' | '') => void
  setValidityRange: (from: string | null, to: string | null) => void
  setStandard: (value: boolean | null) => void
  setSelectedCalculationCodes: (codes: string[]) => void
  setSelectedCurrencyCodes: (codes: string[]) => void
  currentPage: number
  pageSize: number
  search: string
  sortField: string | null
  sortOrder: 'ASC' | 'DESC' | ''
  validityFrom: string | null
  validityTo: string | null
  standard: boolean | null
  selectedCalculationCodes: string[]
  selectedCurrencyCodes: string[]
}

export const useExpenseCalculationRules = (context: BusinessAppContextProps): UseExpenseCalculationRulesResult => {
  const { fetchCalculationTypes, fetchExpenseRules, fetchFormCatalogs } = useExpenseCalculationRulesQueries(context)

  const [items, setItems] = useState<ExpenseRuleListItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [search, setSearch] = useState<string>('')
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('')
  const [validityFrom, setValidityFrom] = useState<string | null>(null)
  const [validityTo, setValidityTo] = useState<string | null>(null)
  const [standard, setStandard] = useState<boolean | null>(null) // Changed from false to null to avoid triggering filter on initial load
  const [selectedCalculationCodes, setSelectedCalculationCodes] = useState<string[]>([])
  const [selectedCurrencyCodes, setSelectedCurrencyCodes] = useState<string[]>([])

  const [calculationTypes, setCalculationTypes] = useState<CalculationTypeOption[]>([])
  const [formCatalogs, setFormCatalogs] = useState<FormCatalogs>({
    calculationTypes: [],
    currencies: [],
    countries: []
  })
  const [refreshTick, setRefreshTick] = useState<number>(0)
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')

  // Track the last loaded filterKey to prevent duplicate calls with same params
  const initialLoadDoneRef = useRef<string | null>(null)

  const orderBy = useMemo(() => {
    if (!sortField || !sortOrder) return undefined
    const dir = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
    if (sortField === 'calculation') {
      return [{ calculationType: { code: dir } } as any]
    }
    if (sortField === 'currency') {
      return [{ currency: { code: dir } } as any]
    }
    return [{ [sortField]: dir } as any]
  }, [sortField, sortOrder])

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const buildWhere = useCallback(() => {
    const where: any = { code: { _isNull: false }, isDeleted: { _eq: false } }

    if (debouncedSearch && debouncedSearch.trim()) {
      const pattern = `%${debouncedSearch.trim()}%`
      where._or = [
        { code: { _ilike: pattern } },
        { name: { _ilike: pattern } },
        { currency: { value: { _ilike: pattern } } },
        { calculationType: { value: { _ilike: pattern } } }
      ]
    }
    if (typeof standard === 'boolean') {
      where.standard = { _eq: standard }
    }
    if (validityFrom) {
      where.activeFrom = { _gte: validityFrom }
    }
    if (validityTo) {
      where.activeTo = { _lte: validityTo }
    }
    if (selectedCalculationCodes?.length) {
      where.calculationType = { code: { _in: selectedCalculationCodes } } as any
    }
    if (selectedCurrencyCodes?.length) {
      where.currency = { code: { _in: selectedCurrencyCodes } } as any
    }
    return where
  }, [debouncedSearch, standard, validityFrom, validityTo, selectedCalculationCodes, selectedCurrencyCodes])

  // Load calculation types ONCE
  const typesLoadedRef = useRef(false)
  useEffect(() => {
    if (!context.accessToken || typesLoadedRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const types = await fetchCalculationTypes()
        if (!cancelled) setCalculationTypes(types as any)
      } catch {
      } finally {
        if (!cancelled) typesLoadedRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [context.accessToken])

  // Pre-load form catalogs ONCE (for instant form population)
  const catalogsLoadedRef = useRef(false)
  useEffect(() => {
    if (!context.accessToken || catalogsLoadedRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const catalogs = await fetchFormCatalogs()
        if (!cancelled) setFormCatalogs(catalogs)
      } catch {
        // Silently fail - form will fetch its own catalogs if needed
      } finally {
        if (!cancelled) catalogsLoadedRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [context.accessToken])

  // Create a stable key from all filter/pagination state to track changes
  const filterKey = useMemo(() => {
    return JSON.stringify({
      currentPage,
      pageSize,
      debouncedSearch,
      standard,
      validityFrom,
      validityTo,
      selectedCalculationCodes,
      selectedCurrencyCodes,
      sortField,
      sortOrder,
      refreshTick
    })
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    standard,
    validityFrom,
    validityTo,
    selectedCalculationCodes,
    selectedCurrencyCodes,
    sortField,
    sortOrder,
    refreshTick
  ])

  // Single effect for loading rules - runs on initial load and when filters change
  // Use refs to access latest values without adding them as dependencies
  const buildWhereRef = useRef(buildWhere)
  const fetchExpenseRulesRef = useRef(fetchExpenseRules)
  const orderByRef = useRef(orderBy)
  const pageSizeRef = useRef(pageSize)
  const currentPageRef = useRef(currentPage)

  // Keep refs updated
  useEffect(() => {
    buildWhereRef.current = buildWhere
    fetchExpenseRulesRef.current = fetchExpenseRules
    orderByRef.current = orderBy
    pageSizeRef.current = pageSize
    currentPageRef.current = currentPage
  })

  useEffect(() => {
    if (!context.accessToken) return

    // Prevent duplicate calls with same params
    if (initialLoadDoneRef.current === filterKey) {
      return
    }

    let cancelled = false

    const loadRules = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const where = buildWhereRef.current()
        const offset = (currentPageRef.current - 1) * pageSizeRef.current
        const { ExpenseRule, ExpenseRuleAggregate } = await fetchExpenseRulesRef.current({
          orderBy: orderByRef.current,
          limit: pageSizeRef.current,
          offset,
          where,
          activeUserLocale: getCurrentActiveUserLocale()
        })
        if (!cancelled) {
          setItems(ExpenseRule as any)
          const aggCount =
            (ExpenseRuleAggregate &&
              (ExpenseRuleAggregate as any).aggregate &&
              (ExpenseRuleAggregate as any).aggregate.count) ??
            0
          setTotalCount(aggCount)
          // Store the filterKey to prevent duplicate calls with same params
          initialLoadDoneRef.current = filterKey
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load rules')
          setItems([])
          setTotalCount(0)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadRules()

    return () => {
      cancelled = true
    }
  }, [context.accessToken, filterKey])

  // no standalone setSort helper; use inline setter in return to avoid extra re-creations

  return {
    items,
    totalCount,
    isLoading,
    error,
    calculationTypes,
    formCatalogs,
    reload: () => {
      setRefreshTick(t => t + 1)
    },
    setPage: setCurrentPage,
    setPageSize,
    setSearch: (v: string) => {
      if (v !== search) {
        setCurrentPage(1)
        setSearch(v)
      }
    },
    setSort: (field, order) => {
      const nextField = field || null
      const nextOrder = order
      const changed = nextField !== sortField || nextOrder !== sortOrder
      if (changed) setCurrentPage(1)
      setSortField(nextField)
      setSortOrder(nextOrder)
    },
    setValidityRange: (from, to) => {
      const changed = from !== validityFrom || to !== validityTo
      if (changed) setCurrentPage(1)
      setValidityFrom(from)
      setValidityTo(to)
    },
    setStandard: v => {
      const changed = v !== standard
      if (changed) setCurrentPage(1)
      setStandard(v)
    },
    setSelectedCalculationCodes: codes => {
      const sameLen = codes?.length === selectedCalculationCodes?.length
      const sameVals = sameLen && codes.every((c, i) => c === selectedCalculationCodes[i])
      const changed = !sameVals
      if (changed) setCurrentPage(1)
      setSelectedCalculationCodes(codes)
    },
    setSelectedCurrencyCodes: (codes: string[]) => {
      const sameLen = codes?.length === selectedCurrencyCodes?.length
      const sameVals = sameLen && codes.every((c, i) => c === selectedCurrencyCodes[i])
      const changed = !sameVals
      if (changed) setCurrentPage(1)
      setSelectedCurrencyCodes(codes)
    },
    currentPage,
    pageSize,
    search,
    sortField,
    sortOrder,
    validityFrom,
    validityTo,
    standard,
    selectedCalculationCodes,
    selectedCurrencyCodes
  }
}
