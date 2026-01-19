import React from 'react'
import { Table } from 'antd'
import { AdvancePayment } from '../types/expensePlanRecord.types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../utils/currency'

interface ExpensePlanAdvancePaymentsSummaryProps {
  pageData: readonly AdvancePayment[]
  formatAmount?: (amount: number) => string
}

const ExpensePlanAdvancePaymentsSummary: React.FC<ExpensePlanAdvancePaymentsSummaryProps> = ({
  pageData,
  formatAmount
}) => {
  let totalAmount = 0

  pageData.forEach(({ amount }) => {
    totalAmount += amount
  })

  return (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <span className="gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align="right">
          <span className="gba:font-semibold">
            {formatAmount ? formatAmount(totalAmount) : formatCurrencyDisplay(totalAmount, pageData[0]?.currency?.code)}
          </span>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} colSpan={6} />
      </Table.Summary.Row>
    </Table.Summary>
  )
}

export default ExpensePlanAdvancePaymentsSummary
