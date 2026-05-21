export interface EligibilitySettings {
  standard: boolean
  company_id: string
  allowed_countries: string[]
  allowed_contract_types: string[]
  allowed_employment_types: string[]
}

export interface CompanyOption {
  id: string
  name: string
}

const compareStrings = (x: string, y: string) => x.localeCompare(y)

const setsEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort(compareStrings)
  const sortedB = [...b].sort(compareStrings)
  return sortedA.every((value, index) => value === sortedB[index])
}

export const hasIdenticalEligibility = (a: EligibilitySettings, b: EligibilitySettings): boolean =>
  a.standard === b.standard &&
  a.company_id === b.company_id &&
  setsEqual(a.allowed_countries, b.allowed_countries) &&
  setsEqual(a.allowed_contract_types, b.allowed_contract_types) &&
  setsEqual(a.allowed_employment_types, b.allowed_employment_types)

const arraysOverlap = (a: string[], b: string[]): boolean => {
  if (a.length === 0 || b.length === 0) return true
  return a.some(item => b.includes(item))
}

const companyDimensionsOverlap = (a: EligibilitySettings, b: EligibilitySettings): boolean => {
  const aIsAll = !a.standard && a.company_id === ''
  const bIsAll = !b.standard && b.company_id === ''
  if (aIsAll || bIsAll) return true
  if (a.standard && b.standard) return true
  if (a.company_id && b.company_id) return a.company_id === b.company_id
  return true
}

export const haveOverlappingEligibility = (a: EligibilitySettings, b: EligibilitySettings): boolean =>
  companyDimensionsOverlap(a, b) &&
  arraysOverlap(a.allowed_countries, b.allowed_countries) &&
  arraysOverlap(a.allowed_contract_types, b.allowed_contract_types) &&
  arraysOverlap(a.allowed_employment_types, b.allowed_employment_types)

/**
 * Returns how many dimensions are explicitly constrained in a rule (0–4).
 * A higher score means a more specific (narrower) rule.
 */
export const getEligibilitySpecificity = (settings: EligibilitySettings): number => {
  let score = 0
  if (settings.standard || settings.company_id !== '') score++
  if (settings.allowed_countries.length > 0) score++
  if (settings.allowed_contract_types.length > 0) score++
  if (settings.allowed_employment_types.length > 0) score++
  return score
}

/**
 * Returns true if rule A is strictly more specific than rule B —
 * meaning every employee who matches A also matches B, but A adds
 * at least one extra constraint. Rules with this relationship are
 * NOT conflicts; the more specific one takes precedence.
 */
export const isMoreSpecificThan = (a: EligibilitySettings, b: EligibilitySettings): boolean => {
  if (getEligibilitySpecificity(a) <= getEligibilitySpecificity(b)) return false
  return haveOverlappingEligibility(a, b)
}

/**
 * Returns true when two sets of policy_rule_category strings share at
 * least one category — meaning both policies define a rule for the same
 * dimension (e.g. both define MIN_DURATION). Only then can they conflict.
 */
export const policyHasSharedCategory = (categoriesA: string[], categoriesB: string[]): boolean =>
  categoriesA.some(c => categoriesB.includes(c))

export interface EligibilityLabel {
  id: string
  label: string
}

export interface EligibilityOverlapDimension {
  label: string
  value: string
}

type OverlapLabels = {
  companies: EligibilityLabel[]
  countries: EligibilityLabel[]
  contractTypes: EligibilityLabel[]
  employmentTypes: EligibilityLabel[]
  allLabel: string
  standardLabel: string
}

const resolveLabel = (id: string, list: EligibilityLabel[]): string => list.find(x => x.id === id)?.label ?? id

const resolveIds = (ids: string[], list: EligibilityLabel[], allLabel: string): string =>
  ids.length === 0 ? allLabel : ids.map(id => resolveLabel(id, list)).join(', ')

const getSharedIds = (aIds: string[], bIds: string[]): string[] => {
  if (aIds.length === 0) return bIds
  if (bIds.length === 0) return aIds
  return aIds.filter(id => bIds.includes(id))
}

const pushArrayOverlapDim = (
  dims: EligibilityOverlapDimension[],
  label: string,
  aIds: string[],
  bIds: string[],
  list: EligibilityLabel[],
  allLabel: string
): void => {
  if (aIds.length === 0 && bIds.length === 0) {
    dims.push({ label, value: allLabel })
    return
  }
  const shared = getSharedIds(aIds, bIds)
  if (shared.length > 0) {
    dims.push({ label, value: resolveIds(shared, list, allLabel) })
  }
}

const pushCompanyOverlapDim = (
  dims: EligibilityOverlapDimension[],
  a: EligibilitySettings,
  b: EligibilitySettings,
  labels: OverlapLabels
): void => {
  const aIsAll = !a.standard && a.company_id === ''
  const bIsAll = !b.standard && b.company_id === ''
  if (aIsAll && bIsAll) {
    dims.push({ label: 'Company', value: labels.allLabel })
  } else if (a.standard && b.standard) {
    dims.push({ label: 'Company', value: labels.standardLabel })
  } else if (!aIsAll && !bIsAll && a.company_id === b.company_id) {
    dims.push({ label: 'Company', value: resolveLabel(a.company_id, labels.companies) })
  } else if (aIsAll || bIsAll) {
    const specific = aIsAll ? b : a
    const specificValue = specific.standard ? labels.standardLabel : resolveLabel(specific.company_id, labels.companies)
    dims.push({ label: 'Company', value: specificValue })
  }
}

/**
 * Returns the dimensions that are shared / overlapping between two rules,
 * with human-readable labels resolved from the provided lookup arrays.
 * Empty arrays mean "applies to all", so two "all" values also overlap.
 */
export const getOverlappingConditions = (
  a: EligibilitySettings,
  b: EligibilitySettings,
  labels: OverlapLabels
): EligibilityOverlapDimension[] => {
  const dims: EligibilityOverlapDimension[] = []
  pushCompanyOverlapDim(dims, a, b, labels)
  pushArrayOverlapDim(dims, 'Country', a.allowed_countries, b.allowed_countries, labels.countries, labels.allLabel)
  pushArrayOverlapDim(
    dims,
    'Contract Type',
    a.allowed_contract_types,
    b.allowed_contract_types,
    labels.contractTypes,
    labels.allLabel
  )
  pushArrayOverlapDim(
    dims,
    'Employment Type',
    a.allowed_employment_types,
    b.allowed_employment_types,
    labels.employmentTypes,
    labels.allLabel
  )
  return dims
}

/**
 * Given a list of entries with their eligibility settings, returns only
 * the entries whose specificity score is the highest among the group.
 * When a profile matches both a broad rule and a narrow rule, only the
 * narrow rule is returned.
 */
export const filterMostSpecific = <T>(entries: T[], getSettings: (entry: T) => EligibilitySettings): T[] => {
  if (entries.length <= 1) return entries
  const scores = entries.map(e => getEligibilitySpecificity(getSettings(e)))
  const maxScore = Math.max(...scores)
  return entries.filter((_, i) => scores[i] === maxScore)
}

const profileArrayMatches = (profileIds: string[] | undefined, ruleIds: string[]): boolean => {
  if (!profileIds || profileIds.length === 0) return true
  return ruleIds.length === 0 || profileIds.some(id => ruleIds.includes(id))
}

export const matchesEligibilityProfile = (
  rule: EligibilitySettings,
  profile: Partial<EligibilitySettings>
): boolean => {
  if (profile.company_id && rule.company_id !== '' && rule.company_id !== profile.company_id) return false
  if (profile.standard && !rule.standard && rule.company_id !== '') return false
  if (!profileArrayMatches(profile.allowed_countries, rule.allowed_countries)) return false
  if (!profileArrayMatches(profile.allowed_contract_types, rule.allowed_contract_types)) return false
  if (!profileArrayMatches(profile.allowed_employment_types, rule.allowed_employment_types)) return false
  return true
}
