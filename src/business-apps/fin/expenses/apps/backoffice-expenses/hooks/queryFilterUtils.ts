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
