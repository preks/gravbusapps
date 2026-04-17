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

function formatHours(value: number | null | undefined, t: (key: string) => string): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${value}${t('unit-hours-short')}`
}

function renderPresenceBadge(present: boolean, t: (key: string) => string): React.ReactNode {
  return (
    <Badge variant={present ? 'success' : 'destructive'}>{present ? t('label-present') : t('label-missing')}</Badge>
  )
}

export function resolveExceptionConfigs(
  issue: PayrollIssue,
  employee: PayrollEmployee,
  t: (key: string) => string
): ActionConfig[] {
  switch (issue.issueCode) {
    case 'MISSING_HIRE_DATE':
    case 'MISSING_CONTRACT_TYPE':
    case 'DE_MISSING_EMPLOYMENT_TYPE':
      return [
        {
          sectionTitleKey: 'exception-section-working-conditions',
          actionLabelKey: 'exception-action-update-working-conditions',
          flowContext: FlowContextName.updateEmployeeWorkingCondition,
          fields: [
            {
              label: t('grid-hire-date'),
              value: employee.hireDate ? formatDate(employee.hireDate) : t('label-missing')
            },
            { label: t('grid-contract-type'), value: employee.contractType || t('label-missing') },
            {
              label: t('de-employment-type'),
              value:
                employee.country === 'DE'
                  ? employee.employmentTypeFlag || t('label-not-set')
                  : t('label-not-applicable')
            }
          ]
        }
      ]
    case 'MISSING_BANK_DETAILS':
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
    case 'DE_MISSING_TAX_ID':
    case 'DE_MISSING_SOCIAL_INSURANCE':
    case 'DE_MISSING_HEALTH_INSURER':
    case 'RO_MISSING_CNP':
    case 'RO_INVALID_CNP':
      return [
        {
          sectionTitleKey: 'exception-section-tax-details',
          actionLabelKey: 'exception-action-update-tax-details',
          flowContext: FlowContextName.changeTaxDetails,
          fields: [
            {
              label: employee.country === 'RO' ? t('ro-cnp') : t('de-tax-id'),
              value:
                employee.country === 'RO'
                  ? employee.cnpStatus === 'present'
                    ? t('label-present')
                    : t('label-missing')
                  : employee.taxId || t('label-missing')
            },
            {
              label: t('de-social-insurance'),
              value:
                employee.country === 'DE'
                  ? employee.socialInsuranceNumber || t('label-missing')
                  : t('label-not-applicable')
            },
            {
              label: t('de-health-insurance'),
              value:
                employee.country === 'DE'
                  ? employee.healthInsuranceName || t('label-missing')
                  : t('label-not-applicable')
            }
          ]
        }
      ]
    case 'MISSING_BASE_SALARY':
    case 'RO_MISSING_CONTRACT_SALARY':
      return [
        {
          sectionTitleKey: 'exception-section-salary',
          actionLabelKey: 'exception-action-update-salary',
          flowContext: FlowContextName.adjustEmployeeSalary,
          fields: [{ label: t('grid-base-salary'), value: formatCurrency(employee.baseSalary, employee.currency) }]
        }
      ]
    case 'MISSING_FTE':
    case 'RO_MISSING_WORK_NORM':
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
    case 'PAYROLL_RELEVANT_NOT_SET':
      return [
        {
          sectionTitleKey: 'exception-section-contract-master-data',
          fields: [
            {
              label: t('exception-field-payroll-relevant'),
              value:
                employee.payrollRelevant === null
                  ? t('label-not-set')
                  : employee.payrollRelevant
                    ? t('label-present')
                    : t('label-not-applicable')
            }
          ]
        }
      ]
    case 'RO_MEDICAL_CERT_NEEDED':
    case 'DE_SICK_LEAVE_EAU_MISSING':
      return [
        {
          sectionTitleKey: 'exception-section-absence-data',
          fields: [
            { label: t('grid-sick-leave'), value: `${employee.sickLeaveDays} ${t('label-days')}` },
            {
              label: employee.country === 'DE' ? t('de-eau') : t('ro-medical-cert'),
              value:
                employee.country === 'DE'
                  ? employee.eauStatus || t('label-missing')
                  : employee.sickLeaveDays > 0
                    ? t('label-missing')
                    : t('label-not-applicable')
            }
          ]
        }
      ]
    case 'DE_TERMINATION_FINAL_PAYROLL':
      return [
        {
          sectionTitleKey: 'exception-section-final-payroll',
          fields: [
            { label: t('grid-termination-date'), value: formatDate(employee.terminationDate) },
            { label: t('grid-status'), value: employee.employmentStatus || '-' }
          ]
        }
      ]
    case 'MISSING_PRESENCE_DAYS':
      return [
        {
          sectionTitleKey: 'exception-section-attendance',
          fields: [
            { label: t('grid-missing-presence'), value: `${employee.missingPresenceDays} ${t('label-days')}` },
            { label: t('grid-logged-hours'), value: formatHours(employee.loggedHours, t) }
          ]
        }
      ]
    case 'PENDING_VARIABLE_PAY':
      return [
        {
          sectionTitleKey: 'exception-section-variable-pay',
          fields: [
            {
              label: t('grid-variable-pay'),
              value:
                employee.totalVariablePay === null || employee.totalVariablePay === undefined
                  ? '-'
                  : formatCurrency(employee.totalVariablePay, employee.variablePayCurrency || employee.currency)
            },
            { label: t('exception-field-variable-pay-status'), value: employee.variablePayStatus || '-' }
          ]
        }
      ]
    default:
      return []
  }
}
