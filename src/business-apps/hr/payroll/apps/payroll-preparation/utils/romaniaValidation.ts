import type { PayrollEmployee, PayrollIssue } from '../types/payrollTypes'
import { createIssue, type IssueTranslator } from './validationRules'

const CNP_WEIGHTS = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9]

function isValidCNP(cnp: string): boolean {
  if (!/^\d{13}$/.test(cnp)) return false

  let checksum = 0
  for (let i = 0; i < 12; i++) {
    checksum += Number(cnp[i]) * CNP_WEIGHTS[i]
  }
  let remainder = checksum % 11
  if (remainder === 10) remainder = 1

  return remainder === Number(cnp[12])
}

export function runRomaniaValidation(employee: PayrollEmployee, translate: IssueTranslator): PayrollIssue[] {
  const issues: PayrollIssue[] = []

  if (!employee.socialInsuranceNumber) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MISSING_CNP',
        'missing_tax_social',
        'blocker',
        translate,
        'taxDetails.socialSecurityNumber'
      )
    )
  } else if (!isValidCNP(employee.socialInsuranceNumber)) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_INVALID_CNP',
        'missing_tax_social',
        'blocker',
        translate,
        'taxDetails.socialSecurityNumber'
      )
    )
  }

  if (employee.baseSalary == null || employee.baseSalary <= 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MISSING_CONTRACT_SALARY',
        'missing_salary_data',
        'blocker',
        translate,
        'baseSalary'
      )
    )
  }

  if (employee.weeklyHours == null) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MISSING_WORK_NORM',
        'missing_working_hours',
        'blocker',
        translate,
        'weeklyHours'
      )
    )
  }

  if (employee.sickLeaveDays > 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MEDICAL_CERT_NEEDED',
        'missing_absence_data',
        'warning',
        translate,
        'sickLeaveDays',
        { count: employee.sickLeaveDays }
      )
    )
  }

  return issues
}
