/**
 * Common types for the HR salaries module
 */

export enum SalaryType {
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY'
}

export enum CompensationComponentType {
  BONUS = 'BONUS',
  ALLOWANCE = 'ALLOWANCE',
  COMMISSION = 'COMMISSION',
  BENEFIT = 'BENEFIT',
  DEDUCTION = 'DEDUCTION',
  OTHER = 'OTHER'
}

export enum PaymentFrequency {
  MONTHLY = 'MONTHLY',
  BI_WEEKLY = 'BI_WEEKLY',
  WEEKLY = 'WEEKLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
  ONE_TIME = 'ONE_TIME'
}

export interface SalaryData {
  id: string
  employeeId: string
  amount: number
  currency: string
  salaryType: SalaryType
  effectiveDate: string
  endDate?: string
  paymentFrequency: PaymentFrequency
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CompensationComponent {
  id: string
  employeeId: string
  salaryId: string
  name: string
  description?: string
  amount: number
  currency: string
  type: CompensationComponentType
  effectiveDate: string
  endDate?: string
  paymentFrequency: PaymentFrequency
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SalaryHistory {
  id: string
  employeeId: string
  previousAmount?: number
  newAmount: number
  currency: string
  effectiveDate: string
  reason?: string
  createdBy: string
  createdAt: string
}

export interface SalaryStatistics {
  averageSalary: number
  medianSalary: number
  totalCompensation: number
  currency: string
  employeeCount: number
  lastUpdated: string
}
