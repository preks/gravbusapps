import React from 'react'
import ExpenseRecordAdvancePayments from '../../../common/components/record/ExpenseRecordAdvancePayments'
import type { AdvancePayment } from '../types/expensePlanRecord.types'
import expensePlanRecordTranslations from '../_i18n'

interface ExpensePlanAdvancePaymentsProps {
  advancePayments: AdvancePayment[]
}

const ExpensePlanAdvancePayments: React.FC<ExpensePlanAdvancePaymentsProps> = ({ advancePayments }) => (
  <ExpenseRecordAdvancePayments
    advancePayments={advancePayments}
    i18nPrefix="expense-plan-record"
    translations={expensePlanRecordTranslations}
    cardClassName="gba:m-6 gba:border-none"
    dataTestId="expense-plan-advance-payments-card"
  />
)

export default ExpensePlanAdvancePayments
