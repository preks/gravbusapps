import React, { useMemo } from 'react'
import { Table } from 'antd'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useTranslation,
  SectionKpiCards,
  type KpiCardData
} from '@newwork/nw-design-system'
import type { ColumnsType } from 'antd/es/table'
import Pill from '@/components/pill'
import { ExpensePlanAmountTotals, ExpensePlanItem } from '../types/expensePlanRecord.types'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../utils/currency'
import { formatDate } from '@/common/utils/windowUtils'
import expensePlanRecordTranslations from '../_i18n'
import {
  getRecordKpiAmountFields,
  RECORD_EXPENSE_FIVE_KPI_CARDS_CLASSNAME
} from '../../../common/utils/recordExpenseKpiCards'

interface ExpensePlanItemsProps {
  expensePlanItems: ExpensePlanItem[]
  planTotals: ExpensePlanAmountTotals
  currencyCode?: string
}

// Table summary component defined outside parent component to fix lint error

function getPlanItemCostCenterLabel(record: ExpensePlanItem): string {
  const name = record.costCenter?.name?.trim()
  return name || '-'
}

const ExpensePlanItems: React.FC<ExpensePlanItemsProps> = ({ expensePlanItems, planTotals, currencyCode }) => {
  const { t } = useTranslation(expensePlanRecordTranslations)
  const loading = false

  // Date formatting via platform utility
  const formatDateOnly = (dateString: string | null) => {
    if (!dateString) return '-'
    return formatDate(dateString, 'date.short') || '-'
  }

  // Format amount helper function - prefer item currency when provided
  const formatAmount = (amount: number, itemCurrencyCode?: string) =>
    formatCurrencyDisplay(amount, itemCurrencyCode ?? currencyCode)

  const columns: ColumnsType<ExpensePlanItem> = [
    {
      title: t('expense-plan-record-column-code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => (code === null || code === '' ? '-' : code),
      width: 100
    },
    {
      title: t('expense-plan-record-column-title'),
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record) => {
        const isGeneratedAllowance =
          (record as any)?.expenseGroup?.value === 'Allowances' &&
          typeof text === 'string' &&
          text.trim().toLowerCase() === 'generated allowance'

        const displayTitle = isGeneratedAllowance ? t('expense-plan-record-generated-allowance') : text

        return <span className="gba:font-semibold">{displayTitle}</span>
      }
    },
    {
      title: t('expense-plan-record-column-expense-group'),
      dataIndex: ['expenseGroup', 'value'],
      key: 'expenseGroup',
      render: (_: string, record: ExpensePlanItem) => {
        const label = record.expenseGroup ? (getCatalogValue(record.expenseGroup) ?? _) : _
        return <Pill label={label} type="waiting" data-testid={`expense-group-pill-${label}`} />
      }
    },
    {
      title: t('expense-plan-record-column-expense-class'),
      dataIndex: ['expenseClass', 'value'],
      key: 'expenseClass',
      render: (_: string, record: ExpensePlanItem) => {
        const label = record.expenseClass ? (getCatalogValue(record.expenseClass) ?? _) : _
        return <span data-testid="expense-class-cell">{label}</span>
      }
    },
    {
      title: t('expense-plan-record-items-column-cost-center'),
      key: 'itemCostCenter',
      render: (_: unknown, record: ExpensePlanItem) => {
        const rowKey = record.id ?? record.code ?? ''
        return <span data-testid={`expense-plan-item-cost-center-${rowKey}`}>{getPlanItemCostCenterLabel(record)}</span>
      }
    },
    {
      title: t('expense-plan-record-column-date'),
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date: string) => formatDateOnly(date),
      sorter: (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    },
    {
      title: t('expense-plan-record-total-amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount: number, record) => (
        <span className="gba:font-semibold">{amount ? formatAmount(amount, record?.currency?.code) : '-'}</span>
      ),
      sorter: (a, b) => a.totalAmount - b.totalAmount
    },
    {
      title: t('expense-plan-record-column-reimbursable'),
      dataIndex: 'reimbursableAmount',
      key: 'reimbursableAmount',
      align: 'right',
      render: (amount: number, record) => (amount ? formatAmount(amount, record?.currency?.code) : '-')
    },
    {
      title: t('expense-plan-record-column-deductible'),
      dataIndex: 'deductibleAmount',
      key: 'deductibleAmount',
      align: 'right',
      render: (amount: number, record) => (amount ? formatAmount(amount, record?.currency?.code) : '-')
    }
  ]

  const kpiCards: KpiCardData[] = useMemo(
    () => [
      {
        id: 'total-amount',
        title: t('expense-plan-record-total-amount'),
        ...getRecordKpiAmountFields(planTotals.totalAmount, currencyCode)
      },
      {
        id: 'reimbursable-amount',
        title: t('expense-plan-record-column-reimbursable'),
        ...getRecordKpiAmountFields(planTotals.reimbursableAmount, currencyCode)
      },
      {
        id: 'non-reimbursable-amount',
        title: t('expense-plan-record-non-reimbursable'),
        ...getRecordKpiAmountFields(planTotals.nonReimbursableAmount, currencyCode)
      },
      {
        id: 'deductible-amount',
        title: t('expense-plan-record-column-deductible'),
        ...getRecordKpiAmountFields(planTotals.deductibleAmount, currencyCode)
      },
      {
        id: 'non-deductible-amount',
        title: t('expense-plan-record-non-deductible'),
        ...getRecordKpiAmountFields(planTotals.nonDeductibleAmount, currencyCode)
      }
    ],
    [planTotals, currencyCode, t]
  )

  return (
    <Card data-testid="expense-plan-items" className="gba:p-0 gba:border-none">
      <CardHeader className="gba:px-0">
        <CardTitle className="gba:text-lg gba:font-semibold gba:mb-4">
          {t('expense-plan-record-expense-plan-items')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-0">
        <div className="gba:mb-6" data-testid="expense-plan-summary-widgets">
          <div data-testid="expense-plan-kpi-cards">
            <SectionKpiCards cards={kpiCards} className={RECORD_EXPENSE_FIVE_KPI_CARDS_CLASSNAME} />
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={expensePlanItems.map((item, index) => ({
            ...item,
            key: item.id ?? `${item.code ?? 'row'}-${index}`
          }))}
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <span className="gba:font-semibold">{t('expense-plan-record-total')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <span className="gba:font-semibold">{formatAmount(planTotals.totalAmount)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span>{formatAmount(planTotals.reimbursableAmount)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <span>{formatAmount(planTotals.deductibleAmount)}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </CardContent>
    </Card>
  )
}

export default ExpensePlanItems
