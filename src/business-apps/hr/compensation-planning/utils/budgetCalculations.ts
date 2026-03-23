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

interface OrgUnitInput {
  orgUnitId: string
  orgUnitName: string
  headcount: number
  currentTotalSalaryCost: number
  averagePerformanceRating: number | null
}

export function distributeToOrgUnits(
  totalBudget: number,
  orgUnits: OrgUnitInput[],
  method: DistributionMethod
): Map<string, number> {
  const result = new Map<string, number>()
  if (orgUnits.length === 0) return result

  switch (method) {
    case 'equal': {
      const share = totalBudget / orgUnits.length
      orgUnits.forEach(ou => result.set(ou.orgUnitId, Math.round(share * 100) / 100))
      break
    }
    case 'proportional_headcount': {
      const totalHeadcount = orgUnits.reduce((sum, ou) => sum + ou.headcount, 0)
      if (totalHeadcount === 0) {
        orgUnits.forEach(ou => result.set(ou.orgUnitId, 0))
      } else {
        orgUnits.forEach(ou => {
          const share = (ou.headcount / totalHeadcount) * totalBudget
          result.set(ou.orgUnitId, Math.round(share * 100) / 100)
        })
      }
      break
    }
    case 'proportional_salary_cost': {
      const totalCost = orgUnits.reduce((sum, ou) => sum + ou.currentTotalSalaryCost, 0)
      if (totalCost === 0) {
        orgUnits.forEach(ou => result.set(ou.orgUnitId, 0))
      } else {
        orgUnits.forEach(ou => {
          const share = (ou.currentTotalSalaryCost / totalCost) * totalBudget
          result.set(ou.orgUnitId, Math.round(share * 100) / 100)
        })
      }
      break
    }
    case 'performance_weighted': {
      const withRatings = orgUnits.filter(ou => ou.averagePerformanceRating != null)
      if (withRatings.length === 0) {
        return distributeToOrgUnits(totalBudget, orgUnits, 'proportional_headcount')
      }
      const totalWeightedHeadcount = withRatings.reduce(
        (sum, ou) => sum + ou.headcount * (ou.averagePerformanceRating ?? 1),
        0
      )
      if (totalWeightedHeadcount === 0) {
        orgUnits.forEach(ou => result.set(ou.orgUnitId, 0))
      } else {
        orgUnits.forEach(ou => {
          const weight = ou.headcount * (ou.averagePerformanceRating ?? 1)
          const share = (weight / totalWeightedHeadcount) * totalBudget
          result.set(ou.orgUnitId, Math.round(share * 100) / 100)
        })
      }
      break
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

/** Locale-aware integers (pagination, counts, tenure years/months). */
export function formatLocaleInteger(value: number): string {
  return new Intl.NumberFormat(resolveLocale(), {
    maximumFractionDigits: 0
  }).format(value)
}

/** Locale-aware decimals (e.g. compa ratio). */
export function formatLocaleDecimal(value: number, minFractionDigits = 2, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(resolveLocale(), {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits
  }).format(value)
}

export function formatCurrency(amount: number | null, currency = 'EUR'): string {
  if (amount == null) return '-'
  const locale = resolveLocale()
  const code = typeof currency === 'string' && currency.length === 3 ? currency : 'EUR'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
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
