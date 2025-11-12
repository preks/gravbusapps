import React, { useMemo } from 'react'
import type { Control } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import type { AdjustEmployeeSalaryFormValues, CatalogEntry } from '../types'
import { calculateAmountFromPercentage } from '../utils/salaryCalculator'
import CurrentSalaryDisplay from './CurrentSalaryDisplay'
import SalaryCalculatorInputs from './SalaryCalculatorInputs'
import NewSalaryPreview from './NewSalaryPreview'
import SalaryAdjustmentFields from './SalaryAdjustmentFields'

export interface SalaryAdjustmentGroupProps {
  control: Control<AdjustEmployeeSalaryFormValues>
  setValue: (name: keyof AdjustEmployeeSalaryFormValues, value: any) => void
  catalogs: {
    currency?: CatalogEntry[]
  }
  currentSalary: number
  currentCurrency: CatalogEntry | null
  locale: string
}

const SalaryAdjustmentGroup: React.FC<SalaryAdjustmentGroupProps> = ({
  control,
  setValue,
  catalogs,
  currentSalary,
  currentCurrency,
  locale
}) => {
  // Watch form values for calculator
  const amountIncrease = useWatch({ control, name: 'amountIncrease' }) || null
  const percentageIncrease = useWatch({ control, name: 'percentageIncrease' }) || null

  // Calculate new salary based on whichever value is available
  const newSalary = useMemo(() => {
    if (amountIncrease && amountIncrease > 0) {
      return currentSalary + amountIncrease
    }
    if (percentageIncrease && percentageIncrease > 0) {
      const increaseAmount = calculateAmountFromPercentage(currentSalary, percentageIncrease)
      return currentSalary + increaseAmount
    }
    return currentSalary
  }, [currentSalary, amountIncrease, percentageIncrease])

  return (
    <div className="gba:space-y-4" data-testid="adjust-employee-salary-details-group">
      {/* Current Salary Display */}
      <CurrentSalaryDisplay currentSalary={currentSalary} currentCurrency={currentCurrency} locale={locale} />

      {/* Amount and Percentage Inputs - Side by Side */}
      <SalaryCalculatorInputs control={control} setValue={setValue} currentSalary={currentSalary} />

      {/* New Salary Preview */}
      <NewSalaryPreview
        currentSalary={currentSalary}
        newSalary={newSalary}
        amountIncrease={amountIncrease}
        percentageIncrease={percentageIncrease}
        currentCurrency={currentCurrency}
        locale={locale}
      />

      {/* Other Form Fields */}
      <SalaryAdjustmentFields control={control} catalogs={catalogs} />
    </div>
  )
}

export default SalaryAdjustmentGroup
