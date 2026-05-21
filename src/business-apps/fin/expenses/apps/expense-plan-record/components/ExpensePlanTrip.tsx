import React from 'react'
import ExpenseRecordTrip from '../../../common/components/record/ExpenseRecordTrip'
import type { ExpenseRequestTrip } from '../types/expensePlanRecord.types'
import expensePlanRecordTranslations from '../_i18n'

interface ExpensePlanTripProps {
  expenseRequestTrips: ExpenseRequestTrip[]
}

const ExpensePlanTrip: React.FC<ExpensePlanTripProps> = ({ expenseRequestTrips }) => (
  <ExpenseRecordTrip
    expenseRequestTrips={expenseRequestTrips}
    i18nPrefix="expense-plan-record"
    translations={expensePlanRecordTranslations}
    dataTestId="expense-plan-trip"
  />
)

export default ExpensePlanTrip
