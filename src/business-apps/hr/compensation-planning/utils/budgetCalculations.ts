import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type {
  CompensationCycleCompany,
  CompensationEmployeeProposal,
  DistributionMethod
} from '../types/compensationPlanningTypes'

export function resolveAbsoluteBudget(
  budgetType: 'absolute' | 'percentage',
  budgetValue: number,
  currentCost: number
): number {
  if (budgetType === 'percentage') {
    return (currentCost * budgetValue) / 100
  }
  return budgetValue
}

export function computeCompanyBudgetSummary(company: CompensationCycleCompany) {
  const salaryBudget = resolveAbsoluteBudget(
    company.salaryBudgetType,
    company.salaryBudgetValue,
    company.currentTotalSalaryCost
  )
  const bonusBudget = resolveAbsoluteBudget(
    company.bonusBudgetType,
    company.bonusBudgetValue,
    company.currentTotalSalaryCost
  )
  const benefitsBudget = resolveAbsoluteBudget(
    company.benefitsBudgetType,
    company.benefitsBudgetValue,
    company.currentTotalBenefitsCost
  )
  return { salaryBudget, bonusBudget, benefitsBudget, total: salaryBudget + bonusBudget + benefitsBudget }
}

/**
 * Inputs for {@link distributeToOrgUnits} (headcount, salary mass, optional performance weight per org unit).
 *
 * **Performance (department score):** For each employee we read `performanceOverallScore` (same “overall score” as
 * Performance Evaluation). For each department, `totalPerformanceScore` is the **sum** of those scores; the preview
 * uses weight_i = totalPerformanceScore_i / sum_j(totalPerformanceScore_j) and allocation_i = pool × weight_i.
 */
export interface OrgUnitDistributionInput {
  orgUnitId: string
  orgUnitName: string
  headcount: number
  currentTotalSalaryCost: number
  /** Sum of employee `performanceOverallScore` values in this department; drives `performance_weighted` weights. */
  totalPerformanceScore: number
  /** Mean of employee overall scores (for display only). */
  averagePerformanceRating: number | null
}

/**
 * Resolves the company **salary increase pool** (absolute amount) from `compensation_budget_plan_company`
 * amount/percent fields vs current total salary cost baseline.
 *
 * When both amount and percent are stored (e.g. budget setup syncs them from the same intent), prefer
 * **`salaryBudgetAmount`**: recomputing `baseline × percent / 100` uses rounded percent and the snapshot
 * baseline and can drift from the amount the user entered (e.g. 500 000 → 499 983.12).
 */
export function resolveCompanySalaryIncreasePool(args: {
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  currentTotalSalaryCost: number
}): number {
  const baseline = args.currentTotalSalaryCost
  if (args.salaryBudgetAmount > 0) {
    return args.salaryBudgetAmount
  }
  if (args.salaryBudgetPercent > 0 && baseline > 0) {
    return resolveAbsoluteBudget('percentage', args.salaryBudgetPercent, baseline)
  }
  return 0
}

/**
 * Splits `totalBudget` across org units in proportion to non-negative weights.
 * Uses integer cents + largest remainder so displayed amounts sum to `totalBudget` (no 1-cent drift from float rounding).
 */
function allocateProportionalToWeights(
  totalBudget: number,
  orgUnits: OrgUnitDistributionInput[],
  weightFor: (ou: OrgUnitDistributionInput) => number
): Map<string, number> {
  const result = new Map<string, number>()
  if (orgUnits.length === 0) return result

  const weights = orgUnits.map(ou => Math.max(0, weightFor(ou)))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight <= 0) {
    orgUnits.forEach(ou => result.set(ou.orgUnitId, 0))
    return result
  }

  const totalCents = Math.round(totalBudget * 100)
  const baseCents: number[] = []
  const fractionalRemainders: number[] = []

  for (let i = 0; i < orgUnits.length; i++) {
    const exact = (weights[i] / totalWeight) * totalCents
    const floorCents = Math.floor(exact)
    baseCents.push(floorCents)
    fractionalRemainders.push(exact - floorCents)
  }

  const distributed = baseCents.reduce((a, b) => a + b, 0)
  const leftover = totalCents - distributed

  const indices = orgUnits.map((_, i) => i)
  indices.sort((a, b) => {
    const diff = fractionalRemainders[b] - fractionalRemainders[a]
    if (diff !== 0) return diff
    return a - b
  })

  for (let k = 0; k < leftover; k++) {
    baseCents[indices[k]] += 1
  }

  orgUnits.forEach((ou, i) => {
    result.set(ou.orgUnitId, baseCents[i] / 100)
  })
  return result
}

/**
 * Preview split of the salary increase pool across org units.
 *
 * - **equal** — same total per org unit (500k / 3 → three shares that sum to exactly 500k).
 * - **proportional_headcount** — share of the pool ∝ headcount (e.g. 30:20:10 → 30/60, 20/60, 10/60 of 500k).
 *   Same as “equal per employee” within the company: each unit gets `headcount × (pool / total headcount)`.
 * - **performance_weighted** — department weight = sum of employee overall performance scores; pool split by those weights.
 */
export function distributeToOrgUnits(
  totalBudget: number,
  orgUnits: OrgUnitDistributionInput[],
  method: DistributionMethod
): Map<string, number> {
  const result = new Map<string, number>()
  if (orgUnits.length === 0) return result

  switch (method) {
    case 'equal':
      return allocateProportionalToWeights(totalBudget, orgUnits, () => 1)
    case 'proportional_headcount':
      return allocateProportionalToWeights(totalBudget, orgUnits, ou => ou.headcount)
    case 'proportional_salary_cost':
      return allocateProportionalToWeights(totalBudget, orgUnits, ou => ou.currentTotalSalaryCost)
    case 'performance_weighted': {
      const ratedPositive = orgUnits.filter(ou => ou.totalPerformanceScore > 0)
      if (ratedPositive.length === 0) {
        return distributeToOrgUnits(totalBudget, orgUnits, 'proportional_headcount')
      }
      return allocateProportionalToWeights(totalBudget, orgUnits, ou =>
        ou.totalPerformanceScore > 0 ? ou.totalPerformanceScore : 0
      )
    }
    case 'custom':
    default:
      orgUnits.forEach(ou => result.set(ou.orgUnitId, 0))
      break
  }

  return result
}

export function computeOrgUnitAllocatedAmount(proposals: CompensationEmployeeProposal[]): {
  salary: number
  bonus: number
  benefits: number
} {
  return proposals.reduce(
    (acc, p) => ({
      salary: acc.salary + (p.proposedSalaryIncrease ?? 0),
      bonus: acc.bonus + (p.proposedBonus ?? 0),
      benefits: acc.benefits + (p.proposedBenefitsChange ?? 0)
    }),
    { salary: 0, bonus: 0, benefits: 0 }
  )
}

export function computeCompaRatio(
  currentSalary: number | null,
  band: { minSalary: number; maxSalary: number } | null
): number | null {
  if (currentSalary == null || !band || band.maxSalary === 0) return null
  const midpoint = (band.minSalary + band.maxSalary) / 2
  if (midpoint === 0) return null
  return Math.round((currentSalary / midpoint) * 100) / 100
}

function resolveLocale(): string {
  try {
    return getCurrentActiveUserLocale() || 'en-US'
  } catch {
    return 'en-US'
  }
}

/**
 * `value` is a percentage points number (e.g. 5.5 for 5.5%), not 0–1.
 * Uses locale for number shape, sign, and percent sign placement.
 */
export function formatPercent(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '-'
  const locale = resolveLocale()
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      signDisplay: 'exceptZero',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100)
  } catch {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${Math.abs(value).toFixed(1)}%`
  }
}

export function computeNewSalaryFromIncrease(
  currentAnnual: number | null,
  increaseAmount: number | null,
  increasePercent: number | null
): { newSalary: number | null; increase: number | null; percent: number | null } {
  if (currentAnnual == null || currentAnnual === 0) {
    return { newSalary: null, increase: null, percent: null }
  }

  if (increaseAmount != null && increaseAmount !== 0) {
    return {
      newSalary: currentAnnual + increaseAmount,
      increase: increaseAmount,
      percent: (increaseAmount / currentAnnual) * 100
    }
  }

  if (increasePercent != null && increasePercent !== 0) {
    const amount = (currentAnnual * increasePercent) / 100
    return {
      newSalary: currentAnnual + amount,
      increase: amount,
      percent: increasePercent
    }
  }

  return { newSalary: currentAnnual, increase: 0, percent: 0 }
}
