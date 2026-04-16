import type { PayrollEmployee, PayrollIssue } from '../types/payrollTypes'
import { createIssue, type IssueTranslator } from './validationRules'

export function runGermanyValidation(employee: PayrollEmployee, translate: IssueTranslator): PayrollIssue[] {
  const issues: PayrollIssue[] = []

  if (!employee.taxId) {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_MISSING_TAX_ID',
        'missing_tax_social',
        'blocker',
        translate,
        'taxDetails.taxIdentificationNumber'
      )
    )
  }

  if (!employee.socialInsuranceNumber) {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_MISSING_SOCIAL_INSURANCE',
        'missing_tax_social',
        'blocker',
        translate,
        'taxDetails.socialSecurityNumber'
      )
    )
  }

  if (!employee.healthInsuranceName) {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_MISSING_HEALTH_INSURER',
        'missing_tax_social',
        'blocker',
        translate,
        'taxDetails.healthInsuranceName'
      )
    )
  }

  if (!employee.employmentTypeFlag) {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_MISSING_EMPLOYMENT_TYPE',
        'missing_country_specific',
        'warning',
        translate,
        'workingCondition.employmentType'
      )
    )
  }

  if (employee.sickLeaveDays > 0 && employee.eauStatus !== 'available') {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_SICK_LEAVE_EAU_MISSING',
        'missing_country_specific',
        'warning',
        translate,
        'eauStatus'
      )
    )
  }

  if (employee.terminationDate && employee.readinessStatus !== 'excluded') {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_TERMINATION_FINAL_PAYROLL',
        'pending_final_payroll',
        'warning',
        translate,
        'terminationDate'
      )
    )
  }

  return issues
}
