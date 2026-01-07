import React from 'react'
import { Card } from '@newwork/gravity-ui-catalog'
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils'
import { ICONS } from '../../../../utils/icons'

/**
 * ExpenseItemCard component props
 */
interface ExpenseItemCardProps {
  id: string
  title: string
  expenseGroup: string
  expenseType: string
  costCenter: string
  amount: string
  currency: string
  attachmentDate?: string
  onDelete?: (id: string) => void
}

/**
 * ExpenseItemCard component for displaying expense item details
 * @param props - Component props
 * @returns ExpenseItemCard component
 */
const ExpenseItemCard: React.FC<ExpenseItemCardProps> = ({
  id,
  title,
  expenseGroup,
  expenseType,
  costCenter,
  amount,
  currency,
  attachmentDate,
  onDelete
}) => {
  return (
    <Card className="gba:p-0 gba:overflow-hidden gba:rounded-none" data-testid={`expense-item-card-${id}`}>
      <div className="gba:p-10 gba:flex gba:flex-row gba:justify-between gba:items-stretch gba:box-border gba:min-h-[120px]">
        <div className="gba:flex gba:flex-col">
          <div className="gba:text-sm" data-testid={`expense-item-type-${id}`}>
            {expenseGroup}
            {expenseType && ': '}
            {expenseType}
          </div>
          <div className="gba:text-[18px] gba:font-bold gba:mt-[10px]" data-testid={`expense-item-title-${id}`}>
            {title}
          </div>
          <div className="gba:text-sm" data-testid={`expense-item-cost-center-${id}`}>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_label',
              'Cost center'
            )}
            : {costCenter}
          </div>
          {attachmentDate && (
            <div className="gba:mt-[20px]">
              <div
                className="gba:flex gba:items-center gba:gap-1 gba:text-sm"
                data-testid={`expense-item-receipt-${id}`}
              >
                <img src={ICONS.ATTACHMENT} alt="Attachment" className="gba:w-4 gba:h-4" />
                <span>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.receipt', 'Receipt')}{' '}
                  <span className="gba:mx-1"> </span>{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.created', 'Created')}{' '}
                  {attachmentDate}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="gba:flex gba:flex-col gba:self-stretch gba:w-1/4">
          <div>
            {onDelete && (
              <div className="gba:w-[100%] gba:flex gba:justify-end">
                <button
                  className="gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-full gba:w-8 gba:h-8 gba:p-0 gba:border-none gba:cursor-pointer"
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(id)
                  }}
                  data-testid={`delete-item-button-${id}`}
                >
                  <img src={ICONS.DELETE} alt="Delete" className="gba:w-4 gba:h-4" />
                </button>
              </div>
            )}
          </div>
          <div
            className="gba:text-[18px] gba:font-bold gba:mt-auto justify:end"
            style={{ alignSelf: 'flex-end' }}
            data-testid={`expense-item-amount-${id}`}
          >
            {formatNumberFunction(amount)} {currency}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ExpenseItemCard
