import type { PayrollEmployee, PayrollIssue } from '../types/payrollTypes'
import { createIssue } from './validationRules'

export function runGermanyValidation(employee: PayrollEmployee): PayrollIssue[] {
  const issues: PayrollIssue[] = []

  if (!employee.taxId) {
    issues.push(
      createIssue(
        employee.employeeId,
        'DE_MISSING_TAX_ID',
        'missing_tax_social',
        'blocker',
        'Tax identification number is missing. Required for German payroll processing.',
        'Add the tax ID in the employee tax details section.',
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
        'Social insurance number is missing. Required for German social contributions.',
        'Add the social insurance number in the employee tax details section.',
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
        'Health insurance fund is not assigned. Required for German payroll.',
        'Assign the health insurance fund in the employee tax details.',
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
        'Employment type is not specified (e.g. regular, mini-job).',
        'Set the employment type in working conditions.',
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
        'Sick leave recorded but eAU (electronic certificate) status is not confirmed.',
        'Verify the eAU status for the recorded sick leave days.',
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
        'Employee has a termination date. Ensure final payroll review is completed.',
        'Review and confirm final payroll settlement for the terminating employee.',
        'terminationDate'
      )
    )
  }

  return issues
}
