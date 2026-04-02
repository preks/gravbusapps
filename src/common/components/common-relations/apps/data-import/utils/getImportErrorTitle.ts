import type { ImportStep } from '../types/importTypes'

/** User-visible title for the error card, depending on which import step failed. */
export function getImportErrorTitle(step: ImportStep): string {
  if (step === 'mapping') {
    return 'Conversion Failed'
  }
  if (step === 'result') {
    return 'Import Failed'
  }
  return 'Analysis Failed'
}
