import React from 'react'
import ExpenseRecordAllowances from '../../../common/components/record/ExpenseRecordAllowances'
import type { ExpenseAllowance } from '../types/expensePlanRecord.types'
import expensePlanRecordTranslations from '../_i18n'

interface ExpensePlanAllowancesProps {
  expenseAllowances: ExpenseAllowance[]
  currencyCode?: string
}

const ExpensePlanAllowances: React.FC<ExpensePlanAllowancesProps> = ({ expenseAllowances, currencyCode }) => (
  <ExpenseRecordAllowances
    expenseAllowances={expenseAllowances}
    i18nPrefix="expense-plan-record"
    translations={expensePlanRecordTranslations}
    dataTestId="expense-plan-allowances"
    currencyCode={currencyCode}
  />
)

export default ExpensePlanAllowances
