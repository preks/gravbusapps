import React, { useMemo } from 'react'
import { DetailsPanelContent, type DetailsPanelField } from './DetailsPanelContent'
import { useExpenseRequestAnalysis } from '../../hooks/useExpenseRequestAnalysis'
import AIAnalysisSection from '../ai-analysis/AIAnalysisSection'

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
  afterHeaderContent?: React.ReactNode
  extraContent?: React.ReactNode
  footer?: React.ReactNode
  dataTestIdPrefix: string
  formatAmount: (amount: number, currencyCode: string) => React.ReactNode
  fallbackCurrencyCode?: string
  showHeader?: boolean
  additionalFields?: DetailsPanelField[]
  expenseRequestId?: string | null
  accessToken?: string
  t?: (key: string) => string
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
  additionalFields,
  expenseRequestId,
  accessToken,
  t: tProp
}) => {
  const label = useMemo(() => {
    const tr = (ftlKey: string, en: string) => (tProp ? tProp(ftlKey) : en)
    return {
      notAvailable: tr('expense-details-value-not-available', 'N/A'),
      employee: tr('expense-details-label-employee', 'Employee'),
      employeeCode: tr('expense-details-label-employee-code', 'Employee Code'),
      sapNumber: tr('expense-details-label-sap-number', 'SAP Number'),
      startDate: tProp ? tProp('personal-expenses-filter-label-start-date') : 'Start Date',
      endDate: tProp ? tProp('personal-expenses-filter-label-end-date') : 'End Date',
      creationDate: tr('expense-details-label-creation-date', 'Creation Date'),
      remainingAmount: tr('expense-details-label-remaining-amount', 'Remaining Amount'),
      totalAmount: tr('expense-details-label-total-amount', 'Total Amount'),
      status: tProp ? tProp('expense-items-column-status') : 'Status',
      code: tProp ? tProp('expense-items-details-field-code') : 'Code'
    }
  }, [tProp])
  const {
    analysis: aiAnalysis,
    loading: aiAnalysisLoading,
    error: aiAnalysisError,
    refetch: refetchAiAnalysis
  } = useExpenseRequestAnalysis({
    expenseRequestId: expenseRequestId || null,
    accessToken
  })

  const currencyCode = useMemo(
    () => normalizeCurrencyCode(record.currency, fallbackCurrencyCode),
    [record.currency, fallbackCurrencyCode]
  )

  const fields: DetailsPanelField[] = useMemo(() => {
    const na = label.notAvailable
    const remainingAmount = asNumberOrNull(record.totalRemainingAmount)
    const remainingValue =
      remainingAmount !== null && remainingAmount > 0 ? formatAmount(remainingAmount, currencyCode) : '-'
    const totalValue = formatAmount(Number(record.totalAmount ?? 0), currencyCode)

    const base: DetailsPanelField[] = [
      ...(record.employee == null ? [] : [{ label: label.employee, value: record.employee || na }]),
      ...(record.employeeCode && record.employeeCode !== 'N/A' && record.employeeCode !== undefined
        ? [{ label: label.employeeCode, value: record.employeeCode }]
        : []),
      ...(record.sapNumber == null ? [] : [{ label: label.sapNumber, value: record.sapNumber || na }]),
      { label: label.startDate, value: record.startDate || na },
      { label: label.endDate, value: record.endDate || na },
      { label: label.creationDate, value: record.creationDate || na },
      { label: label.remainingAmount, value: remainingValue },
      { label: label.totalAmount, value: totalValue }
    ]

    if (!showHeader) {
      return [
        ...(record.code ? [{ label: label.code, value: record.code }] : []),
        ...(headerRight ? [{ label: label.status, value: headerRight }] : []),
        ...(additionalFields || []),
        ...base
      ]
    }
    return [...(additionalFields || []), ...base]
  }, [
    label,
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

  const footerWithAiAnalysis = (
    <>
      {footer}
      {expenseRequestId && accessToken && (
        <AIAnalysisSection
          analysis={aiAnalysis}
          loading={aiAnalysisLoading}
          error={aiAnalysisError}
          onRefresh={refetchAiAnalysis}
        />
      )}
    </>
  )

  return (
    <DetailsPanelContent
      dataTestIdPrefix={dataTestIdPrefix}
      title={record.title || label.notAvailable}
      subtitle={record.code || label.notAvailable}
      headerRight={showHeader ? headerRight : undefined}
      afterHeaderContent={afterHeaderContent}
      fields={fields}
      extraContent={extraContent}
      footer={footerWithAiAnalysis}
      showHeader={showHeader}
    />
  )
}

export default ExpenseDetailsPanelContent
