export type CycleStatus =
  | 'draft'
  | 'budget_setup'
  | 'distribution'
  | 'manager_planning'
  | 'under_review'
  | 'approved'
  | 'executed'

export type BudgetType = 'absolute' | 'percentage'

export type ProposalStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'sent_back' | 'executed'

export type DistributionMethod =
  | 'proportional_headcount'
  | 'proportional_salary_cost'
  | 'performance_weighted'
  | 'equal'
  | 'custom'

export interface CompensationPlanningCycle {
  id: string
  name: string
  description: string
  fiscalYear: number
  planningStartDate: string
  planningEndDate: string
  effectiveDate: string
  status: CycleStatus
  companies: CompensationCycleCompany[]
  enabledCategories: {
    baseSalary: boolean
    bonus: boolean
    benefits: boolean
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CompensationCycleCompany {
  id: string
  cycleId: string
  companyId: string
  companyName: string
  salaryBudgetType: BudgetType
  salaryBudgetValue: number
  bonusBudgetType: BudgetType
  bonusBudgetValue: number
  benefitsBudgetType: BudgetType
  benefitsBudgetValue: number
  currency: string
  currentTotalSalaryCost: number
  currentTotalBenefitsCost: number
  headcount: number
  averageSalary: number
}

export interface CompensationCycleOrgUnitBudget {
  id: string
  cycleId: string
  companyId: string
  orgUnitId: string
  orgUnitName: string
  salaryBudget: number
  bonusBudget: number
  benefitsBudget: number
  distributionMethod: DistributionMethod
  isLocked: boolean
  headcount: number
  currentTotalSalaryCost: number
  averagePerformanceRating: number | null
  allocatedSalaryAmount: number
  allocatedBonusAmount: number
}

export interface SalarySnapshot {
  annualGrossSalary: number | null
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currencyRef: string
}

export interface CompensationEmployeeProposal {
  id: string
  cycleId: string
  orgUnitBudgetId: string
  employeeId: string
  employeeName: string
  employeeCode: string
  pictureThumbnail?: string

  currentSalarySnapshot: SalarySnapshot
  proposedSalaryIncrease: number | null
  proposedSalaryIncreasePercent: number | null
  proposedNewSalary: number | null

  proposedBonus: number | null
  proposedBonusTypeRef: string | null
  proposedBenefitsChange: number | null

  justification: string

  status: ProposalStatus
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
  jobLevel: string | null
  jobFunction: string | null
  orgUnitName: string | null
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

  performanceRating: string | null
  performanceRatingNumeric: number | null
  performanceCycleName: string | null

  fte: number | null
  weeklyHours: number | null

  currentBonusTotal: number | null
  currentBenefitsTotal: number | null

  proposal?: CompensationEmployeeProposal
}

export interface CycleSummaryStats {
  totalHeadcount: number
  totalCurrentSalaryCost: number
  totalSalaryBudget: number
  totalAllocatedSalary: number
  totalProposedIncrease: number
  averageIncreasePercent: number
  proposalsCount: {
    draft: number
    submitted: number
    approved: number
    rejected: number
    sentBack: number
    executed: number
  }
  currency: string
}

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Draft',
  budget_setup: 'Budget Setup',
  distribution: 'Distribution',
  manager_planning: 'Manager Planning',
  under_review: 'Under Review',
  approved: 'Approved',
  executed: 'Executed'
}

export const CYCLE_STATUS_ORDER: CycleStatus[] = [
  'draft',
  'budget_setup',
  'distribution',
  'manager_planning',
  'under_review',
  'approved',
  'executed'
]

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  sent_back: 'Sent Back',
  executed: 'Executed'
}
