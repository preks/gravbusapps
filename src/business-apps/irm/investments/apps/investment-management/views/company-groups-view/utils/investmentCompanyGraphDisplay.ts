import type { InvestmentCompanyRelationshipDisplayMode } from '../types/companyGroupGraphTypes'

export const isInvestmentCompanyEdgeHidden = (
  mode: InvestmentCompanyRelationshipDisplayMode,
  isHighlighted: boolean,
  hasActiveCompany: boolean,
  hasLockedCompany: boolean
): boolean => {
  if (mode === 'allPercentages') {
    return false
  }

  if (mode === 'hover') {
    return !hasActiveCompany || !isHighlighted
  }

  if (mode === 'locked') {
    return hasLockedCompany && !isHighlighted
  }

  return false
}
