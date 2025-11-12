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
    } else if (d.searchPaths?.length > 0) {
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
        const num = Number(term)
        if (!Number.isNaN(num) && Number.isFinite(num)) {
          leaf = { _eq: num }
        } else {
          continue // skip invalid numeric input for number fields
        }
      } else if (d.type === 'boolean') {
        const t = term.toLowerCase()
        const bool =
          t === 'true' || t === '1' || t === 'yes' ? true : t === 'false' || t === '0' || t === 'no' ? false : null
        if (bool === null) {
          continue // skip invalid boolean input
        }
        leaf = { _eq: bool }
      } else if (d.type === 'date') {
        // Accept YYYY, YYYY-MM, YYYY-MM-DD, or parseable date; build a day/month/year range
        const ymd = term.match(/^\d{4}-\d{2}-\d{2}$/)
        const ym = term.match(/^\d{4}-\d{2}$/)
        const y = term.match(/^\d{4}$/)
        let start: Date | null = null
        let end: Date | null = null
        if (ymd) {
          const [Y, M, D] = term.split('-').map((n: string) => Number.parseInt(n, 10))
          start = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0))
          end = new Date(Date.UTC(Y, M - 1, D, 23, 59, 59, 999))
        } else if (ym) {
          const [Y, M] = term.split('-').map((n: string) => Number.parseInt(n, 10))
          start = new Date(Date.UTC(Y, M - 1, 1, 0, 0, 0, 0))
          end = new Date(Date.UTC(Y, M, 0, 23, 59, 59, 999))
        } else if (y) {
          const Y = Number.parseInt(term, 10)
          start = new Date(Date.UTC(Y, 0, 1, 0, 0, 0, 0))
          end = new Date(Date.UTC(Y, 11, 31, 23, 59, 59, 999))
        } else {
          const dParsed = new Date(term)
          if (!Number.isNaN(dParsed.getTime())) {
            start = new Date(
              Date.UTC(dParsed.getUTCFullYear(), dParsed.getUTCMonth(), dParsed.getUTCDate(), 0, 0, 0, 0)
            )
            end = new Date(
              Date.UTC(dParsed.getUTCFullYear(), dParsed.getUTCMonth(), dParsed.getUTCDate(), 23, 59, 59, 999)
            )
          }
        }
        if (!start || !end) {
          continue // skip invalid date-like input for date fields
        }
        const startIso = start.toISOString()
        const endIso = end.toISOString()
        leaf = { _gte: startIso, _lte: endIso }
      } else {
        // Default: text search with _ilike
        const escape = (s: string) => String(s).replaceAll('\\', '\\\\').replaceAll('"', '\\"')
        const like = `%${escape(term)}%`
        leaf = { _ilike: like }
      }

      conds.push(buildNestedObjectPath(path, leaf))
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
  const pathParts = firstPath.split('.')

  // Auto-detect nested arrays: if first selectPath has 3+ parts, it's nested (e.g., "addresses.country.id")
  const isNestedArray = pathParts.length > 2

  if (isNestedArray) {
    // Handle nested arrays: flatten and make distinct
    const seen = new Set<string>()
    const result: Array<{ id: string; label: string }> = []

    // First part is the array key (e.g., "addresses")
    const arrayKey = pathParts[0]
    // Remaining parts are the nested path (e.g., ["country", "id"])
    const nestedIdPath = pathParts.slice(1)
    // Get label path (e.g., ["country", "value"])
    const labelPathParts = paths[1]?.split('.') || pathParts
    const nestedLabelPath = labelPathParts.length > 2 ? labelPathParts.slice(1) : nestedIdPath

    data.forEach((item: any) => {
      const array = item?.[arrayKey]
      if (!Array.isArray(array)) return

      array.forEach((arrayItem: any) => {
        // Navigate nested path for id (e.g., arrayItem.country.id)
        let id = arrayItem
        for (const part of nestedIdPath) {
          id = id?.[part]
        }

        // Navigate nested path for label (e.g., arrayItem.country.value)
        let label = arrayItem
        for (const part of nestedLabelPath) {
          label = label?.[part]
        }

        const idStr = String(id || '')
        if (idStr && idStr.trim() !== '' && !seen.has(idStr)) {
          seen.add(idStr)
          result.push({
            id: idStr,
            label: String(label || idStr)
          })
        }
      })
    })

    return result
  }

  // Simple path (existing logic)
  const idPath = pathParts
  const labelPath = paths[1]?.split('.') || pathParts

  return data
    .map((item: any) => {
      // Extract id from nested path
      let id = item
      for (const segment of idPath) {
        id = id?.[segment]
      }

      // Extract label from nested path
      let label = item
      for (const segment of labelPath) {
        label = label?.[segment]
      }

      return {
        id: String(id || ''),
        label: String(label || id || '')
      }
    })
    .filter(option => option.id && option.id.trim() !== '')
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
}): string => {
  const { entityName, descriptors, searchByKey = {}, limit = 100 } = args

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
    const whereParts = ['isDeleted: { _eq: false }']

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
    aggregateQueries.push(`
      ${d.key}Count: ${entityName}Aggregate(
        where: { isDeleted: { _eq: false } }
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
}): Promise<
  Record<
    string,
    {
      options: Array<{ id: string; label: string }>
      totalCount: number
    }
  >
> => {
  const { graphqlClient, entityName, descriptors, searchByKey, limit } = args

  const query = buildCombinedFilterGroupsQuery({ entityName, descriptors, searchByKey, limit })
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
}

/**
 * Generic WHERE condition builder that eliminates duplication across query files.
 * Handles: isDeleted, IDs filter, standard filters (via descriptors), search (via descriptors), and custom conditions.
 * Returns GraphQL object (for use with GraphQL variables).
 */
export const buildWhere = (options: BuildWhereOptions): Record<string, any> => {
  const { variables, descriptors, ids, customConditions = [], isDeleted = true } = options

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

  // Search via descriptors (using buildSearch)
  const searchObj = buildSearch(normalizedVariables.search, descriptors)
  if (searchObj?._or) {
    if (whereObj._and) {
      whereObj._and.push(searchObj)
    } else {
      whereObj._or = searchObj._or
    }
  }

  return whereObj
}

// (Intentionally no entity-specific descriptors below this point)
