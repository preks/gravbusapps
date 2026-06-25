import type { InvestmentCompanyOwnershipUpdate } from '../types/importTypes'

export function formatOwnershipCompanyNames(
  names: string[],
  ids: string[],
  percentages?: (number | null)[],
  unresolvedSuffix = ' (Unresolved)'
): string {
  return names
    .map((name, index) => {
      const percentage = percentages?.[index]
      const percentageSuffix = typeof percentage === 'number' && !Number.isNaN(percentage) ? ` (${percentage}%)` : ''
      const unresolvedLabel = ids[index] ? '' : unresolvedSuffix
      return `${name}${percentageSuffix}${unresolvedLabel}`
    })
    .join(', ')
}

export function summarizeOwnershipUpdates(ownershipUpdates: InvestmentCompanyOwnershipUpdate[]) {
  const relationshipCount = ownershipUpdates.reduce(
    (count, update) => count + update.ownerCompanyNames.length + update.ownedCompanyNames.length,
    0
  )
  const unresolvedCount = ownershipUpdates.reduce((count, update) => {
    const unresolvedOwners = update.ownerCompanyIds.filter(id => !id).length
    const unresolvedOwned = update.ownedCompanyIds.filter(id => !id).length
    return count + unresolvedOwners + unresolvedOwned
  }, 0)

  return { relationshipCount, unresolvedCount }
}
