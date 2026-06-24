/**
 * Resolves the owner-employee id to use on the submission payload.
 *
 * When the imported file contains a column like "Owned By" and Flowbot was
 * able to resolve a matching Employee from the system, that per-row value is
 * placed on the entity (under `ownerEmployeeId` or the legacy `ownerEmployee`
 * alias). In that case the file-resolved owner must win — otherwise we'd
 * silently overwrite the user's intent. The currently logged-in importer's
 * employee id is only used as a fallback when the row didn't resolve to a
 * known employee.
 */

export function resolveOwnerEmployeeId(entity: Record<string, any>, ownerEmployeeId?: string): string | undefined {
  if (typeof entity.ownerEmployeeId === 'string' && entity.ownerEmployeeId.length > 0) return entity.ownerEmployeeId
  if (typeof entity.ownerEmployee === 'string' && entity.ownerEmployee.length > 0) return entity.ownerEmployee
  if (ownerEmployeeId) return ownerEmployeeId
  return undefined
}
