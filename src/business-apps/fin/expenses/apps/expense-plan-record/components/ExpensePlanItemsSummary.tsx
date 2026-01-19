import React from 'react'
import { Table } from 'antd'
import { ExpensePlanItem } from '../types/expensePlanRecord.types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../utils/currency'

interface ExpensePlanItemsSummaryProps {
  pageData: readonly ExpensePlanItem[]
  formatAmount?: (amount: number) => string
  currencyCode?: string
}

const ExpensePlanItemsSummary: React.FC<ExpensePlanItemsSummaryProps> = ({ pageData, formatAmount, currencyCode }) => {
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
