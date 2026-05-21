/**
 * Stable batch `operationId` prefix helper shared by viewer pipelines (Phase 3 batch routing).
 */
export const createSpreadsheetMutationOperationId = (prefix: string): string => {
  try {
    return `${prefix}_${crypto.randomUUID()}`
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}
