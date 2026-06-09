import type {
  ChipCellValue,
  CurrencyCellValue,
  InteractiveTableColumn,
  InteractiveTableData,
  InteractiveTableDataType
} from '../../../types/models'

type RawRow = Record<string, unknown>
export type TableCell = string | number | boolean | ChipCellValue | ChipCellValue[] | CurrencyCellValue | null

const AMOUNT_KEY_PATTERN = /(?:amount|salary|revenue|value)$/i
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function entityLabel(obj: Record<string, unknown>): string {
  const name = obj.name
  if (typeof name === 'string' && name.trim()) {
    return name.trim()
  }
  const first = typeof obj.firstName === 'string' ? obj.firstName : ''
  const last = typeof obj.lastName === 'string' ? obj.lastName : ''
  const full = `${first} ${last}`.trim()
  if (full) {
    return full
  }
  for (const key of ['title', 'value', 'email']) {
    const candidate = obj[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }
  return typeof obj.id === 'string' ? obj.id : ''
}

function resolveCurrencyUnit(row: RawRow): string {
  const currency = row.currency
  if (isPlainObject(currency) && typeof currency.code === 'string' && currency.code.trim()) {
    return currency.code.trim().toUpperCase()
  }
  const ref = row.currencyRef
  if (typeof ref === 'string') {
    const tail = ref.split(':').pop() ?? ''
    if (tail.length === 3) {
      return tail.toUpperCase()
    }
  }
  return 'EUR'
}

function valueByPath(row: RawRow, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (isPlainObject(acc)) {
      return acc[key]
    }
    return undefined
  }, row)
}

function chipFromObject(obj: Record<string, unknown>): ChipCellValue | null {
  const id = obj.id
  if (typeof id !== 'string' || !id) {
    return null
  }
  return { id, label: entityLabel(obj) }
}

function cellForColumn(column: InteractiveTableColumn, row: RawRow, rowEntityIdColumn: string | undefined): TableCell {
  const value = valueByPath(row, column.id)

  if (column.dataType === 'chip') {
    if (isPlainObject(value)) {
      return chipFromObject(value)
    }
    const idColumn = rowEntityIdColumn ?? 'id'
    const rowId = row[idColumn]
    if (typeof rowId === 'string' && rowId) {
      return { id: rowId, label: entityLabel(row) }
    }
    if (typeof value === 'string') {
      return value
    }
    return null
  }

  if (column.dataType === 'chip_list') {
    if (Array.isArray(value)) {
      const chips = value
        .map(item => {
          if (isPlainObject(item)) {
            if (isPlainObject(item) && Object.keys(item).length === 1) {
              const nested = Object.values(item)[0]
              if (isPlainObject(nested)) {
                return chipFromObject(nested)
              }
            }
            return chipFromObject(item)
          }
          return null
        })
        .filter((chip): chip is ChipCellValue => chip !== null)
      return chips
    }
    return []
  }

  if (column.dataType === 'currency') {
    if (typeof value === 'number') {
      return { value, unit: resolveCurrencyUnit(row) }
    }
    if (isPlainObject(value) && typeof value.value === 'number') {
      const unit = typeof value.unit === 'string' && value.unit.trim() ? value.unit : resolveCurrencyUnit(row)
      return { value: value.value, unit }
    }
    return null
  }

  if (column.dataType === 'number') {
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }

  if (column.dataType === 'boolean') {
    return typeof value === 'boolean' ? value : Boolean(value)
  }

  if (value === null || value === undefined) {
    return null
  }
  if (isPlainObject(value)) {
    if (typeof value.value === 'string') {
      return value.value
    }
    if (typeof value.code === 'string') {
      return value.code
    }
    return JSON.stringify(value)
  }
  return value as TableCell
}

/** Map raw GraphQL rows onto an existing set of interactive-table columns (used for
 * server-side pagination "load more" on a table built by the backend). */
export function mapGraphqlRowsToExistingColumns(
  rawRows: Array<RawRow>,
  columns: InteractiveTableColumn[],
  rowEntityIdColumn: string | undefined
): Array<Record<string, TableCell>> {
  return rawRows.map(row => {
    const mapped: Record<string, TableCell> = {}
    for (const column of columns) {
      mapped[column.id] = cellForColumn(column, row, rowEntityIdColumn)
    }
    return mapped
  })
}

function inferColumn(key: string, sampleValue: unknown): InteractiveTableColumn {
  let dataType: InteractiveTableDataType = 'text'
  if (isPlainObject(sampleValue)) {
    dataType = typeof sampleValue.id === 'string' ? 'chip' : 'text'
  } else if (Array.isArray(sampleValue)) {
    dataType = 'chip_list'
  } else if (typeof sampleValue === 'number') {
    dataType = AMOUNT_KEY_PATTERN.test(key) ? 'currency' : 'number'
  } else if (typeof sampleValue === 'boolean') {
    dataType = 'boolean'
  } else if (typeof sampleValue === 'string' && ISO_DATE_PATTERN.test(sampleValue)) {
    dataType = 'date'
  }
  const header = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
  return {
    id: key,
    header,
    dataType,
    sortable: true,
    filterable: true,
    align: dataType === 'number' || dataType === 'currency' ? 'right' : 'left'
  }
}

/** Build a full InteractiveTableData from raw GraphQL rows (used for chart drill-down
 * panels where the backend has not pre-built the table). */
export function inferTableDataFromGraphqlRows(
  rawRows: Array<RawRow>,
  options: { title: string; description?: string }
): InteractiveTableData {
  const keys: string[] = []
  for (const row of rawRows.slice(0, 20)) {
    for (const key of Object.keys(row)) {
      if (key === '__typename' || keys.includes(key)) {
        continue
      }
      if (row[key] !== null && row[key] !== undefined) {
        keys.push(key)
      }
    }
  }

  const columns = keys.map(key => {
    const sample = rawRows.find(row => row[key] !== null && row[key] !== undefined)?.[key]
    return inferColumn(key, sample)
  })

  const rows = rawRows.map(row => {
    const mapped: Record<string, TableCell> = {}
    for (const column of columns) {
      mapped[column.id] = cellForColumn(column, row, 'id')
    }
    return mapped
  })

  return {
    type: 'interactiveTable',
    title: options.title,
    description: options.description,
    columns,
    rows
  }
}
