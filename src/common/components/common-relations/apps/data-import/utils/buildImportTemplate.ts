/**
 * Generates a header-only .xlsx import template and triggers a browser download.
 */

import type { ImportAnalyzerContext } from '@/common/components/common-relations/apps/data-import/services'
import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { buildExcelWorkbook, buildFilename, downloadExcelWorkbook } from '@/common/utils/excelExportUtils'
import { buildImportTemplateColumns } from './importTemplateColumns'

export {
  buildImportTemplateColumns,
  humanizeFieldIdentifier,
  simplifyImportTemplateLabel
} from './importTemplateColumns'

export interface DownloadImportTemplateOptions {
  config: ImportConfig
  analyzerContext?: ImportAnalyzerContext
}

export const downloadImportTemplate = async ({
  config,
  analyzerContext
}: DownloadImportTemplateOptions): Promise<void> => {
  const columns = buildImportTemplateColumns(config, analyzerContext)
  const sheetName = sanitizeSheetName(config.flowbotEntityType ?? config.entityType)
  const filenamePrefix = (config.flowbotEntityType ?? config.entityType).replace(/[^\w-]+/g, '-')
  const workbook = buildExcelWorkbook(sheetName, columns, [], 'NEWWORK Import Template')
  const filename = buildFilename(`${filenamePrefix}-import-template`, 'xlsx')
  await downloadExcelWorkbook(workbook, filename)
}

const sanitizeSheetName = (entityType: string): string => {
  const cleaned = entityType.replace(/[^\w-]+/g, ' ').trim() || 'Import'
  return cleaned.slice(0, 31)
}
