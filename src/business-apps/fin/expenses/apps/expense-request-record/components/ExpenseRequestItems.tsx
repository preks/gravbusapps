import React, { useMemo } from 'react'
import { Table } from 'antd'
import { Card, CardHeader, CardTitle, CardContent, Icon } from '@newwork/nw-design-system'
import type { ColumnsType } from 'antd/es/table'
import Pill from '@/components/pill'
import { ExpenseRequestItem } from '../types/expenseRequestRecord.types'
import { getTranslationFromI18nKeyAndLabel, getCatalogValue } from '@/common/utils/windowUtils'
import { SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { Check } from '@phosphor-icons/react'
import { formatCurrencyDisplay } from '../../expense-plan-record/utils/currency'
import { formatDate } from '@/common/utils/windowUtils'

interface ExpenseRequestItemsProps {
  expenseRequestItems: ExpenseRequestItem[]
  currencyCode?: string
}

// Table summary component defined outside parent component to fix lint error
interface TableSummaryProps {
  pageData: readonly ExpenseRequestItem[]
  formatAmount: (amount: number) => string
}

const TableSummary: React.FC<TableSummaryProps> = ({ pageData, formatAmount }) => {
  let totalAmount = 0
  let totalReimbursable = 0
  let totalDeductible = 0

  pageData.forEach(({ totalAmount: amount, reimbursableAmount, deductibleAmount }) => {
    totalAmount += amount
    totalReimbursable += reimbursableAmount
    totalDeductible += deductibleAmount
  })

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={5}>
          <span className="gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <span className="gba:font-semibold">{formatAmount(totalAmount)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <span>{formatAmount(totalReimbursable)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <span>{formatAmount(totalDeductible)}</span>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  )
}

const ExpenseRequestItems: React.FC<ExpenseRequestItemsProps> = ({ expenseRequestItems, currencyCode }) => {
  const loading = false
  // Date formatting via platform utility
  const formatDateOnly = (dateString: string | null) => {
    if (!dateString) return '-'
    return formatDate(dateString, 'date.short') || '-'
  }

  // Format amount helper function
  const formatAmount = (amount: number, itemCurrencyCode?: string) =>
    formatCurrencyDisplay(amount, itemCurrencyCode ?? currencyCode)

  const columns: ColumnsType<ExpenseRequestItem> = [
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => (code === null || code === '' ? '-' : code),
      width: 100
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:calculation_rule_tab_custom_fields.custom_fields_modal.affected_expense_modal.title',
        'Title'
      ),
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ExpenseRequestItem) => {
        const isGeneratedAllowance =
          record?.expenseGroup?.value === 'Allowances' &&
          typeof text === 'string' &&
          text.trim().toLowerCase() === 'generated allowance'
        const displayTitle = isGeneratedAllowance
          ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.generated_allowance', 'Generated Allowance')
          : text
        return <span className="gba:font-semibold">{displayTitle}</span>
      }
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.multi_position_item',
        'Expense Group'
      ),
      key: 'expenseGroup',
      render: (_: unknown, record: ExpenseRequestItem) => {
        const isAllowance = record?.expenseGroup?.value === 'Allowances'
        const onePositionItem = record?.expensePosition?.length === 1
        const isMultipositionItem = record?.expensePosition?.length > 1
        if (isAllowance || onePositionItem) {
          const labelText = isAllowance
            ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.allowance', 'Allowance')
            : getCatalogValue(record?.expensePosition?.[0]?.expenseGroup) ||
              record?.expensePosition?.[0]?.expenseGroup?.value ||
              '-'
          return <Pill label={labelText} type="waiting" data-testid={`expense-group-pill-${labelText}`} />
        }
        if (isMultipositionItem) {
          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.multi_position_item',
                  'Multi Position Item'
                )}
              </span>
              <Icon icon={Check} size="sm" decorative />
            </div>
          )
        }
      }
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_class', 'Expense Class'),
      dataIndex: ['expenseClass', 'value'],
      key: 'expenseClass',
      render: (text: string, record) => {
        const entry: any = (record as any)?.expenseClass
        const hasTranslations = Array.isArray(entry?.translations) && entry.translations.length > 0
        const translated = hasTranslations ? getCatalogValue(entry) : ''
        // Normalize raw value before computing fallback
        const rawValue = (entry?.value ?? text ?? '').toString().trim()
        const isAllowance = rawValue.toLowerCase() === 'allowance'
        const allowanceLabel = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.allowance', 'Allowance')
        const label = translated || (isAllowance ? allowanceLabel : '') || rawValue || '-'
        return <span>{label}</span>
      }
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.date', 'Date'),
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date: string) => formatDateOnly(date),
      sorter: (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.expense_plan_table.total_amount',
        'Total Amount'
      ),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount: number, record) => (
        <span className="gba:font-semibold">{amount ? formatAmount(amount, record?.currency?.code) : '-'}</span>
      ),
      sorter: (a, b) => a.totalAmount - b.totalAmount
    },
    {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.reimbursable', 'Reimbursable'),
      dataIndex: 'reimbursableAmount',
      key: 'reimbursableAmount',
      align: 'right',
      render: (amount: number, record) => (amount ? formatAmount(amount, record?.currency?.code) : '-')
    },
    {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule_details.calculation_rule_tab_other_calculation.deductible',
        'Deductible'
      ),
      dataIndex: 'deductibleAmount',
      key: 'deductibleAmount',
      align: 'right',
      render: (amount: number, record) => (amount ? formatAmount(amount, record?.currency?.code) : '-')
    }
  ]

  // Calculate summary amounts for the KPI cards
  const summaryAmounts = useMemo(() => {
    if (!expenseRequestItems.length) {
      return {
        reimbursable: 0,
        nonReimbursable: 0,
        deductible: 0,
        nonDeductible: 0,
        total: 0
      }
    }

    return expenseRequestItems.reduce(
      (acc, item) => {
        // Calculate totals
        acc.reimbursable += item.reimbursableAmount || 0
        acc.deductible += item.deductibleAmount || 0
        acc.nonDeductible += item.nonDeductibleAmount || 0
        acc.total += item.totalAmount || 0

        // Calculate non-reimbursable (total minus reimbursable)
        const nonReimbursable = item.totalAmount - item.reimbursableAmount
        acc.nonReimbursable += nonReimbursable > 0 ? nonReimbursable : 0

        return acc
      },
      {
        reimbursable: 0,
        nonReimbursable: 0,
        deductible: 0,
        nonDeductible: 0,
        total: 0
      }
    )
  }, [expenseRequestItems])
  // KPI cards from design system
  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'total-amount',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_plan_table.total_amount',
          'Total Amount'
        ),
        value: formatAmount(summaryAmounts.total)
      },
      {
        id: 'reimbursable-amount',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.reimbursable', 'Reimbursable'),
        value: formatAmount(summaryAmounts.reimbursable)
      },
      {
        id: 'non-reimbursable-amount',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan.item.nonReimbursableAmount',
          'Non-Reimbursable'
        ),
        value: formatAmount(summaryAmounts.nonReimbursable)
      },
      {
        id: 'deductible-amount',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_rule_tab_other_calculation.deductible',
          'Deductible'
        ),
        value: formatAmount(summaryAmounts.deductible)
      },
      {
        id: 'non-deductible-amount',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.non_deductible', 'Non-Deductible'),
        value: formatAmount(summaryAmounts.nonDeductible)
      }
    ],
    [summaryAmounts, currencyCode]
  )

  return (
    <Card data-testid="expense-request-items" className="gba:p-8 gba:m-6">
      <CardHeader className="gba:border-b gba:border-gray-200">
        <CardTitle className="gba:text-lg gba:font-semibold gba:mb-4">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_records.request.expense_request_items',
            'Expense Request Items'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-0">
        <div className="gba:mb-6" data-testid="expense-request-summary-widgets">
          <SectionKpiCards
            cards={kpiCards}
            className="gba:!grid-cols-5 gba:md:!grid-cols-5 gba:lg:!grid-cols-5 gba:[&_[data-slot=card-title]]:!text-xl"
          />
        </div>
        <Table
          columns={columns}
          dataSource={expenseRequestItems.map((item, index) => ({ ...item, key: index }))}
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
          summary={pageData => <TableSummary pageData={pageData} formatAmount={formatAmount} />}
        />
      </CardContent>
    </Card>
  )
}

export default ExpenseRequestItems
