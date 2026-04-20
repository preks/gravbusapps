import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { PayrollEmployee, PayrollIssue } from '../../../types/payrollTypes'

export type ActionConfig = {
  sectionTitleKey: string
  actionLabelKey?: string
  flowContext?: FlowContextName
  fields: Array<{ label: string; value: React.ReactNode }>
}

type TranslateFn = (key: string) => string
type ConfigBuilder = (employee: PayrollEmployee, t: TranslateFn) => ActionConfig[]

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString()
}

function formatCurrency(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${value.toLocaleString()} ${currency}`
}

function formatHours(value: number | null | undefined, t: TranslateFn): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${value}${t('unit-hours-short')}`
}

function renderPresenceBadge(present: boolean, t: TranslateFn): React.ReactNode {
  return (
    <Badge variant={present ? 'success' : 'destructive'}>{present ? t('label-present') : t('label-missing')}</Badge>
  )
}

function resolveEmploymentTypeValue(employee: PayrollEmployee, t: TranslateFn): string {
  if (employee.country !== 'DE') {
    return t('label-not-applicable')
  }

  return employee.employmentTypeFlag || t('label-not-set')
}

function resolveTaxIdentifierValue(employee: PayrollEmployee, t: TranslateFn): string {
  if (employee.country === 'RO') {
    return employee.cnpStatus === 'present' ? t('label-present') : t('label-missing')
  }

  return employee.taxId || t('label-missing')
}

function resolveGermanCountryField(value: string | undefined, employee: PayrollEmployee, t: TranslateFn): string {
  if (employee.country !== 'DE') {
    return t('label-not-applicable')
  }

  return value || t('label-missing')
}

function resolvePayrollRelevantValue(employee: PayrollEmployee, t: TranslateFn): string {
  if (employee.payrollRelevant === null) {
    return t('label-not-set')
  }

  return employee.payrollRelevant ? t('label-present') : t('label-not-applicable')
}

function resolveAbsenceEvidenceValue(employee: PayrollEmployee, t: TranslateFn): string {
  if (employee.country === 'DE') {
    return employee.eauStatus || t('label-missing')
  }

  if (employee.sickLeaveDays > 0) {
    return t('label-missing')
  }

  return t('label-not-applicable')
}

function resolveVariablePayValue(employee: PayrollEmployee): string {
  if (employee.totalVariablePay === null || employee.totalVariablePay === undefined) {
    return '-'
  }

  return formatCurrency(employee.totalVariablePay, employee.variablePayCurrency || employee.currency)
}

function buildWorkingConditionsConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-working-conditions',
      actionLabelKey: 'exception-action-update-working-conditions',
      flowContext: FlowContextName.updateEmployeeWorkingCondition,
      fields: [
        { label: t('grid-hire-date'), value: employee.hireDate ? formatDate(employee.hireDate) : t('label-missing') },
        { label: t('grid-contract-type'), value: employee.contractType || t('label-missing') },
        { label: t('de-employment-type'), value: resolveEmploymentTypeValue(employee, t) }
      ]
    }
  ]
}

function buildBankDetailsConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-bank-details',
      actionLabelKey: 'exception-action-update-bank-details',
      flowContext: FlowContextName.updateEmployeeBankAccount,
      fields: [
        { label: t('grid-bank-details'), value: renderPresenceBadge(employee.bankDetailsPresent, t) },
        { label: t('exception-field-bank-account'), value: employee.bankAccountIban || '-' }
      ]
    }
  ]
}

function buildTaxDetailsConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  const taxIdentifierLabel = employee.country === 'RO' ? t('ro-cnp') : t('de-tax-id')

  return [
    {
      sectionTitleKey: 'exception-section-tax-details',
      actionLabelKey: 'exception-action-update-tax-details',
      flowContext: FlowContextName.changeTaxDetails,
      fields: [
        { label: taxIdentifierLabel, value: resolveTaxIdentifierValue(employee, t) },
        {
          label: t('de-social-insurance'),
          value: resolveGermanCountryField(employee.socialInsuranceNumber, employee, t)
        },
        {
          label: t('de-health-insurance'),
          value: resolveGermanCountryField(employee.healthInsuranceName, employee, t)
        }
      ]
    }
  ]
}

function buildSalaryConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-salary',
      actionLabelKey: 'exception-action-update-salary',
      flowContext: FlowContextName.adjustEmployeeSalary,
      fields: [{ label: t('grid-base-salary'), value: formatCurrency(employee.baseSalary, employee.currency) }]
    }
  ]
}

function buildWorkingHoursConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-working-hours',
      actionLabelKey: 'exception-action-update-working-hours',
      flowContext: FlowContextName.updateEmployeeWorkingHours,
      fields: [
        {
          label: t('grid-fte'),
          value: employee.fte === null || employee.fte === undefined ? t('label-missing') : String(employee.fte)
        },
        { label: t('grid-weekly-hours'), value: formatHours(employee.weeklyHours, t) },
        { label: t('grid-capacity'), value: formatHours(employee.contractCapacityHours, t) }
      ]
    }
  ]
}

function buildContractMasterDataConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-contract-master-data',
      fields: [{ label: t('exception-field-payroll-relevant'), value: resolvePayrollRelevantValue(employee, t) }]
    }
  ]
}

function buildAbsenceDataConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  const evidenceLabel = employee.country === 'DE' ? t('de-eau') : t('ro-medical-cert')

  return [
    {
      sectionTitleKey: 'exception-section-absence-data',
      fields: [
        { label: t('grid-sick-leave'), value: `${employee.sickLeaveDays} ${t('label-days')}` },
        { label: evidenceLabel, value: resolveAbsenceEvidenceValue(employee, t) }
      ]
    }
  ]
}

function buildFinalPayrollConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-final-payroll',
      fields: [
        { label: t('grid-termination-date'), value: formatDate(employee.terminationDate) },
        { label: t('grid-status'), value: employee.employmentStatus || '-' }
      ]
    }
  ]
}

function buildAttendanceConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-attendance',
      fields: [
        { label: t('grid-missing-presence'), value: `${employee.missingPresenceDays} ${t('label-days')}` },
        { label: t('grid-logged-hours'), value: formatHours(employee.loggedHours, t) }
      ]
    }
  ]
}

function buildVariablePayConfig(employee: PayrollEmployee, t: TranslateFn): ActionConfig[] {
  return [
    {
      sectionTitleKey: 'exception-section-variable-pay',
      fields: [
        { label: t('grid-variable-pay'), value: resolveVariablePayValue(employee) },
        { label: t('exception-field-variable-pay-status'), value: employee.variablePayStatus || '-' }
      ]
    }
  ]
}

const ISSUE_CONFIG_BUILDERS: Record<string, ConfigBuilder> = {
  MISSING_HIRE_DATE: buildWorkingConditionsConfig,
  MISSING_CONTRACT_TYPE: buildWorkingConditionsConfig,
  DE_MISSING_EMPLOYMENT_TYPE: buildWorkingConditionsConfig,
  MISSING_BANK_DETAILS: buildBankDetailsConfig,
  DE_MISSING_TAX_ID: buildTaxDetailsConfig,
  DE_MISSING_SOCIAL_INSURANCE: buildTaxDetailsConfig,
  DE_MISSING_HEALTH_INSURER: buildTaxDetailsConfig,
  RO_MISSING_CNP: buildTaxDetailsConfig,
  MISSING_BASE_SALARY: buildSalaryConfig,
  RO_MISSING_CONTRACT_SALARY: buildSalaryConfig,
  MISSING_FTE: buildWorkingHoursConfig,
  RO_MISSING_WORK_NORM: buildWorkingHoursConfig,
  PAYROLL_RELEVANT_NOT_SET: buildContractMasterDataConfig,
  RO_MEDICAL_CERT_NEEDED: buildAbsenceDataConfig,
  DE_SICK_LEAVE_EAU_MISSING: buildAbsenceDataConfig,
  DE_TERMINATION_FINAL_PAYROLL: buildFinalPayrollConfig,
  MISSING_PRESENCE_DAYS: buildAttendanceConfig,
  PENDING_VARIABLE_PAY: buildVariablePayConfig
}

export function resolveExceptionConfigs(
  issue: PayrollIssue,
  employee: PayrollEmployee,
  t: TranslateFn
): ActionConfig[] {
  const builder = ISSUE_CONFIG_BUILDERS[issue.issueCode]

  if (!builder) {
    return []
  }

  return builder(employee, t)
}
