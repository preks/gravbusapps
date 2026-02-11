/**
 * Schema Generator Service
 *
 * Transforms AI analysis results into complete SpreadsheetApp schemas
 * ready for rendering and storage.
 */

import type {
  ParsedExcelFile,
  ParsedSheet,
  SpreadsheetAnalysis,
  SheetAnalysis,
  ColumnAnalysis,
  SpreadsheetApp,
  SpreadsheetSheet,
  SpreadsheetColumn,
  SpreadsheetFileInfo,
  SheetView,
  SheetSettings,
  AppSettings,
  SelectOption,
  ChartConfig,
  ViewType
} from '../types'

/**
 * Generate a complete SpreadsheetApp from parsed Excel and AI analysis
 */
export function generateAppSchema(
  parsedFile: ParsedExcelFile,
  analysis: SpreadsheetAnalysis,
  userId: string,
  fileInfo?: { fileId: string; uploadedAt: string }
): Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'> {
  const sheets = analysis.sheets.map((sheetAnalysis, index) => {
    const parsedSheet = parsedFile.sheets[index]
    return generateSheetSchema(sheetAnalysis, parsedSheet)
  })

  const sourceFile: SpreadsheetFileInfo = {
    fileId: fileInfo?.fileId || `local_${Date.now()}`,
    fileName: parsedFile.fileName,
    fileSize: parsedFile.fileSize,
    uploadedAt: fileInfo?.uploadedAt || new Date().toISOString(),
    mimeType: getMimeType(parsedFile.fileName)
  }

  return {
    name: analysis.suggestedAppName,
    description: generateAppDescription(analysis),
    icon: selectAppIcon(analysis),
    sourceFile,
    sheets,
    relationships: analysis.relationships,
    createdBy: userId,
    status: 'file_based',
    settings: generateAppSettings()
  }
}

/**
 * Generate an empty SpreadsheetApp schema (no Excel file required)
 */
export function generateEmptyAppSchema(
  appName: string,
  userId: string,
  sheetName: string = 'Sheet1'
): Omit<SpreadsheetApp, 'id' | 'createdAt' | 'updatedAt'> {
  // Create default columns (A-Z like Excel - 26 columns)
  // This gives users a proper Excel-like experience with enough columns to work with
  const columnLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const defaultColumns: SpreadsheetColumn[] = columnLetters.map((letter, index) => ({
    id: generateId('col'),
    name: `column_${letter.toLowerCase()}`,
    label: `Column ${letter}`,
    type: 'text' as const,
    width: 100,
    isVisible: true,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: index
  }))

  // Create default empty rows (1 row to start with - bulk collection/automation adds real data)
  const defaultRows = Array.from({ length: 1 }, () => {
    const row: Record<string, unknown> = { _id: generateId('row') }
    columnLetters.forEach(letter => {
      row[`column_${letter.toLowerCase()}`] = ''
    })
    return row
  })

  // Create default table view
  const defaultView: SheetView = {
    id: generateId('view'),
    name: 'All Data',
    type: 'table',
    isDefault: true,
    config: {
      type: 'table',
      columns: defaultColumns.map(c => c.id)
    }
  }

  // Create sheet with default columns and rows
  const sheet: SpreadsheetSheet = {
    id: generateId('sheet'),
    name: sheetName,
    description: '',
    viewType: 'table',
    columns: defaultColumns,
    views: [defaultView],
    data: defaultRows,
    settings: {
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowExport: true,
      allowImport: true,
      rowsPerPage: 25,
      showRowNumbers: true
    }
  }

  // Create a placeholder source file info
  const sourceFile: SpreadsheetFileInfo = {
    fileId: `empty_${Date.now()}`,
    fileName: 'Empty Spreadsheet',
    fileSize: 0,
    uploadedAt: new Date().toISOString(),
    mimeType: 'application/json'
  }

  return {
    name: appName,
    description: '',
    icon: undefined,
    sourceFile,
    sheets: [sheet],
    relationships: [],
    createdBy: userId,
    status: 'file_based',
    settings: generateAppSettings()
  }
}

/**
 * Generate schema for a single sheet
 */
function generateSheetSchema(analysis: SheetAnalysis, parsedSheet: ParsedSheet): SpreadsheetSheet {
  const columns = analysis.columns.map((col, index) => generateColumnSchema(col, index, parsedSheet))

  // Determine primary view type based on suggestions
  const primaryViewType = analysis.suggestedViews[0]?.type || 'table'

  // Generate views from analysis
  const views = analysis.suggestedViews.map((suggestion, index) => generateViewSchema(suggestion, columns, index === 0))

  // Ensure at least a table view exists
  if (!views.some(v => v.type === 'table')) {
    views.unshift({
      id: generateId('view'),
      name: 'All Data',
      type: 'table',
      isDefault: true,
      config: {
        type: 'table',
        columns: columns.map(c => c.id)
      }
    })
  }

  // Transform data to include row IDs
  const data = parsedSheet.rows.map((row, index) => ({
    _id: generateId('row'),
    _index: index,
    ...row
  }))

  // Generate chart configs if dashboard view is suggested
  const chartConfigs = generateChartConfigs(analysis, columns)

  return {
    id: generateId('sheet'),
    name: analysis.name,
    description: analysis.purpose,
    viewType: primaryViewType,
    columns,
    views,
    data,
    chartConfigs,
    settings: generateSheetSettings(analysis)
  }
}

/**
 * Generate schema for a single column
 */
function generateColumnSchema(analysis: ColumnAnalysis, index: number, parsedSheet: ParsedSheet): SpreadsheetColumn {
  const parsedColumn = parsedSheet.columns.find(c => c.name === analysis.name)

  // Generate select options if detected
  let selectOptions: SelectOption[] | undefined
  if (analysis.selectOptions && analysis.selectOptions.length > 0) {
    selectOptions = analysis.selectOptions.map(opt => ({
      value: opt.toLowerCase().replace(/\s+/g, '_'),
      label: opt,
      color: generateColorForOption(opt)
    }))
  }

  return {
    id: generateId('col'),
    name: analysis.name,
    label: formatColumnLabel(analysis.name),
    type: analysis.detectedType,
    width: calculateColumnWidth(analysis),
    isVisible: true,
    isEditable: analysis.detectedType !== 'calculated',
    isRequired: analysis.isRequired,
    isUnique: analysis.isUnique,
    defaultValue: getDefaultValue(analysis.detectedType),
    selectOptions,
    validation: analysis.validation,
    formula: parsedColumn?.formula || analysis.formula,
    order: index
  }
}

/**
 * Generate view schema from suggestion
 */
function generateViewSchema(
  suggestion: { type: ViewType; name: string; description: string; config: any },
  columns: SpreadsheetColumn[],
  isDefault: boolean
): SheetView {
  return {
    id: generateId('view'),
    name: suggestion.name,
    type: suggestion.type,
    isDefault,
    config: {
      ...suggestion.config,
      // Ensure columns reference actual column IDs for table views
      columns: suggestion.config.type === 'table' ? columns.map(c => c.id) : suggestion.config.columns
    }
  }
}

/**
 * Generate chart configurations based on analysis
 */
function generateChartConfigs(analysis: SheetAnalysis, columns: SpreadsheetColumn[]): ChartConfig[] | undefined {
  const dashboardView = analysis.suggestedViews.find(v => v.type === 'dashboard')
  if (!dashboardView || dashboardView.config.type !== 'dashboard') {
    return undefined
  }

  const numericColumns = columns.filter(c => ['number', 'currency', 'percentage'].includes(c.type))

  const categoryColumns = columns.filter(c => ['select', 'text'].includes(c.type))

  const charts: ChartConfig[] = []

  // Create a bar chart if we have category and numeric columns
  if (categoryColumns.length > 0 && numericColumns.length > 0) {
    charts.push({
      id: generateId('chart'),
      type: 'bar',
      title: `${numericColumns[0].label} by ${categoryColumns[0].label}`,
      xAxis: { column: categoryColumns[0].id, label: categoryColumns[0].label },
      yAxis: { column: numericColumns[0].id, label: numericColumns[0].label },
      aggregation: 'sum'
    })
  }

  // Create a pie chart for category distribution
  if (categoryColumns.length > 0) {
    charts.push({
      id: generateId('chart'),
      type: 'pie',
      title: `${categoryColumns[0].label} Distribution`,
      xAxis: { column: categoryColumns[0].id, label: categoryColumns[0].label },
      yAxis: { column: categoryColumns[0].id, label: 'Count' },
      aggregation: 'count'
    })
  }

  // Create a line chart if there's a date column
  const dateColumn = columns.find(c => ['date', 'datetime'].includes(c.type))
  if (dateColumn && numericColumns.length > 0) {
    charts.push({
      id: generateId('chart'),
      type: 'line',
      title: `${numericColumns[0].label} Over Time`,
      xAxis: { column: dateColumn.id, label: dateColumn.label },
      yAxis: { column: numericColumns[0].id, label: numericColumns[0].label },
      aggregation: 'sum'
    })
  }

  return charts.length > 0 ? charts : undefined
}

/**
 * Generate sheet settings
 */
function generateSheetSettings(analysis: SheetAnalysis): SheetSettings {
  return {
    allowAdd: !analysis.isLookupTable,
    allowEdit: true,
    allowDelete: !analysis.isLookupTable,
    allowExport: true,
    allowImport: true,
    rowsPerPage: 25,
    showRowNumbers: true
  }
}

/**
 * Generate app settings
 */
function generateAppSettings(): AppSettings {
  return {
    allowPublicAccess: false,
    requireAuthentication: true
  }
}

/**
 * Generate app description from analysis
 */
function generateAppDescription(analysis: SpreadsheetAnalysis): string {
  const purposes = analysis.sheets
    .map(s => s.purpose)
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, 3)

  if (purposes.length === 1) {
    return purposes[0]
  }

  return `Multi-sheet app for ${purposes.join(', ').toLowerCase()}`
}

/**
 * Select appropriate icon based on analysis
 */
function selectAppIcon(analysis: SpreadsheetAnalysis): string {
  const allPurposes = analysis.sheets.map(s => s.purpose.toLowerCase()).join(' ')
  const allColumns = analysis.sheets.flatMap(s => s.columns.map(c => c.name.toLowerCase())).join(' ')

  if (allPurposes.includes('sales') || allColumns.includes('revenue') || allColumns.includes('deal')) {
    return '📊'
  }
  if (allPurposes.includes('expense') || allColumns.includes('expense') || allColumns.includes('cost')) {
    return '💰'
  }
  if (allPurposes.includes('employee') || allColumns.includes('employee') || allColumns.includes('staff')) {
    return '👥'
  }
  if (allPurposes.includes('project') || allColumns.includes('project') || allColumns.includes('task')) {
    return '📋'
  }
  if (allPurposes.includes('inventory') || allColumns.includes('stock') || allColumns.includes('quantity')) {
    return '📦'
  }
  if (allPurposes.includes('contact') || allColumns.includes('contact') || allColumns.includes('customer')) {
    return '📇'
  }
  if (allPurposes.includes('budget') || allColumns.includes('budget')) {
    return '📈'
  }
  if (allColumns.includes('date') || allColumns.includes('schedule')) {
    return '📅'
  }

  return '📊'
}

/**
 * Calculate appropriate column width based on type and content
 */
function calculateColumnWidth(analysis: ColumnAnalysis): number {
  switch (analysis.detectedType) {
    case 'date':
      return 120
    case 'datetime':
      return 180
    case 'email':
      return 200
    case 'url':
      return 250
    case 'phone':
      return 140
    case 'boolean':
      return 80
    case 'currency':
    case 'number':
    case 'percentage':
      return 120
    case 'select':
      return 150
    case 'text':
    default:
      // Calculate based on sample value lengths
      const maxLength = Math.max(analysis.name.length, ...analysis.sampleValues.map(v => String(v || '').length))
      return Math.min(Math.max(maxLength * 8, 100), 300)
  }
}

/**
 * Format column name as human-readable label
 */
function formatColumnLabel(name: string): string {
  return (
    name
      // Handle camelCase
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Handle snake_case
      .replace(/_/g, ' ')
      // Handle kebab-case
      .replace(/-/g, ' ')
      // Capitalize first letter of each word
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim()
  )
}

/**
 * Get default value for column type
 */
function getDefaultValue(type: string): unknown {
  switch (type) {
    case 'boolean':
      return false
    case 'number':
    case 'currency':
    case 'percentage':
      return null
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return ''
    case 'date':
    case 'datetime':
      return null
    case 'select':
    case 'multiselect':
      return null
    default:
      return null
  }
}

/**
 * Generate a color for a select option
 */
function generateColorForOption(option: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
    '#84cc16', // lime
    '#6366f1' // indigo
  ]

  // Generate consistent color based on option string
  let hash = 0
  for (let i = 0; i < option.length; i++) {
    hash = option.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Get MIME type from file name
 */
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  switch (ext) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'csv':
      return 'text/csv'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Update app schema with user customizations
 */
export function updateAppWithCustomizations(
  app: SpreadsheetApp,
  customizations: {
    name?: string
    description?: string
    icon?: string
    columns?: Record<string, Partial<SpreadsheetColumn>>
    views?: Record<string, Partial<SheetView>>
  }
): SpreadsheetApp {
  const updatedApp = { ...app }

  if (customizations.name) {
    updatedApp.name = customizations.name
  }

  if (customizations.description) {
    updatedApp.description = customizations.description
  }

  if (customizations.icon) {
    updatedApp.icon = customizations.icon
  }

  if (customizations.columns) {
    updatedApp.sheets = updatedApp.sheets.map(sheet => ({
      ...sheet,
      columns: sheet.columns.map(col => {
        const colCustomization = customizations.columns?.[col.id]
        return colCustomization ? { ...col, ...colCustomization } : col
      })
    }))
  }

  if (customizations.views) {
    updatedApp.sheets = updatedApp.sheets.map(sheet => ({
      ...sheet,
      views: sheet.views.map(view => {
        const viewCustomization = customizations.views?.[view.id]
        return viewCustomization ? { ...view, ...viewCustomization } : view
      })
    }))
  }

  return updatedApp
}

/**
 * Validate app schema
 */
export function validateAppSchema(app: SpreadsheetApp): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!app.name || app.name.trim().length === 0) {
    errors.push('App name is required')
  }

  if (!app.sheets || app.sheets.length === 0) {
    errors.push('At least one sheet is required')
  }

  for (const sheet of app.sheets) {
    if (!sheet.name || sheet.name.trim().length === 0) {
      errors.push(`Sheet name is required`)
    }

    if (!sheet.columns || sheet.columns.length === 0) {
      errors.push(`Sheet "${sheet.name}" must have at least one column`)
    }

    if (!sheet.views || sheet.views.length === 0) {
      errors.push(`Sheet "${sheet.name}" must have at least one view`)
    }

    // Check for duplicate column IDs
    const columnIds = sheet.columns.map(c => c.id)
    const duplicateIds = columnIds.filter((id, i) => columnIds.indexOf(id) !== i)
    if (duplicateIds.length > 0) {
      errors.push(`Sheet "${sheet.name}" has duplicate column IDs: ${duplicateIds.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
