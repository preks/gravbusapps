/**
 * Spreadsheet Apps Hooks Index
 */

export { useExcelParser, inferColumnType, getUniqueValues } from './useExcelParser'
export type { UseExcelParserState, UseExcelParserResult } from './useExcelParser'

export { useSpreadsheetApps } from './useSpreadsheetApps'
export type { UseSpreadsheetAppsState, UseSpreadsheetAppsResult } from './useSpreadsheetApps'

export { useSpreadsheetAI } from './useSpreadsheetAI'
export type { UseSpreadsheetAIState, UseSpreadsheetAIResult } from './useSpreadsheetAI'

export { useDataPromotion } from './useDataPromotion'
export type { UseDataPromotionState, UseDataPromotionResult, PromotionStep, PromotionResult, ValidationResult } from './useDataPromotion'

export { useSpreadsheetAppsDatabase } from './useSpreadsheetAppsDatabase'
export type { UseSpreadsheetAppsDatabaseState, UseSpreadsheetAppsDatabaseResult } from './useSpreadsheetAppsDatabase'

export { useEntityDataSource, buildGraphQLWhere } from './useEntityDataSource'
export type { UseEntityDataSourceOptions, UseEntityDataSourceResult } from './useEntityDataSource'
