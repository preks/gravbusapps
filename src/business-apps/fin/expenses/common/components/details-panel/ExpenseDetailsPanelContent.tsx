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

const FALLBACK_LABELS: Record<string, string> = {
  'header-employee': 'Employee',
  'header-employee-code': 'Employee Code',
  'header-sap-number': 'SAP Number',
  'header-start-date': 'Start Date',
  'header-end-date': 'End Date',
  'header-creation-date': 'Creation Date',
  'header-remaining-amount': 'Remaining Amount',
  'header-total-amount': 'Total Amount',
  'header-status': 'Status',
  'detail-code': 'Code',
  'common-not-available': 'N/A'
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
  const t = tProp ?? ((key: string) => FALLBACK_LABELS[key] ?? key)
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
    const na = t('common-not-available')
    const remainingAmount = asNumberOrNull(record.totalRemainingAmount)
    const remainingValue =
      remainingAmount !== null && remainingAmount > 0 ? formatAmount(remainingAmount, currencyCode) : '-'
    const totalValue = formatAmount(Number(record.totalAmount ?? 0), currencyCode)

    const base: DetailsPanelField[] = [
      ...(record.employee == null ? [] : [{ label: t('header-employee'), value: record.employee || na }]),
      ...(record.employeeCode && record.employeeCode !== 'N/A' && record.employeeCode !== undefined
        ? [{ label: t('header-employee-code'), value: record.employeeCode }]
        : []),
      ...(record.sapNumber == null ? [] : [{ label: t('header-sap-number'), value: record.sapNumber || na }]),
      { label: t('header-start-date'), value: record.startDate || na },
      { label: t('header-end-date'), value: record.endDate || na },
      { label: t('header-creation-date'), value: record.creationDate || na },
      { label: t('header-remaining-amount'), value: remainingValue },
      { label: t('header-total-amount'), value: totalValue }
    ]

    if (!showHeader) {
      return [
        ...(record.code ? [{ label: t('detail-code'), value: record.code }] : []),
        ...(headerRight ? [{ label: t('header-status'), value: headerRight }] : []),
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
    additionalFields,
    t
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
      title={record.title || t('common-not-available')}
      subtitle={record.code || t('common-not-available')}
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
