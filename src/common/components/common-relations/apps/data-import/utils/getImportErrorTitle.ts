import type { ImportStep } from '../types/importTypes'

const IMPORT_ERROR_TITLE_KEYS: Record<ImportStep, string> = {
  upload: 'import-error-analysis-title',
  mapping: 'import-error-mapping-title',
  result: 'import-error-result-title',
  ownership: 'import-error-ownership-title'
}

/** Translation keys for import error card titles, depending on which import step failed. */
export function getImportErrorTitleKey(step: ImportStep): string {
  return IMPORT_ERROR_TITLE_KEYS[step]
}
