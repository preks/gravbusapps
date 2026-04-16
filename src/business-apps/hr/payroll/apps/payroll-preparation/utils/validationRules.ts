import type { PayrollEmployee, PayrollIssue, IssueSeverity, IssueCategory } from '../types/payrollTypes'
import { runGermanyValidation } from './germanyValidation'
import { runRomaniaValidation } from './romaniaValidation'

export type IssueTranslationValues = Record<string, string | number>
export type IssueTranslator = (key: string, values?: IssueTranslationValues) => string

let issueIdCounter = 0
function nextIssueId(): string {
  issueIdCounter += 1
  return `issue-${issueIdCounter}`
}

export function resetIssueIdCounter(): void {
  issueIdCounter = 0
}

function getIssueTranslationKey(prefix: 'message' | 'action', issueCode: string): string {
  return `issue-${prefix}-${issueCode.toLowerCase().replace(/_/g, '-')}`
}

export function createIssue(
  employeeId: string,
  issueCode: string,
  category: IssueCategory,
  severity: IssueSeverity,
  translate: IssueTranslator,
  fieldPath?: string,
  values?: IssueTranslationValues
): PayrollIssue {
  return {
    id: nextIssueId(),
    employeeId,
    issueCode,
    category,
    severity,
    message: translate(getIssueTranslationKey('message', issueCode), values),
    fieldPath,
    status: 'open',
    recommendedAction: translate(getIssueTranslationKey('action', issueCode), values),
    createdAt: new Date().toISOString()
  }
}

export function runGenericValidation(employee: PayrollEmployee, translate: IssueTranslator): PayrollIssue[] {
  const issues: PayrollIssue[] = []

  if (!employee.bankDetailsPresent) {
    issues.push(
      createIssue(
        employee.employeeId,
        'MISSING_BANK_DETAILS',
        'missing_bank_details',
        'blocker',
        translate,
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
        translate,
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
        translate,
        'contractType'
      )
    )
  }

  if (!employee.hireDate) {
    issues.push(
      createIssue(employee.employeeId, 'MISSING_HIRE_DATE', 'missing_personal_data', 'blocker', translate, 'hireDate')
    )
  }

  if (employee.fte == null) {
    issues.push(createIssue(employee.employeeId, 'MISSING_FTE', 'missing_contract_salary', 'warning', translate, 'fte'))
  }

  if (employee.payrollRelevant === null) {
    issues.push(
      createIssue(
        employee.employeeId,
        'PAYROLL_RELEVANT_NOT_SET',
        'missing_contract_salary',
        'warning',
        translate,
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
        translate,
        'attendance',
        { count: employee.missingPresenceDays }
      )
    )
  }

  if (employee.variablePayStatus === 'pending' && employee.totalVariablePay != null && employee.totalVariablePay > 0) {
    issues.push(
      createIssue(employee.employeeId, 'PENDING_VARIABLE_PAY', 'missing_approvals', 'warning', translate, 'variablePay')
    )
  }

  return issues
}

export function runAllValidations(
  employee: PayrollEmployee,
  country: 'DE' | 'RO',
  translate: IssueTranslator
): PayrollIssue[] {
  resetIssueIdCounter()
  const issues = runGenericValidation(employee, translate)

  if (country === 'DE') {
    issues.push(...runGermanyValidation(employee, translate))
  } else if (country === 'RO') {
    issues.push(...runRomaniaValidation(employee, translate))
  }

  return issues
}
