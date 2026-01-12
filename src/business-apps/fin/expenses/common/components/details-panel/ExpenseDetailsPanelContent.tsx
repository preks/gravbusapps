import React, { useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DetailsPanelContent, type DetailsPanelField } from './DetailsPanelContent'

type CurrencyLike = { code?: string | null } | string | null | undefined

export interface ExpenseDetailsPanelRecord {
  title?: string | null
  code?: string | null

  employee?: string | null
  employeeCode?: string | null
  sapNumber?: string | null

  startDate?: string | null
  endDate?: string | null
  creationDate?: string | null

  totalRemainingAmount?: number | string | null
  totalAmount?: number | null
  currency?: CurrencyLike
}

export interface ExpenseDetailsPanelContentProps {
  record: ExpenseDetailsPanelRecord
  headerRight?: React.ReactNode
  /**
   * Content to render immediately after the title/status header, before the field list.
   * Useful for action buttons or other prominent content.
   */
  afterHeaderContent?: React.ReactNode
  extraContent?: React.ReactNode
  footer?: React.ReactNode
  dataTestIdPrefix: string
  formatAmount: (amount: number, currencyCode: string) => React.ReactNode
  fallbackCurrencyCode?: string
  /**
   * If false, do not render the internal title header.
   * Useful when the surrounding details panel already shows the title.
   */
  showHeader?: boolean
  /**
   * Extra fields to display in addition to the standard set.
   * These are inserted near the top (after Code/Status when header is hidden).
   */
  additionalFields?: DetailsPanelField[]
}

const normalizeCurrencyCode = (currency: CurrencyLike, fallback: string): string => {
  if (!currency) return fallback
  if (typeof currency === 'string') {
    const trimmed = currency.trim()
    if (!trimmed) return fallback
    return trimmed.includes(':') ? trimmed.split(':').pop() || fallback : trimmed
  }
  const code = currency.code
  return typeof code === 'string' && code.trim() ? code.trim() : fallback
}

const asNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export const ExpenseDetailsPanelContent: React.FC<ExpenseDetailsPanelContentProps> = ({
  record,
  headerRight,
  afterHeaderContent,
  extraContent,
  footer,
  dataTestIdPrefix,
  formatAmount,
  fallbackCurrencyCode = 'EUR',
  showHeader = true,
  additionalFields
}) => {
  const currencyCode = useMemo(
    () => normalizeCurrencyCode(record.currency, fallbackCurrencyCode),
    [record.currency, fallbackCurrencyCode]
  )

  const fields: DetailsPanelField[] = useMemo(() => {
    const codeLabel = getTranslationFromI18nKeyAndLabel('common.code', 'Code')
    const statusLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_plan_table.status',
      'Status'
    )
    const employeeLabel = getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
    const employeeCodeLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_table.employee_code',
      'Employee Code'
    )
    const sapLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_config_calculation_rule_list.expense_table.sap_number',
      'SAP Number'
    )
    const startLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_plan_list.expense_plan_table.start_date',
      'Start Date'
    )
    const endLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_plan_list.expense_plan_table.end_date',
      'End Date'
    )
    const creationLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:manager_expense_request_list.expense_table.creation_date',
      'Creation Date'
    )
    const remainingLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:approve_expense_plan.remaining',
      'Remaining Amount'
    )
    const totalLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_plan_table.total_amount',
      'Total Amount'
    )

    const remainingAmount = asNumberOrNull(record.totalRemainingAmount)
    const remainingValue =
      remainingAmount !== null && remainingAmount > 0 ? formatAmount(remainingAmount, currencyCode) : '-'
    const totalValue = formatAmount(Number(record.totalAmount ?? 0), currencyCode)

    const base: DetailsPanelField[] = [
      { label: employeeLabel, value: record.employee || 'N/A' },
      ...(record.employeeCode && record.employeeCode !== 'N/A'
        ? [{ label: employeeCodeLabel, value: record.employeeCode }]
        : []),
      { label: sapLabel, value: record.sapNumber || 'N/A' },
      { label: startLabel, value: record.startDate || 'N/A' },
      { label: endLabel, value: record.endDate || 'N/A' },
      { label: creationLabel, value: record.creationDate || 'N/A' },
      { label: remainingLabel, value: remainingValue },
      { label: totalLabel, value: totalValue }
    ]
    // When the outer container already renders a header, keep important meta fields visible here.
    if (!showHeader) {
      return [
        ...(record.code ? [{ label: codeLabel, value: record.code }] : []),
        ...(headerRight ? [{ label: statusLabel, value: headerRight }] : []),
        ...(additionalFields || []),
        ...base
      ]
    }
    return [...(additionalFields || []), ...base]
  }, [
    record.code,
    record.employee,
    record.employeeCode,
    record.sapNumber,
    record.startDate,
    record.endDate,
    record.creationDate,
    record.totalRemainingAmount,
    record.totalAmount,
    currencyCode,
    formatAmount,
    headerRight,
    showHeader,
    additionalFields
  ])

  return (
    <DetailsPanelContent
      dataTestIdPrefix={dataTestIdPrefix}
      title={record.title || 'N/A'}
      subtitle={record.code || 'N/A'}
      headerRight={showHeader ? headerRight : undefined}
      afterHeaderContent={afterHeaderContent}
      fields={fields}
      extraContent={extraContent}
      footer={footer}
      showHeader={showHeader}
    />
  )
}

export default ExpenseDetailsPanelContent
