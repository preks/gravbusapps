import type { CompensationCycleCompany, DistributionMethod } from '../types/compensationPlanningTypes'

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
 * **Performance (department):** `performance_weighted` uses **`averagePerformanceRating`** (mean of employee
 * `performanceOverallScore` in that unit), not the sum, so headcount does not inflate a department’s weight.
 * `totalPerformanceScore` is still the raw sum for reference.
 */
export interface OrgUnitDistributionInput {
  orgUnitId: string
  orgUnitName: string
  headcount: number
  currentTotalSalaryCost: number
  /** Sum of `currentBonusTotal` (YTD) for employees in this org unit; overview / analytics only. */
  currentTotalBonusYtd: number
  /** Sum of employee `performanceOverallScore` in this org unit (not used as the `performance_weighted` weight). */
  totalPerformanceScore: number
  /** Mean of employee overall scores; drives `performance_weighted` weights. */
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

/** Inputs for {@link distributeToEmployees} (per direct report in manager team view). */
export interface EmployeeDistributionInput {
  employeeId: string
  displayName: string
  annualSalary: number
  performanceScore: number
}

function allocateProportionalToEmployeeWeights(
  totalBudget: number,
  employees: EmployeeDistributionInput[],
  weightFor: (e: EmployeeDistributionInput) => number
): Map<string, number> {
  const result = new Map<string, number>()
  if (employees.length === 0) return result

  const weights = employees.map(e => Math.max(0, weightFor(e)))
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight <= 0) {
    employees.forEach(e => result.set(e.employeeId, 0))
    return result
  }

  const totalCents = Math.round(totalBudget * 100)
  const baseCents: number[] = []
  const fractionalRemainders: number[] = []

  for (let i = 0; i < employees.length; i++) {
    const exact = (weights[i] / totalWeight) * totalCents
    const floorCents = Math.floor(exact)
    baseCents.push(floorCents)
    fractionalRemainders.push(exact - floorCents)
  }

  const distributed = baseCents.reduce((a, b) => a + b, 0)
  const leftover = totalCents - distributed

  const indices = employees.map((_, i) => i)
  indices.sort((a, b) => {
    const diff = fractionalRemainders[b] - fractionalRemainders[a]
    if (diff !== 0) return diff
    return a - b
  })

  for (let k = 0; k < leftover; k++) {
    baseCents[indices[k]] += 1
  }

  employees.forEach((e, i) => {
    result.set(e.employeeId, baseCents[i] / 100)
  })
  return result
}

/**
 * Preview split of the manager team salary increase pool across employees (same methods as org-unit
 * distribution except `proportional_headcount` is treated like equal weight per row when passed.
 *
 * For `performance_weighted`, when no employee has a positive score, falls back to **equal** split
 * (manager view does not use headcount-based fallback).
 */
export function distributeToEmployees(
  totalBudget: number,
  employees: EmployeeDistributionInput[],
  method: DistributionMethod
): Map<string, number> {
  const result = new Map<string, number>()
  if (employees.length === 0) return result

  switch (method) {
    case 'equal':
      return allocateProportionalToEmployeeWeights(totalBudget, employees, () => 1)
    case 'proportional_headcount':
      return allocateProportionalToEmployeeWeights(totalBudget, employees, () => 1)
    case 'proportional_salary_cost':
      return allocateProportionalToEmployeeWeights(totalBudget, employees, e => e.annualSalary)
    case 'performance_weighted': {
      const ratedPositive = employees.filter(e => e.performanceScore > 0)
      if (ratedPositive.length === 0) {
        return allocateProportionalToEmployeeWeights(totalBudget, employees, () => 1)
      }
      return allocateProportionalToEmployeeWeights(totalBudget, employees, e => Math.max(0, e.performanceScore))
    }
    case 'custom':
    default:
      employees.forEach(e => result.set(e.employeeId, 0))
      return result
  }
}

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
      const weight = (ou: OrgUnitDistributionInput) => Math.max(0, ou.averagePerformanceRating ?? 0)
      const ratedPositive = orgUnits.filter(ou => weight(ou) > 0)
      if (ratedPositive.length === 0) {
        return distributeToOrgUnits(totalBudget, orgUnits, 'proportional_headcount')
      }
      return allocateProportionalToWeights(totalBudget, orgUnits, weight)
    }
    case 'custom':
    default:
      orgUnits.forEach(ou => result.set(ou.orgUnitId, 0))
      break
  }

  return result
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
