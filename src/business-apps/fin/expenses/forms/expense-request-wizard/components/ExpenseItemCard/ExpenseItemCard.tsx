import React from 'react'
import { Card } from '@newwork/gravity-ui-catalog'
import { Warning } from '@phosphor-icons/react'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { useExpenseRequestCreationTranslation } from '../../../expense-request-creation/useExpenseRequestCreationTranslation'
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
  missingFields?: string[]
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
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
  missingFields,
  onDelete,
  onEdit
}) => {
  const { t } = useExpenseRequestCreationTranslation()
  const hasMissingFields = missingFields && missingFields.length > 0
  return (
    <Card className="gba:p-0 gba:overflow-hidden gba:rounded-none" data-testid={`expense-item-card-${id}`}>
      {hasMissingFields && (
        <div
          className="gba:flex gba:items-start gba:gap-2 gba:px-10 gba:py-2 gba:bg-destructive/10 gba:border-b gba:border-destructive/20"
          data-testid={`expense-item-missing-fields-${id}`}
        >
          <Warning size={16} className="gba:text-destructive gba:mt-0.5 gba:shrink-0" />
          <span className="gba:text-xs gba:text-destructive">
            {t('expense-item-card-missing-fields-warning')}
            {': '}
            {missingFields.join(', ')}
            {'. '}
            {t('expense-item-card-update-before-adding')}
          </span>
        </div>
      )}
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
            {t('current-cost-center-label')}: {costCenter}
          </div>
          {attachmentDate && (
            <div className="gba:mt-[20px]">
              <div
                className="gba:flex gba:items-center gba:gap-1 gba:text-sm"
                data-testid={`expense-item-receipt-${id}`}
              >
                <img src={ICONS.ATTACHMENT} alt="" className="gba:w-4 gba:h-4" role="presentation" />
                <span>
                  {t('expense-item-card-receipt')} <span className="gba:mx-1"> </span> {t('expense-item-card-created')}{' '}
                  {attachmentDate}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="gba:flex gba:flex-col gba:self-stretch gba:w-1/4">
          <div>
            {(onEdit || onDelete) && (
              <div className="gba:w-[100%] gba:flex gba:justify-end gba:gap-2">
                {onEdit && (
                  <button
                    className="gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-full gba:w-8 gba:h-8 gba:p-0 gba:border-none gba:cursor-pointer"
                    onClick={e => {
                      e.stopPropagation()
                      onEdit(id)
                    }}
                    data-testid={`edit-item-button-${id}`}
                  >
                    <img src={ICONS.EDIT_ICON} alt="" className="gba:w-4 gba:h-4" role="presentation" />
                  </button>
                )}
                {onDelete && (
                  <button
                    className="gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-full gba:w-8 gba:h-8 gba:p-0 gba:border-none gba:cursor-pointer"
                    onClick={e => {
                      e.stopPropagation()
                      onDelete(id)
                    }}
                    data-testid={`delete-item-button-${id}`}
                  >
                    <img src={ICONS.DELETE} alt="" className="gba:w-4 gba:h-4" role="presentation" />
                  </button>
                )}
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
