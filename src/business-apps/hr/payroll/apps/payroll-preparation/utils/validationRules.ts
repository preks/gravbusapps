import type { PayrollEmployee, PayrollIssue, IssueSeverity, IssueCategory } from '../types/payrollTypes'
import { runGermanyValidation } from './germanyValidation'
import { runRomaniaValidation } from './romaniaValidation'

let issueIdCounter = 0
function nextIssueId(): string {
  issueIdCounter += 1
  return `issue-${issueIdCounter}`
}

export function resetIssueIdCounter(): void {
  issueIdCounter = 0
}

export function createIssue(
  employeeId: string,
  issueCode: string,
  category: IssueCategory,
  severity: IssueSeverity,
  message: string,
  recommendedAction: string,
  fieldPath?: string
): PayrollIssue {
  return {
    id: nextIssueId(),
    employeeId,
    issueCode,
    category,
    severity,
    message,
    fieldPath,
    status: 'open',
    recommendedAction,
    createdAt: new Date().toISOString()
  }
}

export function runGenericValidation(employee: PayrollEmployee): PayrollIssue[] {
  const issues: PayrollIssue[] = []

  if (!employee.bankDetailsPresent) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_BANK_DETAILS',
        'missing_bank_details',
        'blocker',
        'Bank details are missing. Payroll cannot be processed without valid bank information.',
        'Navigate to employee profile and add bank account details.',
        'bankAccounts'
      )
    )
  }

  if (employee.baseSalary == null || employee.baseSalary <= 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_BASE_SALARY',
        'missing_contract_salary',
        'blocker',
        'No active approved salary record found for the current period.',
        'Ensure an approved salary adjustment exists for this employee.',
        'baseSalary'
      )
    )
  }

  if (!employee.contractType) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_CONTRACT_TYPE',
        'missing_contract_salary',
        'blocker',
        'Contract type is not specified.',
        'Update the employment working condition with the correct contract type.',
        'contractType'
      )
    )
  }

  if (!employee.hireDate) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_HIRE_DATE',
        'missing_personal_data',
        'blocker',
        'Hire date is missing.',
        'Set the hire date in the employee position record.',
        'hireDate'
      )
    )
  }

  if (employee.fte == null) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_FTE',
        'missing_contract_salary',
        'warning',
        'Full-time equivalent (FTE) is not specified.',
        'Update working hours to include FTE value.',
        'fte'
      )
    )
  }

  if (employee.payrollRelevant === null) {
    issues.push(
      createIssue(
        employee.employeeId,
        'PAYROLL_RELEVANT_NOT_SET',
        'missing_contract_salary',
        'warning',
        'The "payroll_relevant" attribute is not maintained in the contract type configuration.',
        'Update the contract type catalog entry to include the "payroll_relevant" attribute in its JSON configuration.',
        'contractType.objectValue.payroll_relevant'
      )
    )
  }

  if (employee.missingPresenceDays > 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_PRESENCE_DAYS',
        'missing_absence_data',
        'warning',
        `Employee has ${employee.missingPresenceDays} working day(s) without recorded time or absence.`,
        'Verify if the employee was present and log attendance, or record an absence for those days.',
        'attendance'
      )
    )
  }

  if (employee.variablePayStatus === 'pending' && employee.totalVariablePay != null && employee.totalVariablePay > 0) {
    issues.push(
      createIssue(
        employee.employeeId,
        'PENDING_VARIABLE_PAY',
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

export function runAllValidations(employee: PayrollEmployee, country: 'DE' | 'RO'): PayrollIssue[] {
  resetIssueIdCounter()
  const issues = runGenericValidation(employee)

  if (country === 'DE') {
    issues.push(...runGermanyValidation(employee))
  } else if (country === 'RO') {
    issues.push(...runRomaniaValidation(employee))
  }

  return issues
}
