/**
 * Short titles for payroll validation `issueCode` values (see `validationRules.ts`,
 * `germanyValidation.ts`, `romaniaValidation.ts`).
 *
 * Prefer Fluent keys over auto-formatting: locales need real translations, and
 * acronyms (CNP, eAU, FTE) do not title-case well from `MISSING_*` strings alone.
 */
export const PAYROLL_ISSUE_CODE_I18N_KEYS: Record<string, string> = {
  MISSING_BANK_DETAILS: 'issue-code-missing-bank-details',
  MISSING_BASE_SALARY: 'issue-code-missing-base-salary',
  MISSING_CONTRACT_TYPE: 'issue-code-missing-contract-type',
  MISSING_HIRE_DATE: 'issue-code-missing-hire-date',
  MISSING_FTE: 'issue-code-missing-fte',
  PAYROLL_RELEVANT_NOT_SET: 'issue-code-payroll-relevant-not-set',
  MISSING_PRESENCE_DAYS: 'issue-code-missing-presence-days',
  PENDING_VARIABLE_PAY: 'issue-code-pending-variable-pay',
  DE_MISSING_TAX_ID: 'issue-code-de-missing-tax-id',
  DE_MISSING_SOCIAL_INSURANCE: 'issue-code-de-missing-social-insurance',
  DE_MISSING_HEALTH_INSURER: 'issue-code-de-missing-health-insurer',
  DE_MISSING_EMPLOYMENT_TYPE: 'issue-code-de-missing-employment-type',
  DE_SICK_LEAVE_EAU_MISSING: 'issue-code-de-sick-leave-eau-missing',
  DE_TERMINATION_FINAL_PAYROLL: 'issue-code-de-termination-final-payroll',
  RO_MISSING_CNP: 'issue-code-ro-missing-cnp',
  RO_INVALID_CNP: 'issue-code-ro-invalid-cnp',
  RO_MISSING_CONTRACT_SALARY: 'issue-code-ro-missing-contract-salary',
  RO_MISSING_WORK_NORM: 'issue-code-ro-missing-work-norm',
  RO_MEDICAL_CERT_NEEDED: 'issue-code-ro-medical-cert-needed'
}

/** Fallback when a new code ships before translations: `SOME_NEW_CODE` → "Some new code". */
export function humanizeIssueCode(code: string): string {
  return code
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function payrollIssueCodeTitle(issueCode: string, t: (key: string) => string): string {
  const key = PAYROLL_ISSUE_CODE_I18N_KEYS[issueCode]
  if (key) {
    return t(key)
  }

  return humanizeIssueCode(issueCode)
}
