import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SectionKpiCards,
  type KpiCardData
} from '@newwork/nw-design-system'
import { PiLink } from 'react-icons/pi'
import { ExpensePlanItem } from '../types/expensePlanV2Types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDateTime } from '@/business-apps/core/every/apps/every-box/utils/taskFormatters'
import Pill from '@/components/pill'

interface ExpensePlanItemsSectionProps {
  expensePlanItems: ExpensePlanItem[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  getCatalogValue: (item: any) => string | null
  prefixDataTestId?: string
}

const ExpensePlanItemsSection: React.FC<ExpensePlanItemsSectionProps> = ({
  expensePlanItems,
  currencyCode,
  formatCurrency,
  getCatalogValue,
  prefixDataTestId = 'approve-expense-plan-v2'
}) => {
  // Date formatting helper - use formatDateTime from every-box
  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '-'
    return formatDateTime(dateString)
  }

  // Format amount helper function - prefer item currency when provided
  const formatAmount = (amount: number | undefined, itemCurrencyCode?: string) => {
    if (!amount && amount !== 0) return '-'
    return formatCurrency(amount, itemCurrencyCode ?? currencyCode)
  }

  // Calculate summary amounts for the KPI cards
  const summaryAmounts = useMemo(() => {
    if (!expensePlanItems.length) {
      return {
        reimbursable: 0,
        nonReimbursable: 0,
        deductible: 0,
        nonDeductible: 0,
        total: 0
      }
    }

    return expensePlanItems.reduce(
      (acc, item) => {
        // Calculate totals
        acc.reimbursable += item.reimbursableAmount || 0
        acc.deductible += item.deductibleAmount || 0
        acc.nonDeductible += item.nonDeductibleAmount || 0
        acc.total += item.totalAmount || 0

        // Calculate non-reimbursable (total minus reimbursable)
        const nonReimbursable = item.totalAmount - (item.reimbursableAmount || 0)
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
  }, [expensePlanItems])

  // Build KPI cards
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
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.non-reimbursable', 'Non-Reimbursable'),
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
    [summaryAmounts, formatAmount]
  )

  // Calculate totals for table footer
  const tableTotals = useMemo(() => {
    return expensePlanItems.reduce(
      (acc, item) => {
        acc.total += item.totalAmount || 0
        acc.reimbursable += item.reimbursableAmount || 0
        acc.deductible += item.deductibleAmount || 0
        return acc
      },
      { total: 0, reimbursable: 0, deductible: 0 }
    )
  }, [expensePlanItems])

  if (!expensePlanItems || expensePlanItems.length === 0) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-items-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiLink className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.expense_plan_items', 'Expense Plan Items')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-6">
        {/* KPI Cards */}
        <div data-testid={`${prefixDataTestId}-items-summary-cards`}>
          <SectionKpiCards
            cards={kpiCards}
            className="gba:!grid-cols-5 gba:md:!grid-cols-5 gba:lg:!grid-cols-5 gba:[&_[data-slot=card-title]]:!text-sm gba:[&_[data-slot=card-value]]:!text-lg gba:!gap-2"
          />
        </div>

        {/* Items Table */}
        <div className="gba:overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Code')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_item.change_expense_item_container.current_expense_group_label',
                    'Expense Group'
                  )}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_class', 'Expense Class')}
                </TableHead>
                <TableHead>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.date', 'Date')}
                </TableHead>
                <TableHead className="gba:text-right">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.total_amount',
                    'Total Amount'
                  )}
                </TableHead>
                <TableHead className="gba:text-right">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.reimbursable', 'Reimbursable')}
                </TableHead>
                <TableHead className="gba:text-right">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule_details.calculation_rule_tab_other_calculation.deductible',
                    'Deductible'
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensePlanItems.map((item, index) => {
                const isGeneratedAllowance =
                  item.expenseGroup?.value === 'Allowances' &&
                  typeof item.title === 'string' &&
                  item.title.trim().toLowerCase() === 'generated allowance'

                const displayTitle = isGeneratedAllowance
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:personal_expenses.generated_allowance',
                      'Generated Allowance'
                    )
                  : item.title

                const expenseGroupLabel = item.expenseGroup
                  ? (getCatalogValue(item.expenseGroup) ?? item.expenseGroup.value)
                  : '-'
                const expenseClassLabel = item.expenseClass
                  ? (getCatalogValue(item.expenseClass) ?? item.expenseClass.value)
                  : '-'

                return (
                  <TableRow key={item.id || index} data-testid={`${prefixDataTestId}-item-row-${index}`}>
                    <TableCell>{item.code || '-'}</TableCell>
                    <TableCell className="gba:font-semibold">{displayTitle}</TableCell>
                    <TableCell>
                      <Pill
                        label={expenseGroupLabel}
                        type="waiting"
                        data-testid={`${prefixDataTestId}-expense-group-pill-${index}`}
                      />
                    </TableCell>
                    <TableCell data-testid={`${prefixDataTestId}-expense-class-cell-${index}`}>
                      {expenseClassLabel}
                    </TableCell>
                    <TableCell>{formatDateDisplay(item.expenseDate)}</TableCell>
                    <TableCell className="gba:text-right gba:font-semibold">
                      {formatAmount(item.totalAmount, item.currency?.code)}
                    </TableCell>
                    <TableCell className="gba:text-right">
                      {formatAmount(item.reimbursableAmount, item.currency?.code)}
                    </TableCell>
                    <TableCell className="gba:text-right">
                      {formatAmount(item.deductibleAmount, item.currency?.code)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {/* Total Row */}
              <TableRow className="gba:font-semibold" data-testid={`${prefixDataTestId}-items-total-row`}>
                <TableCell colSpan={5}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
                </TableCell>
                <TableCell className="gba:text-right">{formatAmount(tableTotals.total)}</TableCell>
                <TableCell className="gba:text-right">{formatAmount(tableTotals.reimbursable)}</TableCell>
                <TableCell className="gba:text-right">{formatAmount(tableTotals.deductible)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExpensePlanItemsSection
