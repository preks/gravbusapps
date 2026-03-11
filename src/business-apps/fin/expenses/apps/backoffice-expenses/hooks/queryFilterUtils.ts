export const buildSearchCondition = (
  searchTerm: string,
  buildOrConditions: (searchValue: string) => Record<string, unknown>[]
): any[] => {
  if (!searchTerm || searchTerm.trim() === '') return []
  const searchValue = `%${searchTerm.trim()}%`
  return [{ _or: buildOrConditions(searchValue) }]
}

export const buildNumericRangeCondition = (
  min: string | undefined,
  max: string | undefined,
  fieldBuilder: (rangeCondition: Record<string, number>) => Record<string, unknown>
): any[] => {
  if (!min && !max) return []

  const rangeCondition: Record<string, number> = {}
  if (min) rangeCondition._gte = Number.parseFloat(min)
  if (max) rangeCondition._lte = Number.parseFloat(max)
  if (Object.keys(rangeCondition).length === 0) return []

  return [fieldBuilder(rangeCondition)]
}

export const buildStatusFilterCondition = (statusFilter: string | undefined): any[] => {
  if (!statusFilter || statusFilter === '' || statusFilter === 'all') return []

  const statusArray = statusFilter
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return statusArray.length > 0 ? [{ status: { _in: statusArray } }] : []
}

export const buildEmployeeFilterCondition = (employeeFilter: string | undefined): any[] => {
  if (!employeeFilter || employeeFilter === '') return []

  const employeeIds = employeeFilter
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
  if (employeeIds.length === 0) return []

  return [{ _or: employeeIds.map(id => ({ employee: { id: { _eq: id } } })) }]
}

export const normalizeFilterValues = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)))
}

export const filterOptionsByName = <T extends { name: string }>(options: T[], searchTerm: string): T[] => {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return options
  return options.filter(option => option.name.toLowerCase().includes(query))
}

export const buildExpenseRequestSearchOrConditions = (searchValue: string): Record<string, unknown>[] => [
  { employee: { firstName: { _ilike: searchValue } } },
  { employee: { lastName: { _ilike: searchValue } } },
  { employee: { code: { _ilike: searchValue } } },
  { employee: { hrReferenceCode: { _ilike: searchValue } } },
  { title: { _ilike: searchValue } },
  { code: { _ilike: searchValue } },
  { employee: { employeePosition: { costCenter: { name: { _ilike: searchValue } } } } },
  { employee: { employeePosition: { organizationalUnit: { name: { _ilike: searchValue } } } } },
  { requestType: { value: { _ilike: searchValue } } },
  { requestType: { translations: { value: { _ilike: searchValue } } } },
  { currency: { code: { _ilike: searchValue } } }
]

const buildDepartmentPredicate = (name: string) => ({
  employeePosition: {
    organizationalUnit: {
      name: { _eq: name }
    }
  }
})

const buildAndConditions = (
  search: string,
  searchPredicates: Array<Record<string, unknown>>,
  employeePredicateBuilder: (name: string) => Record<string, unknown>,
  departmentPredicateBuilder: (name: string) => Record<string, unknown>,
  employeeFilters: string[] = [],
  departmentFilters: string[] = []
) => {
  const andConditions: Record<string, unknown>[] = []
  if (search?.trim()) {
    andConditions.push({ _or: searchPredicates })
  }
  const normalizedEmployees = normalizeFilterValues(employeeFilters)
  if (normalizedEmployees.length > 0) {
    andConditions.push({
      _or: normalizedEmployees.map(name => employeePredicateBuilder(name))
    })
  }
  const normalizedDepartments = normalizeFilterValues(departmentFilters)
  if (normalizedDepartments.length > 0) {
    andConditions.push({
      _or: normalizedDepartments.map(name => departmentPredicateBuilder(name))
    })
  }
  return andConditions
}

export const getFilterValues = (
  filtersByReportType: Partial<
    Record<string, { status?: string[]; employeeName?: string[]; departmentName?: string[] }>
  >,
  reportType: string,
  selectedType: string | null,
  key: 'status' | 'employeeName' | 'departmentName'
): string[] => {
  if (selectedType !== reportType) return []
  const value = filtersByReportType[reportType]?.[key]
  return Array.isArray(value) ? value.map(String) : []
}

export const buildReportExpenseRequestWhere = (
  search: string,
  statusFilters: string[],
  employeeFilters: string[],
  departmentFilters: string[],
  mapStatusFilters: (filters: string[]) => string[]
) => {
  const mappedStatusFilters = mapStatusFilters(statusFilters)
  const normalizedEmployees = Array.from(
    new Set(employeeFilters.map(value => String(value || '').trim()).filter(Boolean))
  )
  const normalizedDepartments = Array.from(
    new Set(departmentFilters.map(value => String(value || '').trim()).filter(Boolean))
  )
  const where: any = {
    isDeleted: { _eq: false },
    status: mappedStatusFilters.length > 0 ? { _in: mappedStatusFilters } : { _nin: ['CREATED', 'DISCARDED'] }
  }
  const andConditions: any[] = []
  if (search?.trim()) {
    const searchPattern = `%${search.trim()}%`
    andConditions.push({
      _or: [
        { code: { _ilike: searchPattern } },
        { title: { _ilike: searchPattern } },
        { status: { _ilike: searchPattern } },
        { employee: { firstName: { _ilike: searchPattern } } },
        { employee: { lastName: { _ilike: searchPattern } } },
        { expensePlan: { code: { _ilike: searchPattern } } }
      ]
    })
  }
  if (normalizedEmployees.length > 0) {
    andConditions.push({
      _or: normalizedEmployees.map(name => ({
        employee: { fullName: { _eq: name } }
      }))
    })
  }
  if (normalizedDepartments.length > 0) {
    andConditions.push({
      _or: normalizedDepartments.map(name => ({
        employee: {
          employeePosition: {
            organizationalUnit: {
              name: { _eq: name }
            }
          }
        }
      }))
    })
  }
  if (andConditions.length > 0) {
    where._and = andConditions
  }
  return where
}

interface EntityWhereConfig {
  readonly searchPredicateBuilder: (pattern: string) => Array<Record<string, unknown>>
  readonly employeePredicateBuilder: (name: string) => Record<string, unknown>
  readonly departmentPredicateBuilder: (name: string) => Record<string, unknown>
  readonly statusExclusion?: readonly string[]
}

const buildEntityWhereForExport = (
  search: string,
  employeeFilters: string[],
  departmentFilters: string[],
  config: EntityWhereConfig
) => {
  const where: any = {
    isDeleted: { _eq: false },
    status: { _nin: config.statusExclusion ?? ['CREATED', 'DISCARDED'] }
  }
  const searchPattern = `%${search.trim()}%`
  const conditions = buildAndConditions(
    search,
    config.searchPredicateBuilder(searchPattern),
    config.employeePredicateBuilder,
    config.departmentPredicateBuilder,
    employeeFilters,
    departmentFilters
  )
  if (conditions.length > 0) where._and = conditions
  return where
}

const PLAN_WHERE_CONFIG: EntityWhereConfig = {
  searchPredicateBuilder: (p: string) => [
    { code: { _ilike: p } },
    { title: { _ilike: p } },
    { status: { _ilike: p } },
    { employee: { firstName: { _ilike: p } } },
    { employee: { lastName: { _ilike: p } } },
    { expenseRequest: { code: { _ilike: p } } }
  ],
  employeePredicateBuilder: name => ({ employee: { fullName: { _eq: name } } }),
  departmentPredicateBuilder: name => ({ employee: buildDepartmentPredicate(name) })
}

const ADVANCE_PAYMENT_WHERE_CONFIG: EntityWhereConfig = {
  searchPredicateBuilder: (p: string) => [
    { code: { _ilike: p } },
    { description: { _ilike: p } },
    { status: { _ilike: p } },
    { expensePlan: { code: { _ilike: p } } },
    { expensePlan: { title: { _ilike: p } } },
    { expensePlan: { employee: { firstName: { _ilike: p } } } },
    { expensePlan: { employee: { lastName: { _ilike: p } } } },
    { paymentMethod: { _ilike: p } },
    { costCenter: { name: { _ilike: p } } }
  ],
  employeePredicateBuilder: name => ({ expensePlan: { employee: { fullName: { _eq: name } } } }),
  departmentPredicateBuilder: name => ({ expensePlan: { employee: buildDepartmentPredicate(name) } })
}

export const buildExpensePlanWhereForExport = (
  search: string,
  employeeFilters: string[] = [],
  departmentFilters: string[] = []
) => buildEntityWhereForExport(search, employeeFilters, departmentFilters, PLAN_WHERE_CONFIG)

export const buildAdvancePaymentWhereForExport = (
  search: string,
  employeeFilters: string[] = [],
  departmentFilters: string[] = []
) => buildEntityWhereForExport(search, employeeFilters, departmentFilters, ADVANCE_PAYMENT_WHERE_CONFIG)
