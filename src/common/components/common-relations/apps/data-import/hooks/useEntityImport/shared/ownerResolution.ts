/**
 * Resolves the owner-employee id to use on the submission payload, preferring
 * an explicitly passed id, then any value already present on the entity
 * (either `ownerEmployeeId` or the legacy `ownerEmployee` alias).
 */

export function resolveOwnerEmployeeId(entity: Record<string, any>, ownerEmployeeId?: string): string | undefined {
  if (ownerEmployeeId) return ownerEmployeeId
  if (typeof entity.ownerEmployeeId === 'string' && entity.ownerEmployeeId.length > 0) return entity.ownerEmployeeId
  if (typeof entity.ownerEmployee === 'string' && entity.ownerEmployee.length > 0) return entity.ownerEmployee
  return undefined
}
