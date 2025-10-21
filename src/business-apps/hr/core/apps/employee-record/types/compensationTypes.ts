/**
 * TypeScript interfaces for employee compensation data
 *
 * ✅ CONNECTED TO REAL DATABASE TABLES:
 * - EmployeeWorkingCondition (monthly_gross_salary, annually_gross_salary, stock_options)
 * - CompensationBand
 *
 * 🔄 TODO: Create these database tables:
 * - EmployeeBonus
 * - EmployeeBenefit
 * - EmployeePayslip
 */

/**
 * Catalog Entry Interface (used for currency, pay frequency, etc.)
 */
export interface CatalogEntry {
  id: string
  value: string
  code?: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
}

/**
 * Compensation Band Interface
 * Maps to CompensationBand table
 */
export interface CompensationBand {
  id: string
  name: string
  minSalary: number
  maxSalary: number
  payGrade: number
  currencyRef?: string
  currency?: CatalogEntry
}

/**
 * Employee Compensation Interface
 * Derived from EmployeeWorkingCondition table
 */
export interface EmployeeCompensation {
  id: string
  employeeId: string
  baseSalary: number // Maps to annuallyGrossSalary
  currency: CatalogEntry
  payFrequency: CatalogEntry
  compensationBand: CompensationBand | null
  effectiveDate: string // Maps to effectiveFrom
  endDate: string | null // Maps to effectiveTo
  // Additional fields from EmployeeWorkingCondition
  monthlyGrossSalary?: number
  stockOptions?: number
}

/**
 * Employee Bonus Interface
 * 🔄 TODO: Create EmployeeBonus table with these fields
 */
export interface EmployeeBonus {
  id: string
  employeeId: string
  bonusType: CatalogEntry
  amount: number
  currency: CatalogEntry
  paymentDate: string
  fiscalYear: number
  status: string // 'Pending', 'Approved', 'Paid', 'Cancelled'
  description: string
  notes: string
}

/**
 * Employee Benefit Interface
 * 🔄 TODO: Create EmployeeBenefit table with these fields
 */
export interface EmployeeBenefit {
  id: string
  employeeId: string
  benefitType: CatalogEntry
  provider: string
  monetaryValue: number
  currency: CatalogEntry
  startDate: string
  endDate: string | null
  status: string // 'Active', 'Inactive', 'Pending'
  notes: string
}

/**
 * Employee Payslip Interface
 * 🔄 TODO: Create EmployeePayslip table with these fields
 */
export interface EmployeePayslip {
  id: string
  employeeId: string
  payPeriod: string // Format: "2023-12" (YYYY-MM)
  paymentDate: string // ISO date string
  grossAmount: number
  netAmount: number
  currency: CatalogEntry
  status: 'Generated' | 'Paid' | 'Void'
  documentUrl?: string // URL to download PDF
  fiscalYear: number
  monthName: string // "December 2023" for display
}

/**
 * Current Compensation Data
 * Contains current salary, bonuses YTD, and active benefits
 */
export interface CompensationData {
  currentCompensation: EmployeeCompensation | null
  totalBonusesYTD: number
  activeBenefitsCount: number
  bonuses: EmployeeBonus[]
  benefits: EmployeeBenefit[]
}

/**
 * Compensation History Record
 * Used for tracking salary changes over time
 */
export interface CompensationHistoryRecord {
  id: string
  employeeId: string
  baseSalary: number // annuallyGrossSalary
  currency: CatalogEntry
  compensationBand: Pick<CompensationBand, 'id' | 'name' | 'payGrade'> | null
  effectiveDate: string
  endDate: string | null
  changeReason?: string // Optional: can be added to EmployeeWorkingCondition later
  notes?: string
  // Additional fields from EmployeeWorkingCondition
  monthlyGrossSalary?: number
  stockOptions?: number
}

/**
 * Compensation History Data
 * Contains all historical compensation, bonus, and payslip records
 */
export interface CompensationHistoryData {
  compensationHistory: CompensationHistoryRecord[]
  bonusHistory: EmployeeBonus[]
  payslipHistory: EmployeePayslip[]
  growthData: GrowthData
}

/**
 * Milestone Types for Career Events
 */
export type MilestoneType =
  | 'Promotion'
  | 'Salary Increase'
  | 'Bonus Payout'
  | 'Equity Grant'
  | 'Band Movement'
  | 'Merit Increase'
  | 'Market Adjustment'

/**
 * Compensation Milestone Interface
 * Tracks significant compensation events
 * 🔄 TODO: Create EmployeeCareerMilestone table
 */
export interface CompensationMilestone {
  id: string
  employeeId: string
  date: string // ISO date
  type: MilestoneType
  title: string
  description?: string
  previousAmount?: number
  newAmount: number
  changeAmount: number
  changePercentage: number
  currency: CatalogEntry
  reason?: string
  relatedBonusId?: string
  relatedJobHistoryId?: string
  notes?: string
}

/**
 * Compensation Data Point for Timeline Chart
 * Monthly snapshot of compensation values
 */
export interface CompensationDataPoint {
  date: string // Format: "YYYY-MM"
  displayDate: string // Format: "Jan 2024"
  baseSalary: number
  totalCompensation: number
  bonuses: number
  benefits: number
  equity: number
  milestone?: CompensationMilestone
}

/**
 * Growth Data Interface
 * Contains timeline data and growth statistics
 */
export interface GrowthData {
  startDate: string
  endDate: string
  dataPoints: CompensationDataPoint[]
  milestones: CompensationMilestone[]
  totalGrowth: {
    startAmount: number
    currentAmount: number
    changeAmount: number
    changePercentage: number
  }
  averageAnnualIncrease: number
  totalMilestonesCount: number
}

/**
 * GraphQL Response Types
 */
export interface EmployeeWorkingConditionResponse {
  EmployeeWorkingCondition: Array<{
    id: string
    employeeId: string
    monthlyGrossSalary: number
    annualGrossSalary: number // Correct field name (not annuallyGrossSalary)
    stockOptions: number
    hireDate: string // Actual field in database
    exitDate: string | null // Actual field in database
    isDeleted: boolean
    compensationBand: CompensationBand | null
    payFrequencyRef: string
    payFrequency: CatalogEntry
    currencyRef: string
    currency: CatalogEntry
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }>
}
