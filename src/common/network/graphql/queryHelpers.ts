import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

/**
 * GraphQL query helpers (generic, entity-agnostic)
 */

// (Removed legacy basic where/query presets/builders - keep helpers minimal)

export interface SortInput {
  field: string
  direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
}

// ==========================================
// CORE BUILDERS (DOT-PATH)
// ==========================================

/** Build a nested GraphQL object path from a dot path, with a leaf assignment */
const buildNestedPath = (dotPath: string, leaf: string): string => {
  const segments = dotPath.split('.').filter(Boolean)
  if (segments.length === 0) return leaf
  return segments.reverse().reduce((acc, seg) => `{ ${seg}: ${acc} }`, leaf)
}

/**
 * Unified descriptor for search, sort and filter
 * - Use searchPaths/type for free-text search
 * - Use sortPath for orderBy building
 * - Use path/kind/build for filter WHERE building
 * Optional enable flags allow opting out per capability without separate types
 */
export interface Descriptor {
  // Common
  key: string
  filterLabel?: string // Human-readable label for filter (falls abweichend von key)

  // Sorting
  sortPath?: string // Single path (existing)
  sortPaths?: string[] // Multiple paths for fallbacks (new)
  enableSort?: boolean

  // Search
  searchPaths?: string[]
  enableSearch?: boolean
  type?: 'text' | 'number' | 'date' | 'boolean'
  /**
   * For boolean columns that are displayed as text labels (e.g. 'Planned' / 'Not planned'),
   * maps each boolean value to its visible label(s) so free-text search can match the label and
   * resolve to `_eq true/false`. A term matches when it is a case-insensitive substring of any label;
   * if it matches both values, both are searched. Multiple labels per value are supported for columns
   * whose label varies by context (e.g. Account category 'Customer' in CRM vs 'Portfolio Company' in IRM).
   */
  searchBooleanLabels?: { true?: string | string[]; false?: string | string[] }
  /**
   * For columns that render a fallback label (e.g. 'Unknown') when the related value is null,
   * lets free-text search match that label and resolve to an `_isNull` check on `searchNullPath`.
   * A term matches when it is a case-insensitive substring of `searchNullLabel`.
   */
  searchNullLabel?: string
  searchNullPath?: string

  // Filters
  path?: string
  kind?: FilterKind
  build?: (value: any) => string[] | string
  enableFilter?: boolean

  // Options (for building filter groups / distinct lists)
  optionSelectPaths?: string[]
  optionSearchPaths?: string[]
  optionDistinctOn?: string[]
}

/** Build orderBy as GraphQL object array (for use with GraphQL variables) */
export const buildOrderBy = (orderBy: SortInput[] = [], descriptors: Descriptor[] = []): any[] => {
  if (!orderBy.length) return []
  const index: Record<string, Descriptor> = Object.fromEntries(descriptors.map(d => [d.key, d]))
  const orderByObjects: any[] = []

  for (const o of orderBy) {
    const d = index[o.field]
    if (!d) continue
    if (d.enableSort === false) continue

    // Support sortPaths (fallbacks) or sortPath (single) or searchPaths[0] fallback
    let paths: string[]
    if (d.sortPaths) {
      paths = d.sortPaths
    } else if (d.sortPath) {
      paths = [d.sortPath]
    } else if (d.searchPaths && d.searchPaths.length > 0) {
      paths = [d.searchPaths[0]]
    } else {
      paths = [o.field]
    }

    for (const path of paths) {
      const segments = path.split('.').filter(Boolean)
      if (segments.length === 0) continue

      const orderByObj: any = {}
      let current = orderByObj
      for (let i = 0; i < segments.length - 1; i++) {
        current[segments[i]] = {}
        current = current[segments[i]]
      }
      current[segments[segments.length - 1]] = o.direction
      orderByObjects.push(orderByObj)
    }
  }

  return orderByObjects
}

/** Build nested object path from dot path */
const buildNestedObjectPath = (dotPath: string, leaf: any): any => {
  const segments = dotPath.split('.').filter(Boolean)
  if (segments.length === 0) return leaf

  let result: any = leaf
  for (let i = segments.length - 1; i >= 0; i--) {
    result = { [segments[i]]: result }
  }
  return result
}

const utcDayRange = (year: number, monthIndex: number, day: number): { start: Date; end: Date } => ({
  start: new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0)),
  end: new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999))
})

/**
 * Parse a free-text search term into an inclusive [gte, lte] range for date/timestamp columns.
 *
 * Date columns are not text, so `_ilike` cannot be used; instead the term is matched as a range.
 * Returns null when the term is not clearly a date so that bare numbers (e.g. "130", "150") never
 * generate spurious date predicates. Supported inputs:
 *  - `YYYY`            → whole year
 *  - `YYYY-MM`         → whole month
 *  - `YYYY-MM-DD`      → that day
 *  - month-name / slash dates (`Jun 30, 2026`, `June 2026`, `06/30/2026`) → that day
 */
const parseSearchDateRange = (term: string): { gte: string; lte: string } | null => {
  let range: { start: Date; end: Date } | null = null

  if (/^\d{4}-\d{2}-\d{2}$/.test(term)) {
    const [y, m, d] = term.split('-').map(n => Number.parseInt(n, 10))
    range = utcDayRange(y, m - 1, d)
  } else if (/^\d{4}-\d{2}$/.test(term)) {
    const [y, m] = term.split('-').map(n => Number.parseInt(n, 10))
    range = { start: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)), end: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)) }
  } else if (/^\d{4}$/.test(term)) {
    const y = Number.parseInt(term, 10)
    range = { start: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)), end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)) }
  } else if (/[a-zA-Z]/.test(term) || term.includes('/')) {
    // Month-name or slash dates only — never bare numbers, which JS would mis-parse as a year.
    const parsed = new Date(term)
    if (!Number.isNaN(parsed.getTime())) {
      range = utcDayRange(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
    }
  }

  if (!range) return null
  return { gte: range.start.toISOString(), lte: range.end.toISOString() }
}

/**
 * Resolve a free-text term to the boolean value(s) it should match for a boolean descriptor.
 * Supports literal keywords (true/false/yes/no/1/0) and, when `searchBooleanLabels` is provided,
 * matches the term as a case-insensitive substring of the displayed labels (e.g. 'Planned').
 */
const labelMatchesTerm = (labels: string | string[] | undefined, term: string): boolean => {
  if (!labels) return false
  const list = Array.isArray(labels) ? labels : [labels]
  return list.some(label => label.toLowerCase().includes(term))
}

const resolveBooleanSearchValues = (term: string, d: Descriptor): boolean[] => {
  const t = term.toLowerCase()

  if (d.searchBooleanLabels) {
    const matches: boolean[] = []
    if (labelMatchesTerm(d.searchBooleanLabels.true, t)) matches.push(true)
    if (labelMatchesTerm(d.searchBooleanLabels.false, t)) matches.push(false)
    if (matches.length > 0) return matches
  }

  if (t === 'true' || t === '1' || t === 'yes') return [true]
  if (t === 'false' || t === '0' || t === 'no') return [false]
  return []
}

/**
 * Parse a user-typed search term as a number, tolerating grouped formatting as it appears in the
 * UI. Commas are treated as thousands separators and stripped (e.g. "123,123" → 123123), while the
 * dot stays the decimal separator (e.g. "5.24" → 5.24). Returns `NaN` for non-numeric input.
 */
export const parseSearchNumber = (term: string): number => {
  const normalized = term.replace(/,/g, '').trim()
  if (normalized === '') return Number.NaN
  return Number(normalized)
}

/** Build _or search conditions from descriptors (returns object) */
export const buildSearch = (search: string, descriptors: Descriptor[] = []): Record<string, any> | null => {
  const term = search?.trim()
  if (!term) return null

  const conds: any[] = []
  for (const d of descriptors) {
    const paths = d.searchPaths || []
    if (d.enableSearch === false) continue
    for (const path of paths) {
      let leaf: any = null

      if (d.type === 'number') {
        const num = parseSearchNumber(term)
        if (!Number.isNaN(num) && Number.isFinite(num)) {
          leaf = { _eq: num }
        } else {
          continue // skip invalid numeric input for number fields
        }
      } else if (d.type === 'boolean') {
        const boolValues = resolveBooleanSearchValues(term, d)
        if (boolValues.length === 0) {
          continue // term doesn't match any boolean value/label
        }
        for (const bool of boolValues) {
          conds.push(buildNestedObjectPath(path, { _eq: bool }))
        }
        continue
      } else if (d.type === 'date') {
        // Date/timestamp columns can't be `_ilike`'d, so match the term as a range. Bare numbers
        // (e.g. "130", "150") return null here and are skipped, instead of being mis-parsed as a
        // year and producing useless predicates.
        const dateRange = parseSearchDateRange(term)
        if (!dateRange) {
          continue
        }
        leaf = { _gte: dateRange.gte, _lte: dateRange.lte }
      } else {
        // Default: text search with _ilike
        const escape = (s: string) =>
          String(s)
            .replace(/\\/g, String.raw`\\`)
            .replace(/"/g, String.raw`\"`)
        const like = `%${escape(term)}%`
        leaf = { _ilike: like }
      }

      conds.push(buildNestedObjectPath(path, leaf))
    }

    // Fallback "null label" search: e.g. a Status column rendered as 'Unknown' when the relation
    // is null. Matching the label resolves to an `_isNull` check on the configured FK/ref path.
    if (d.searchNullLabel && d.searchNullPath && d.searchNullLabel.toLowerCase().includes(term.toLowerCase())) {
      conds.push(buildNestedObjectPath(d.searchNullPath, { _isNull: true }))
    }
  }
  return conds.length > 0 ? { _or: conds } : null
}

export const buildFilter = (
  variables: Record<string, any>,
  descriptors: Descriptor[] = []
): Record<string, any> | null => {
  const andConds: any[] = []
  for (const d of descriptors) {
    const value = variables[d.key as keyof typeof variables]
    if (value === undefined || value === null) continue
    if (d.enableFilter === false) continue
    if (d.kind === 'custom' && d.build) {
      // Custom builders return strings - skip for object mode (handled separately if needed)
      continue
    }
    if (!d.path) continue

    let leaf: any = null

    switch (d.kind) {
      case 'inIds': {
        const arr: string[] = Array.isArray(value) ? value : []
        if (arr.length > 0) {
          leaf = { _in: arr }
        }
        break
      }
      case 'inStrings': {
        const arr: string[] = Array.isArray(value) ? value : []
        if (arr.length > 0) {
          leaf = { _in: arr }
        }
        break
      }
      case 'eqBool': {
        leaf = { _eq: value === true }
        break
      }
      case 'dateFrom': {
        leaf = { _gte: value }
        break
      }
      case 'dateTo': {
        leaf = { _lte: value }
        break
      }
    }

    // Handle number range objects { min, max } for descriptors with type 'number' and no kind
    if (!leaf && !d.kind && d.type === 'number' && typeof value === 'object' && value !== null) {
      const { min, max } = value as { min?: number; max?: number }
      const condition: Record<string, number> = {}
      if (min !== undefined && min !== null) condition._gte = min
      if (max !== undefined && max !== null) condition._lte = max
      if (Object.keys(condition).length > 0) {
        leaf = condition
      }
    }

    if (leaf) {
      andConds.push(buildNestedObjectPath(d.path, leaf))
    }
  }
  return andConds.length > 0 ? { _and: andConds } : null
}

// ==========================================
// GENERIC GRAPHQL DISTINCT LIST QUERY BUILDERS
// ==========================================

/** Build nested selection string from dot paths */
export const selectionFromPaths = (paths: string[]): string => {
  const tree: any = {}
  for (const p of paths) {
    const segs = p.split('.').filter(Boolean)
    let node = tree
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      if (i === segs.length - 1) {
        node[s] = true
      } else {
        node[s] = node[s] || {}
        node = node[s]
      }
    }
  }
  const render = (n: any): string => {
    return Object.entries(n)
      .map(([k, v]) => (v === true ? k : `${k} { ${render(v)} }`))
      .join(' ')
  }
  return render(tree)
}

/**
 * Build nested selection string from dot paths, ensuring array parent nodes are included
 * For nested arrays (e.g., addresses.country.id), we need to select the array itself
 * to ensure all array items are returned, not just those matching the nested path
 */
export const selectionFromPathsWithArraySupport = (paths: string[]): string => {
  if (!paths.length) return ''

  const firstPath = paths[0]
  const pathParts = firstPath.split('.')

  // If path has 3+ parts, it's a nested array (e.g., "addresses.country.id")
  // We need to select the array parent to get all items
  if (pathParts.length > 2) {
    const arrayKey = pathParts[0] // e.g., "addresses"
    const nestedPath = paths.map(p => p.split('.').slice(1).join('.')) // e.g., ["country.id", "country.value", "country.code"]

    // Build nested selection for the array items
    const nestedTree: any = {}
    for (const p of nestedPath) {
      const segs = p.split('.').filter(Boolean)
      let node = nestedTree
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i]
        if (i === segs.length - 1) {
          node[s] = true
        } else {
          node[s] = node[s] || {}
          node = node[s]
        }
      }
    }

    const render = (n: any): string => {
      return Object.entries(n)
        .map(([k, v]) => {
          if (v === true) {
            return k
          }
          return `${k} { ${render(v)} }`
        })
        .join(' ')
    }

    // Return array selection with nested path
    return `${arrayKey} { ${render(nestedTree)} }`
  }

  // For simple paths, use original logic
  return selectionFromPaths(paths)
}

export const searchOrFromPaths = (search: string, paths: string[] = []): string => {
  const term = search?.trim()
  if (!term) return ''
  const like = `%${term}%`
  const conds = paths.map(p => buildNestedPath(p, `{ _ilike: "${like}" }`))
  return conds.length ? `_or: [${conds.join(', ')}]` : ''
}

export const buildFilterGroups = (args: {
  entityName: string
  descriptors: Descriptor[]
  searchByKey?: Record<string, string>
  limit?: number
}): Record<string, string> => {
  const { entityName, descriptors, searchByKey = {}, limit = 100 } = args
  const result: Record<string, string> = {}
  for (const d of descriptors) {
    if (!d.optionSelectPaths?.length) continue
    const selectPaths = d.optionSelectPaths
    const searchPaths = d.optionSearchPaths || d.searchPaths || []
    const distinctOn = d.optionDistinctOn || []
    const search = searchByKey[d.key] || ''
    const selection = selectionFromPaths(selectPaths)
    const searchOr = searchOrFromPaths(search, searchPaths)
    const whereParts = ['isDeleted: { _eq: false }']
    if (searchOr) whereParts.push(searchOr)
    const where = `where: { ${whereParts.join(', ')} }`
    const distinct = distinctOn.length ? `distinctOn: [${distinctOn.join(', ')}]` : ''
    result[d.key] = `
      query GetDistinct${entityName}List_${d.key} {
        ${entityName}(
          ${where}
          ${distinct}
          limit: ${limit}
        ) {
          ${selection}
        }
      }
    `
  }
  return result
}

/**
 * Build aggregate count queries for filter options
 * Returns queries to get totalCount for each filter descriptor
 */
export const buildFilterAggregateQueries = (args: {
  entityName: string
  descriptors: Descriptor[]
}): Record<string, string> => {
  const { entityName, descriptors } = args
  const result: Record<string, string> = {}

  for (const d of descriptors) {
    if (!d.optionSelectPaths?.length) continue

    // Build distinctOn condition if specified
    const distinctOn = d.optionDistinctOn || []
    const distinct = distinctOn.length ? `distinctOn: [${distinctOn.join(', ')}]` : ''

    result[d.key] = `
      query Get${entityName}FilterCount_${d.key} {
        ${entityName}Aggregate(
          where: { isDeleted: { _eq: false } }
          ${distinct}
        ) {
          aggregate {
            count
          }
        }
      }
    `
  }

  return result
}

/**
 * Transform GraphQL filter option response to UI format
 * Handles nested paths from optionSelectPaths
 */
export const transformFilterOptions = (data: any, descriptor: Descriptor): Array<{ id: string; label: string }> => {
  if (!data || !Array.isArray(data)) return []
  if (!descriptor.optionSelectPaths || descriptor.optionSelectPaths.length === 0) return []

  const paths = descriptor.optionSelectPaths
  const firstPath = paths[0] || ''
  const currentLocale = getCurrentActiveUserLocale()

  const getValuesAtPath = (source: unknown, parts: string[]): unknown[] => {
    if (source == null) return []
    if (parts.length === 0) return [source]
    if (Array.isArray(source)) {
      return source.flatMap(item => getValuesAtPath(item, parts))
    }

    if (typeof source !== 'object') return []

    const [part, ...rest] = parts
    return getValuesAtPath((source as Record<string, unknown>)[part], rest)
  }

  const resolveOptionLabel = (idValue: unknown, fallbackLabel: unknown, localizedLabels: unknown) => {
    if (localizedLabels && typeof localizedLabels === 'object' && !Array.isArray(localizedLabels)) {
      const localizedLabel = (localizedLabels as Record<string, unknown>)[currentLocale]
      if (typeof localizedLabel === 'string' && localizedLabel.trim() !== '') {
        return localizedLabel
      }
    }

    if (typeof fallbackLabel === 'string' && fallbackLabel.trim() !== '') {
      return fallbackLabel
    }

    return String(idValue || '')
  }

  const idPath = firstPath.split('.')
  const labelPath = paths[1]?.split('.') || idPath
  const localizedLabelPath = paths[2]?.split('.') || []
  const seen = new Set<string>()
  const result: Array<{ id: string; label: string }> = []

  data.forEach((item: any) => {
    const ids = getValuesAtPath(item, idPath)
    const labels = getValuesAtPath(item, labelPath)
    const localizedLabels = localizedLabelPath.length ? getValuesAtPath(item, localizedLabelPath) : []

    ids.forEach((id, index) => {
      const idStr = String(id || '')
      if (!idStr.trim() || seen.has(idStr)) return

      seen.add(idStr)
      result.push({
        id: idStr,
        label: resolveOptionLabel(id, labels[index] ?? labels[0], localizedLabels[index] ?? localizedLabels[0])
      })
    })
  })

  return result
}

/**
 * Build combined GraphQL query for all filter options and their aggregate counts
 * Returns a single query that fetches both filter options and total counts
 */
export const buildCombinedFilterGroupsQuery = (args: {
  entityName: string
  descriptors: Descriptor[]
  searchByKey?: Record<string, string>
  limit?: number
  baseWhereParts?: string[]
}): string => {
  const { entityName, descriptors, searchByKey = {}, limit = 100, baseWhereParts = [] } = args

  const filterQueries: string[] = []
  const aggregateQueries: string[] = []

  for (const d of descriptors) {
    if (!d.optionSelectPaths?.length) continue

    const selectPaths = d.optionSelectPaths
    const searchPaths = d.optionSearchPaths || d.searchPaths || []
    const distinctOn = d.optionDistinctOn || []
    const search = searchByKey[d.key] || ''
    const selection = selectionFromPathsWithArraySupport(selectPaths)
    const searchOr = searchOrFromPaths(search, searchPaths)

    // Auto-detect nested arrays: if first selectPath has 3+ parts, it's nested
    // GraphQL distinctOn only works on top-level fields, not nested array fields
    const firstPath = selectPaths[0] || ''
    const isNestedArray = firstPath.split('.').length > 2

    // Build where clause
    const whereParts = ['isDeleted: { _eq: false }', ...baseWhereParts]

    // For nested arrays, add filter to only get entities that have the array with non-null values
    // Example: addresses: { country: { id: { _isNull: false } } }
    if (isNestedArray) {
      const arrayKey = firstPath.split('.')[0] // e.g., "addresses"
      const nestedField = firstPath.split('.').slice(1).join('.') // e.g., "country.id"
      // Build nested filter: country: { id: { _isNull: false } }
      const nestedParts = nestedField.split('.')
      const nestedFilter = nestedParts.reduceRight((acc, part, idx) => {
        if (idx === nestedParts.length - 1) {
          return `${part}: { _isNull: false }`
        }
        return `${part}: { ${acc} }`
      }, '')
      whereParts.push(`${arrayKey}: { ${nestedFilter} }`)
    }

    if (searchOr) whereParts.push(searchOr)
    const where = `where: { ${whereParts.join(', ')} }`
    const distinct = !isNestedArray && distinctOn.length ? `distinctOn: [${distinctOn.join(', ')}]` : ''

    // For nested arrays, we need to fetch more records (or all) since we're limiting at Account level, not Country level
    const queryLimit = isNestedArray ? 1000 : limit

    // Filter options query
    filterQueries.push(`
      ${d.key}: ${entityName}(
        ${where}
        ${distinct}
        limit: ${queryLimit}
      ) {
        ${selection}
      }
    `)

    // Aggregate count query
    // For nested arrays, we can't use distinctOn in aggregate, so we'll calculate count from flattened data
    const aggregateWhereParts = ['isDeleted: { _eq: false }', ...baseWhereParts]
    const aggregateWhere = `where: { ${aggregateWhereParts.join(', ')} }`
    aggregateQueries.push(`
      ${d.key}Count: ${entityName}Aggregate(
        ${aggregateWhere}
        ${distinct}
      ) {
        aggregate {
          count
        }
      }
    `)
  }

  return `
    query GetFilterGroups {
      ${filterQueries.join('\n')}
      ${aggregateQueries.join('\n')}
    }
  `
}

/**
 * Fetch filter groups with options and total counts
 * Executes the combined query and processes results
 */
export const fetchFilterGroups = async (args: {
  graphqlClient: any
  entityName: string
  descriptors: Descriptor[]
  searchByKey?: Record<string, string>
  limit?: number
  baseWhereParts?: string[]
}): Promise<
  Record<
    string,
    {
      options: Array<{ id: string; label: string }>
      totalCount: number
    }
  >
> => {
  const { graphqlClient, entityName, descriptors, searchByKey, limit, baseWhereParts } = args

  const query = buildCombinedFilterGroupsQuery({ entityName, descriptors, searchByKey, limit, baseWhereParts })
  const result = await graphqlClient.request(query)

  const filterData: Record<
    string,
    {
      options: Array<{ id: string; label: string }>
      totalCount: number
    }
  > = {}

  for (const d of descriptors) {
    if (!d.optionSelectPaths?.length) continue

    const data = result[d.key] || []
    const transformedOptions = transformFilterOptions(data, d)

    // For nested arrays, we can't get accurate count from aggregate query
    // because distinctOn doesn't work on nested paths. Use transformed count instead.
    const firstPath = d.optionSelectPaths[0] || ''
    const isNestedArray = firstPath.split('.').length > 2

    const count = isNestedArray
      ? transformedOptions.length // For nested: count after flattening (approximation)
      : result[`${d.key}Count`]?.aggregate?.count || transformedOptions.length

    filterData[d.key] = {
      options: transformedOptions,
      totalCount: count
    }
  }

  return filterData
}

// ==========================================
// GENERIC FILTER BUILDERS (AND)
// ==========================================

export type FilterKind = 'inIds' | 'inStrings' | 'eqBool' | 'dateFrom' | 'dateTo' | 'custom'

// ==========================================
// GENERIC WHERE BUILDER
// ==========================================

export interface BuildWhereOptions {
  /** Variables object containing filter/search values */
  variables: Record<string, any>
  /** Descriptors for filter and search building */
  descriptors: Descriptor[]
  /** Optional: IDs to filter by */
  ids?: string[]
  /** Optional: Custom additional conditions as GraphQL objects */
  customConditions?: Record<string, any>[]
  /** Optional: Skip isDeleted check (default: false) */
  isDeleted?: boolean
  /**
   * Optional: Restrict free-text search to descriptors whose `key` is in this allowlist.
   * When omitted, search runs against every searchable descriptor (previous behavior).
   * Used to limit the generated `_or` to the columns currently visible in a list view,
   * which dramatically reduces the number of `_ilike` predicates (and expensive relation
   * subqueries) sent to the database.
   */
  searchDescriptorKeys?: string[]
  /**
   * Optional extra GraphQL `where` fragments to OR into the free-text search predicate.
   * Only applied when a search term is present. Used for predicates that cannot be expressed
   * as standard descriptors (e.g. jsonb `additionalProperties` `_contains` matches), so they
   * participate in the same search `_or` as the regular column search.
   */
  extraSearchConditions?: Record<string, any>[]
}

/**
 * Target describing how to reach a jsonb `additionalProperties` value in a where clause.
 * - `relation`: relation field wrapping the jsonb column (e.g. `liquidFundInvestment`),
 *   or `undefined` when the column lives on the queried entity root.
 * - `jsonKey`: dot-path of the property inside `additionalProperties`.
 */
export interface JsonbContainsTarget {
  relation?: string
  jsonKey: string
}

/** Build a nested object from a dot-path key, e.g. ('a.b', 5) → { a: { b: 5 } }. */
const buildNestedJsonbValue = (jsonKey: string, value: number | string): Record<string, any> => {
  const segments = jsonKey.split('.').filter(Boolean)
  return segments.reduceRight<Record<string, any> | number | string>(
    (acc, segment) => ({ [segment]: acc }),
    value
  ) as Record<string, any>
}

/**
 * Resolve the value variant(s) to match against jsonb. Investment data is stored inconsistently —
 * the same metric can be a raw JSON number (`123123`, seed/snapshot data) or a 2-decimal string
 * (`"123123.00"`, data entered through the app) within the *same* entity. So for a numeric term we
 * emit both forms. The bare-string form (`"123123"`) is intentionally omitted: no row stores that.
 * A non-numeric term keeps its raw value for exact text matches.
 */
const resolveJsonbSearchValues = (term: string): Array<number | string> => {
  const numericValue = parseSearchNumber(term)
  const isNumeric = !Number.isNaN(numericValue) && Number.isFinite(numericValue)

  if (!isNumeric) return [term]

  const values: Array<number | string> = [numericValue]
  // Also match the 2-decimal string storage form (e.g. "123123.00"), but only when padding to two
  // decimals doesn't round the value — so "123.123" never falsely matches a stored "123.12".
  const twoDecimal = numericValue.toFixed(2)
  if (Number(twoDecimal) === numericValue) {
    values.push(twoDecimal)
  }
  return values
}

/**
 * Build jsonb `additionalProperties._contains` search predicates for a free-text term.
 *
 * jsonb values can only be matched exactly (Postgres containment, no `_ilike`). Because the same
 * metric may be stored as a number or a 2-decimal string, a numeric term emits both forms.
 */
export const buildJsonbContainsConditions = (
  targets: JsonbContainsTarget[],
  term: string | undefined
): Record<string, any>[] => {
  const trimmed = (term ?? '').trim()
  if (!trimmed || targets.length === 0) return []

  const values = resolveJsonbSearchValues(trimmed)

  return targets.flatMap(({ relation, jsonKey }) =>
    values.map(value => {
      const leaf = { additionalProperties: { _contains: buildNestedJsonbValue(jsonKey, value) } }
      return relation ? { [relation]: leaf } : leaf
    })
  )
}

/**
 * Generic WHERE condition builder that eliminates duplication across query files.
 * Handles: isDeleted, IDs filter, standard filters (via descriptors), search (via descriptors), and custom conditions.
 * Returns GraphQL object (for use with GraphQL variables).
 */
export const buildWhere = (options: BuildWhereOptions): Record<string, any> => {
  const {
    variables,
    descriptors,
    ids,
    customConditions = [],
    isDeleted = true,
    searchDescriptorKeys,
    extraSearchConditions = []
  } = options

  // Normalize date range variables: Convert *Range variables (comma-separated strings or arrays) to *From/*To pairs
  // Dynamically find matching descriptors to determine the From/To keys
  const normalizedVariables = { ...variables }

  // Find all variables ending with "Range"
  const rangeKeys = Object.keys(normalizedVariables).filter(k => k.endsWith('Range'))

  for (const rangeKey of rangeKeys) {
    const rangeValue = normalizedVariables[rangeKey]
    if (rangeValue === undefined || rangeValue === null) continue

    // Extract base name (e.g., "createdDateRange" -> "createdDate", "dueDateRange" -> "dueDate")
    const baseName = rangeKey.replace(/Range$/, '')

    // Find matching From/To descriptors
    const fromKey = descriptors.find(d => d.kind === 'dateFrom' && d.path?.includes(baseName))?.key
    const toKey = descriptors.find(d => d.kind === 'dateTo' && d.path?.includes(baseName))?.key

    if (fromKey && toKey) {
      // If From/To already exist, don't override
      if (normalizedVariables[fromKey] === undefined && normalizedVariables[toKey] === undefined) {
        let dateRange: string[] = []

        if (Array.isArray(rangeValue)) {
          dateRange = rangeValue
        } else if (typeof rangeValue === 'string') {
          // Split comma-separated string
          dateRange = rangeValue
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        }

        if (dateRange.length >= 2) {
          const [start, end] = dateRange
          if (start) normalizedVariables[fromKey] = start
          if (end) normalizedVariables[toKey] = end
        } else if (dateRange.length === 1) {
          // Single date: use as both From and To
          normalizedVariables[fromKey] = dateRange[0]
          normalizedVariables[toKey] = dateRange[0]
        }
      }
    }
  }

  const whereObj: Record<string, any> = {}

  // Base condition: isDeleted check
  if (isDeleted) {
    whereObj.isDeleted = { _eq: false }
  }

  // IDs filter
  if (ids && ids.length > 0) {
    whereObj.id = { _in: ids }
  }

  // Custom conditions (merge into whereObj)
  for (const customCondition of customConditions) {
    Object.assign(whereObj, customCondition)
  }

  // Standard filters via descriptors (using buildFilter)
  const filterObj = buildFilter(normalizedVariables, descriptors)
  if (filterObj?._and) {
    if (whereObj._and) {
      whereObj._and.push(...filterObj._and)
    } else {
      whereObj._and = filterObj._and
    }
  }

  // Search via descriptors (using buildSearch).
  // Optionally restrict to an allowlist of descriptor keys (e.g. visible list columns)
  // to keep the generated _or small and avoid scanning unused columns/relations.
  const searchDescriptors =
    searchDescriptorKeys && searchDescriptorKeys.length > 0
      ? descriptors.filter(d => searchDescriptorKeys.includes(d.key))
      : descriptors
  const searchObj = buildSearch(normalizedVariables.search, searchDescriptors)
  const searchOrParts: Record<string, any>[] = [...(searchObj?._or ?? [])]

  // Merge in non-descriptor search predicates (e.g. jsonb `_contains`) so they are OR'd
  // alongside the regular column search rather than narrowing it via AND.
  const hasSearchTerm = typeof normalizedVariables.search === 'string' && normalizedVariables.search.trim() !== ''
  if (hasSearchTerm && extraSearchConditions.length > 0) {
    searchOrParts.push(...extraSearchConditions)
  }

  if (searchOrParts.length > 0) {
    const combinedSearch = { _or: searchOrParts }
    if (whereObj._and) {
      whereObj._and.push(combinedSearch)
    } else if (whereObj._or) {
      whereObj._and = [{ _or: whereObj._or }, combinedSearch]
      delete whereObj._or
    } else {
      whereObj._or = searchOrParts
    }
  }

  return whereObj
}

// (Intentionally no entity-specific descriptors below this point)
