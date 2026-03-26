import type { PayrollEmployee, PayrollIssue } from '../types/payrollTypes'
import { createIssue } from './validationRules'

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

export function runRomaniaValidation(employee: PayrollEmployee): PayrollIssue[] {
  const issues: PayrollIssue[] = []

  if (!employee.socialInsuranceNumber) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MISSING_CNP',
        'missing_tax_social',
        'blocker',
        'CNP (Cod Numeric Personal) is missing. Required for Romanian payroll and statutory reporting.',
        'Add the CNP / social security number in the employee tax details section.',
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
        'CNP (Cod Numeric Personal) is invalid. The 13-digit checksum validation failed.',
        'Verify and correct the CNP in the employee tax details section.',
        'taxDetails.socialSecurityNumber'
      )
    )
  }

  if (employee.baseSalary == null || employee.baseSalary <= 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MISSING_CONTRACT_SALARY',
        'missing_contract_salary',
        'blocker',
        'Contract salary is missing. Required for Romanian payroll processing.',
        'Ensure an approved salary record exists for this employee.',
        'baseSalary'
      )
    )
  }

  if (employee.weeklyHours == null) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_MISSING_WORK_NORM',
        'missing_contract_salary',
        'blocker',
        'Working time norm (weekly hours) is missing. Required for Romanian payroll.',
        'Update the working hours configuration for this employee.',
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
        `Employee has ${employee.sickLeaveDays} sick leave day(s). Medical certificate is required.`,
        'Ensure the medical certificate is collected and filed for the sick leave period.',
        'sickLeaveDays'
      )
    )
  }

  if (employee.variablePayStatus === 'pending' && employee.totalVariablePay != null && employee.totalVariablePay > 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'RO_PENDING_VARIABLE_PAY',
        'missing_approvals',
        'warning',
        'Variable compensation exists but has not been fully approved.',
        'Review and approve pending bonus entries before payroll processing.',
        'variablePay'
      )
    )
  }

  return issues
}
