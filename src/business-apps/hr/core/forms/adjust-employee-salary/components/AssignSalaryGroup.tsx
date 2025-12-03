import React from 'react'
import type { Control } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, CurrencyOption } from '../types'
import SalaryTypeSelector from './SalaryTypeSelector'
import DirectSalaryInputs from './DirectSalaryInputs'
import CurrencySelector from './CurrencySelector'
import AssignSalaryFields from './AssignSalaryFields'

export interface AssignSalaryGroupProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currencies: CurrencyOption[]
  currencyCode: string
  locale: string
}

const AssignSalaryGroup: React.FC<AssignSalaryGroupProps> = ({ control, currencies, currencyCode, locale }) => {
  return (
    <div className="gba:space-y-4" data-testid="assign-employee-salary-details-group">
      {/* Salary Type Selector (Yearly/Monthly or Hourly) */}
      <SalaryTypeSelector control={control} />

      {/* Currency Selector */}
      <CurrencySelector control={control} currencies={currencies} />

      {/* Direct Salary Inputs (based on selected type) */}
      <DirectSalaryInputs control={control} currencyCode={currencyCode} locale={locale} />

      {/* Start Date and Notes */}
      <AssignSalaryFields control={control} />
    </div>
  )
}

export default AssignSalaryGroup
