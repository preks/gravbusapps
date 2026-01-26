/**
 * Spreadsheet Apps Module
 *
 * Excel-to-App: Transform Excel files into instant business applications.
 * This module provides components for uploading, analyzing, and rendering
 * applications generated from spreadsheet data.
 */

// Types
export * from './types'

// Hooks
export { useExcelParser, inferColumnType, getUniqueValues } from './hooks/useExcelParser'
export { useSpreadsheetAI } from './hooks/useSpreadsheetAI'
export { useSpreadsheetApps } from './hooks/useSpreadsheetApps'
export { useDataPromotion } from './hooks/useDataPromotion'

// Services
export { SpreadsheetAppService, createSpreadsheetAppService } from './services/SpreadsheetAppService'
export { generateAppSchema, updateAppWithCustomizations, validateAppSchema } from './services/SchemaGenerator'

// Components
export { ExcelUploader } from './components/ExcelUploader'
export { SheetAnalysisPreview } from './components/SheetAnalysisPreview'
export { AppPreviewCard, NoAppsState } from './components/AppPreviewCard'
export { ColumnTypeEditor } from './components/ColumnTypeEditor'
export { PromoteToDatabaseModal } from './components/PromoteToDatabaseModal'

// Main App Components
export { SpreadsheetAppsHub } from './SpreadsheetAppsHub'
export { SpreadsheetAppViewer } from './SpreadsheetAppViewer'
export { SpreadsheetAppEditor } from './SpreadsheetAppEditor'

// Default export for module registration
export { SpreadsheetAppsHub as default } from './SpreadsheetAppsHub'
