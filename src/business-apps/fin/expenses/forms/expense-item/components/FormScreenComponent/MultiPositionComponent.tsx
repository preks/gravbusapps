import React from 'react'
import { Button } from '@newwork/gravity-ui-catalog'
import { Card } from 'antd'
import { ExpensePosition, ExpenseGroup, ExpenseType, CostCenter, CustomField } from '../../types'
import { useExpenseItem } from '../../context/ExpenseItemContext'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { PositionFormFields } from './shared/PositionFormFields'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface MultiPositionComponentProps {
  positions: ExpensePosition[]
  setPositions: (positions: ExpensePosition[]) => void
  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  handleExpenseGroupChange: (value: string, positionIndex: number) => Promise<void>
  handleExpenseTypeChange: (value: string, positionIndex: number) => Promise<void>
  handleRemovePosition: (positionId: string) => void
  lastPositionCardRef?: React.LegacyRef<HTMLDivElement>
}

export const MultiPositionComponent: React.FC<MultiPositionComponentProps> = ({
  positions,
  setPositions,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleRemovePosition,
  lastPositionCardRef
}) => {
  const { isProcessingFiles, form, hasLinkedExpenseRequest } = useExpenseItem()

  return (
    <div data-testid="multi-position-container">
      {positions.map((position, index) => {
        const isLastPosition = index === positions.length - 1
        const card = (
          <Card
            key={index}
            title={`Position ${index + 1}`}
            className="gba:mb-4 gba:border-[3px] gba:border-border"
            data-testid={`position-card-${index}`}
            extra={
              positions.length > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => handleRemovePosition(position.id)}
                  className="gba:text-destructive gba:hover:text-destructive gba:hover:bg-destructive/10"
                  disabled={isProcessingFiles}
                  data-testid={`delete-position-button-${index}`}
                >
                  <img
                    src={ICONS.DELETE}
                    alt={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_type_item.delete_position',
                      'Delete Position'
                    )}
                    width="16"
                    height="16"
                    data-testid="delete-position-icon"
                  />
                </Button>
              )
            }
            headStyle={{ borderBottom: 'none' }}
          >
            <PositionFormFields
              position={position}
              index={index}
              positions={positions}
              setPositions={setPositions}
              expenseGroups={expenseGroups}
              expenseTypes={expenseTypes}
              customFields={customFields}
              costCenters={costCenters}
              isProcessingFiles={isProcessingFiles}
              handleExpenseGroupChange={handleExpenseGroupChange}
              handleExpenseTypeChange={handleExpenseTypeChange}
              form={form}
              showCurrencyField={false}
              hasLinkedExpenseRequest={hasLinkedExpenseRequest}
            />
          </Card>
        )
        return isLastPosition && lastPositionCardRef ? (
          <div
            key={index}
            ref={lastPositionCardRef}
            tabIndex={0}
            className="gba:outline-none"
            data-testid={`position-card-wrapper-${index}`}
          >
            {card}
          </div>
        ) : (
          card
        )
      })}
    </div>
  )
}

export default MultiPositionComponent
