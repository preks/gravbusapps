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
