import React from 'react'
import { Table } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import { ExpensePlanItem } from '../types/expensePlanRecord.types'
import { formatCurrencyDisplay } from '../utils/currency'
import expensePlanRecordTranslations from '../_i18n'

interface ExpensePlanItemsSummaryProps {
  pageData: readonly ExpensePlanItem[]
  formatAmount?: (amount: number) => string
  currencyCode?: string
}

const ExpensePlanItemsSummary: React.FC<ExpensePlanItemsSummaryProps> = ({ pageData, formatAmount, currencyCode }) => {
  const { t } = useTranslation(expensePlanRecordTranslations)
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
          <span className="gba:font-semibold">{t('expense-plan-record-total')}</span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={5} align="right">
          <span className="gba:font-semibold">
            {formatAmount ? formatAmount(totalAmount) : formatCurrencyDisplay(totalAmount, currencyCode)}
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={6} align="right">
          <span>
            {formatAmount ? formatAmount(totalReimbursable) : formatCurrencyDisplay(totalReimbursable, currencyCode)}
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={7} align="right">
          <span>
            {formatAmount ? formatAmount(totalDeductible) : formatCurrencyDisplay(totalDeductible, currencyCode)}
          </span>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  )
}

export default ExpensePlanItemsSummary
