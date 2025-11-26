import React from 'react'
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, CustomField, Currency } from '../../../types'
import { ExpenseGroupField } from './ExpenseGroupField'
import { ExpenseTypeField } from './ExpenseTypeField'
import { CustomFieldInput } from './CustomFieldInput'
import { AmountField } from './AmountField'
import { CostCenterField } from './CostCenterField'
import { ReimbursableField } from './ReimbursableField'

export interface PositionFormFieldsProps {
  position: ExpensePosition
  index: number
  positions: ExpensePosition[]
  setPositions: (positions: ExpensePosition[]) => void
  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  currencies?: Currency[]
  isProcessingFiles: boolean
  handleExpenseGroupChange: (value: string, positionIndex: number) => Promise<void>
  handleExpenseTypeChange: (value: string, positionIndex: number) => Promise<void>
  handleCurrencyChange?: (value: string) => void
  form: any
  showCurrencyField?: boolean
}

export const PositionFormFields: React.FC<PositionFormFieldsProps> = ({
  position,
  index,
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  currencies,
  isProcessingFiles,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleCurrencyChange,
  form,
  showCurrencyField = false
}) => {
  const updatePosition = (updates: Partial<ExpensePosition>) => {
    const updatedPositions = [...positions]
    updatedPositions[index] = { ...updatedPositions[index], ...updates }
    setPositions(updatedPositions)
  }

  return (
    <>
      <ExpenseGroupField
        index={index}
        value={position.expenseGroup}
        expenseGroups={expenseGroups}
        isProcessingFiles={isProcessingFiles}
        onChange={value => handleExpenseGroupChange(value, index)}
      />

      <ExpenseTypeField
        index={index}
        value={position.expenseType}
        expenseGroupId={position.expenseGroup}
        expenseTypes={expenseTypes}
        isProcessingFiles={isProcessingFiles}
        onChange={value => handleExpenseTypeChange(value, index)}
      />

      <CustomFieldInput
        index={index}
        value={position.customField}
        expenseTypeId={position.expenseType}
        customFields={customFields}
        isProcessingFiles={isProcessingFiles}
        form={form}
        onChange={value => updatePosition({ customField: value })}
      />

      <AmountField
        index={index}
        amountValue={position.amount}
        currencyValue={form.getFieldValue('currency')}
        currencies={currencies}
        isProcessingFiles={isProcessingFiles}
        form={form}
        showCurrencyField={showCurrencyField}
        onAmountChange={value => updatePosition({ amount: value })}
        onCurrencyChange={handleCurrencyChange}
      />

      <CostCenterField
        index={index}
        value={form.getFieldValue(`costCenter-${index}`) ?? position.costCenter}
        costCenters={costCenters}
        isProcessingFiles={isProcessingFiles}
        onChange={value => {
          updatePosition({ costCenter: value })
          form.setFieldsValue({ [`costCenter-${index}`]: value })
        }}
      />

      <ReimbursableField
        index={index}
        value={position.isReimbursable ?? false}
        isProcessingFiles={isProcessingFiles}
        onChange={value => updatePosition({ isReimbursable: value })}
      />
    </>
  )
}
