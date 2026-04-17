import type { BudgetPlanStatusApi } from './budgetPlanGraphqlEnums'

/** High-level compensation cycle phase (UI), distinct from per-row `BudgetPlanStatusApi`. */
export type CycleStatus =
  | 'draft'
  | 'budget_setup'
  | 'distribution'
  | 'manager_planning'
  | 'under_review'
  | 'approved'
  | 'executed'

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Draft',
  budget_setup: 'Budget setup',
  distribution: 'Distribution',
  manager_planning: 'Manager planning',
  under_review: 'Under review',
  approved: 'Approved',
  executed: 'Executed'
}

export type BudgetType = 'absolute' | 'percentage'

export type DistributionMethod =
  | 'proportional_headcount'
  | 'proportional_salary_cost'
  | 'performance_weighted'
  | 'equal'
  | 'custom'

export interface CompensationEmployeeProposal {
  id: string
  planOrgUnitId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  pictureThumbnail?: string

  proposedSalaryIncrease: number | null
  proposedSalaryIncreasePercent: number | null
  proposedNewSalary: number | null

  proposedBonus: number | null
  proposedBonusTypeRef: string | null

  justification: string

  status: BudgetPlanStatusApi
  submittedBy: string | null
  submittedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  processInstanceId: string | null
}

export interface TeamMemberCompensationData {
  employeeId: string
  employeeCode: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string

  jobPosition: string | null
  jobFunction: string | null
  orgUnitName: string | null
  /** Primary org unit for this position (used for budget distribution aggregation). */
  organizationalUnitId: string | null

  hireDate: string | null

  currentAnnualSalary: number | null
  currentMonthlySalary: number | null
  currentHourlySalary: number | null
  currency: string

  compensationBand: {
    minSalary: number
    maxSalary: number
    payGrade: number | null
  } | null
  compaRatio: number | null

  lastRaiseDate: string | null
  lastRaiseAmount: number | null
  lastRaisePercent: number | null

  fte: number | null
  weeklyHours: number | null

  currentBonusTotal: number | null

  performanceOverallScore?: number | null
  performanceRatingScaleMax?: number | null

  proposal?: CompensationEmployeeProposal
}
