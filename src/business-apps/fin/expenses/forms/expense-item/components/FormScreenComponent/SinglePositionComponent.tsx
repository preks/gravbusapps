import React from 'react'
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, CustomField, Currency } from '../../types'
import { useExpenseItem } from '../../context/ExpenseItemContext'
import { PositionFormFields } from './shared/PositionFormFields'

interface SinglePositionComponentProps {
  positions: ExpensePosition[]
  setPositions: (positions: ExpensePosition[]) => void
  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  currencies: Currency[]
  handleExpenseGroupChange: (value: string, positionIndex: number) => Promise<void>
  handleExpenseTypeChange: (value: string, positionIndex: number) => Promise<void>
}

export const SinglePositionComponent: React.FC<SinglePositionComponentProps> = ({
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  currencies,
  handleExpenseGroupChange,
  handleExpenseTypeChange
}) => {
  const { isProcessingFiles, form, handleCurrencyChange, hasLinkedExpenseRequest } = useExpenseItem()

  return (
    <div data-testid="single-position-container">
      {positions.map((position, index) => (
        <PositionFormFields
          key={index}
          position={position}
          index={index}
          positions={positions}
          setPositions={setPositions}
          expenseGroups={expenseGroups}
          expenseTypes={expenseTypes}
          customFields={customFields}
          costCenters={costCenters}
          currencies={currencies}
          isProcessingFiles={isProcessingFiles}
          handleExpenseGroupChange={handleExpenseGroupChange}
          handleExpenseTypeChange={handleExpenseTypeChange}
          handleCurrencyChange={handleCurrencyChange}
          form={form}
          showCurrencyField={true}
          hasLinkedExpenseRequest={hasLinkedExpenseRequest}
        />
      ))}
    </div>
  )
}

export default SinglePositionComponent
