import React from 'react'
import type { Control } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, CatalogEntry } from '../types'
import CurrentSalaryDisplay from './CurrentSalaryDisplay'
import SalaryFrequencySelector from './SalaryFrequencySelector'
import SalaryCalculatorInputs from './SalaryCalculatorInputs'
import SalaryCalculationVisualization from './SalaryCalculationVisualization'
import SalaryAdjustmentFields from './SalaryAdjustmentFields'

export interface SalaryAdjustReasonEntry {
  id: string
  code: string
  value: string
  displayOrder: number | null
  translations: Array<{
    localeCode: string
    value: string
  }>
  catalog: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

export interface SalaryAdjustmentGroupProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  currentSalaryAnnual: number
  currentSalaryMonthly: number | null
  currentSalaryHourly: number | null
  currentCurrency: CatalogEntry | null
  locale: string
  salaryAdjustReasonEntries?: SalaryAdjustReasonEntry[]
}

const SalaryAdjustmentGroup: React.FC<SalaryAdjustmentGroupProps> = ({
  control,
  currentSalaryAnnual,
  currentSalaryMonthly,
  currentSalaryHourly,
  currentCurrency,
  locale,
  salaryAdjustReasonEntries
}) => {
  // Watch form values
  const adjustmentFrequency = useWatch({ control, name: 'adjustmentFrequency' }) || 'annually'
  const amountIncrease = useWatch({ control, name: 'amountIncrease' }) || null
  const percentageIncrease = useWatch({ control, name: 'percentageIncrease' }) || null

  return (
    <div className="gba:space-y-4" data-testid="adjust-employee-salary-details-group">
      {/* Frequency Selector */}
      <SalaryFrequencySelector control={control} />

      {/* Current Salary Display - Reduced top spacing */}
      <div className="gba:-mt-2">
        <CurrentSalaryDisplay
          currentSalaryAnnual={currentSalaryAnnual}
          currentSalaryMonthly={currentSalaryMonthly}
          currentSalaryHourly={currentSalaryHourly}
          currentCurrency={currentCurrency}
          selectedFrequency={adjustmentFrequency}
          locale={locale}
        />
      </div>

      {/* Amount and Percentage Inputs - Side by Side */}
      <SalaryCalculatorInputs control={control} adjustmentFrequency={adjustmentFrequency} />

      {/* Salary Adjustment Summary - Combines calculation and new salary preview */}
      <SalaryCalculationVisualization
        currentSalaryAnnual={currentSalaryAnnual}
        currentSalaryMonthly={currentSalaryMonthly}
        currentSalaryHourly={currentSalaryHourly}
        amountIncrease={amountIncrease}
        percentageIncrease={percentageIncrease}
        adjustmentFrequency={adjustmentFrequency}
        currentCurrency={currentCurrency}
        locale={locale}
      />

      {/* Other Form Fields */}
      <SalaryAdjustmentFields control={control} salaryAdjustReasonEntries={salaryAdjustReasonEntries} />
    </div>
  )
}

export default SalaryAdjustmentGroup
