import React, { useMemo, useState } from 'react'
import { Table } from 'antd'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Icon,
  Sheet,
  SheetContent,
  SheetTitle,
  useTranslation
} from '@newwork/nw-design-system'
import type { ColumnsType } from 'antd/es/table'
import Pill from '@/components/pill'
import { ExpenseRequestAmountTotals, ExpenseRequestItem } from '../types/expenseRequestRecord.types'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { SectionKpiCards, type KpiCardData } from '@newwork/nw-design-system'
import { Check } from '@phosphor-icons/react'
import { formatCurrencyDisplay } from '../../expense-plan-record/utils/currency'
import { formatDate } from '@/common/utils/windowUtils'
import { ExpenseDetailsShell } from '../../../common/components/details-panel/ExpenseDetailsShell'
import { ExpenseItemDetails } from '../../personal-expenses/components/tabs/expense-items-tab/details/ExpenseItemDetails'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpensePositionsSection from './ExpensePositionsSection'
import expenseRequestRecordTranslations from '../_i18n'
import {
  getRecordKpiAmountFields,
  RECORD_EXPENSE_FIVE_KPI_CARDS_CLASSNAME
} from '../../../common/utils/recordExpenseKpiCards'

interface ExpenseRequestItemsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  expenseRequestItems: ExpenseRequestItem[]
  requestTotals: ExpenseRequestAmountTotals
  currencyCode?: string
  /** The employee ID of the expense owner (for fetching file attachments) */
  expenseOwnerEmployeeId?: string
}

// Table summary component defined outside parent component to fix lint error
interface TableSummaryProps {
  requestTotals: ExpenseRequestAmountTotals
  formatAmount: (amount: number) => string
}

const TableSummary: React.FC<TableSummaryProps> = ({ requestTotals, formatAmount }) => {
  const { t } = useTranslation(expenseRequestRecordTranslations)

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0} colSpan={6}>
          <span className="gba:font-semibold">{t('expense-request-record-total')}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <span className="gba:font-semibold">{formatAmount(requestTotals.totalAmount)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <span>{formatAmount(requestTotals.reimbursableAmount)}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={8} align="right">
          <span>{formatAmount(requestTotals.deductibleAmount)}</span>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  )
}

const ExpenseRequestItems: React.FC<ExpenseRequestItemsProps> = ({
  expenseRequestItems,
  requestTotals,
  currencyCode,
  accessToken,
  userInfo,
  expenseOwnerEmployeeId
}) => {
  const { t } = useTranslation(expenseRequestRecordTranslations)
  const loading = false

  const getExpenseItemCostCenterLabel = (record: ExpenseRequestItem): string => {
    const positions = record.expensePosition ?? []
    if (positions.length > 1) {
      const labels = positions.map(p => p.costCenter?.name?.trim() ?? '')
      const distinctKeys = new Set(labels.map(label => label.toLowerCase()))
      if (distinctKeys.size <= 1) {
        const single = labels.find(label => label.length > 0) ?? ''
        return single || '-'
      }
      return t('expense-request-record-item-cost-center-multiple')
    }
    if (positions.length === 1) {
      const name = positions[0]?.costCenter?.name?.trim()
      return name || '-'
    }
    return '-'
  }

  // State for selected item and sheet visibility
  const [selectedItem, setSelectedItem] = useState<ExpenseRequestItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Handle row click to open details sheet
  const handleRowClick = (record: ExpenseRequestItem) => {
    setSelectedItem(record)
    setIsSheetOpen(true)
  }

  // Handle closing the details sheet
  const handleCloseDetails = () => {
    setIsSheetOpen(false)
    setSelectedItem(null)
  }
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
      title: t('expense-request-record-column-code'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => (code === null || code === '' ? '-' : code),
      width: 100
    },
    {
      title: t('expense-request-record-column-title'),
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ExpenseRequestItem) => {
        const isGeneratedAllowance =
          record?.expenseGroup?.value === 'Allowances' &&
          typeof text === 'string' &&
          text.trim().toLowerCase() === 'generated allowance'
        const displayTitle = isGeneratedAllowance ? t('expense-request-record-generated-allowance') : text
        return <span className="gba:font-semibold">{displayTitle}</span>
      }
    },
    {
      title: t('expense-request-record-column-expense-group'),
      key: 'expenseGroup',
      render: (_: unknown, record: ExpenseRequestItem) => {
        const isAllowance = record?.expenseGroup?.value === 'Allowances'
        const onePositionItem = record?.expensePosition?.length === 1
        const isMultipositionItem = record?.expensePosition?.length > 1
        if (isAllowance || onePositionItem) {
          const labelText = isAllowance
            ? t('expense-request-record-allowance')
            : getCatalogValue(record?.expensePosition?.[0]?.expenseGroup) ||
              record?.expensePosition?.[0]?.expenseGroup?.value ||
              '-'
          return <Pill label={labelText} type="waiting" data-testid={`expense-group-pill-${labelText}`} />
        }
        if (isMultipositionItem) {
          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:font-semibold">{t('expense-request-record-multi-position-item')}</span>
              <Icon icon={Check} size="sm" decorative />
            </div>
          )
        }
      }
    },
    {
      title: t('expense-request-record-column-expense-class'),
      dataIndex: ['expenseClass', 'value'],
      key: 'expenseClass',
      render: (text: string, record) => {
        const entry: any = (record as any)?.expenseClass
        const hasTranslations = Array.isArray(entry?.translations) && entry.translations.length > 0
        const translated = hasTranslations ? getCatalogValue(entry) : ''
        // Normalize raw value before computing fallback
        const rawValue = (entry?.value ?? text ?? '').toString().trim()
        const isAllowance = rawValue.toLowerCase() === 'allowance'
        const allowanceLabel = t('expense-request-record-allowance')
        const label = translated || (isAllowance ? allowanceLabel : '') || rawValue || '-'
        return <span>{label}</span>
      }
    },
    {
      title: t('expense-request-record-items-column-cost-center'),
      key: 'itemCostCenter',
      render: (_: unknown, record: ExpenseRequestItem) => (
        <span data-testid={`expense-request-item-cost-center-${record.id}`}>
          {getExpenseItemCostCenterLabel(record)}
        </span>
      )
    },
    {
      title: t('expense-request-record-column-date'),
      dataIndex: 'expenseDate',
      key: 'expenseDate',
      render: (date: string) => formatDateOnly(date),
      sorter: (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    },
    {
      title: t('expense-request-record-total-amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount: number, record) => (
        <span className="gba:font-semibold">{amount ? formatAmount(amount, record?.currency?.code) : '-'}</span>
      ),
      sorter: (a, b) => a.totalAmount - b.totalAmount
    },
    {
      title: t('expense-request-record-column-reimbursable'),
      dataIndex: 'reimbursableAmount',
      key: 'reimbursableAmount',
      align: 'right',
      render: (amount: number, record) => (amount ? formatAmount(amount, record?.currency?.code) : '-')
    },
    {
      title: t('expense-request-record-column-deductible'),
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
        title: t('expense-request-record-total-amount'),
        ...getRecordKpiAmountFields(requestTotals.totalAmount, currencyCode)
      },
      {
        id: 'reimbursable-amount',
        title: t('expense-request-record-column-reimbursable'),
        ...getRecordKpiAmountFields(requestTotals.reimbursableAmount, currencyCode)
      },
      {
        id: 'non-reimbursable-amount',
        title: t('expense-request-record-non-reimbursable'),
        ...getRecordKpiAmountFields(requestTotals.nonReimbursableAmount, currencyCode)
      },
      {
        id: 'deductible-amount',
        title: t('expense-request-record-column-deductible'),
        ...getRecordKpiAmountFields(requestTotals.deductibleAmount, currencyCode)
      },
      {
        id: 'non-deductible-amount',
        title: t('expense-request-record-non-deductible'),
        ...getRecordKpiAmountFields(requestTotals.nonDeductibleAmount, currencyCode)
      }
    ],
    [requestTotals, currencyCode, t]
  )

  return (
    <Card data-testid="expense-request-items" className="gba:p-0 gba:border-none">
      <CardHeader className="gba:px-0">
        <CardTitle className="gba:text-lg gba:font-semibold gba:mb-4">
          {t('expense-request-record-expense-request-items')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:p-0">
        <div className="gba:mb-6" data-testid="expense-request-summary-widgets">
          <SectionKpiCards cards={kpiCards} className={RECORD_EXPENSE_FIVE_KPI_CARDS_CLASSNAME} />
        </div>
        <Table
          columns={columns}
          dataSource={expenseRequestItems.map((item, index) => ({ ...item, key: item.id || index }))}
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 'max-content' }}
          summary={() => <TableSummary requestTotals={requestTotals} formatAmount={formatAmount} />}
          onRow={record => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' }
          })}
          rowClassName="gba:hover:bg-muted/50 gba:transition-colors"
        />
      </CardContent>

      {/* Expense Item Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none" aria-describedby={undefined}>
          <SheetTitle className="gba:sr-only">
            {selectedItem?.title || t('expense-request-record-expense-item-details')}
          </SheetTitle>
          <ExpenseDetailsShell title={selectedItem?.title || t('expense-request-record-expense-item-details')}>
            {selectedItem && accessToken ? (
              <>
                <ExpenseItemDetails
                  selectedItem={
                    {
                      ...selectedItem,
                      // Ensure status is always a string to prevent charAt error
                      status: selectedItem.status || 'CREATED'
                    } as any
                  }
                  onClose={handleCloseDetails}
                  accessToken={accessToken}
                  userInfo={
                    userInfo && expenseOwnerEmployeeId
                      ? {
                          ...userInfo,
                          employeeDetails: {
                            ...userInfo.employeeDetails,
                            employeeId: expenseOwnerEmployeeId
                          }
                        }
                      : userInfo
                  }
                />
                {/* Show expense positions for multi-position items */}
                <ExpensePositionsSection
                  positions={selectedItem.expensePosition}
                  currencyCode={selectedItem.currency?.code || currencyCode}
                />
              </>
            ) : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

export default ExpenseRequestItems
