import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import ExpenseItemDetails from '../details/ExpenseItemDetails'
import { DetailsSheet } from '../../../shared/TableSharedComponents'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ExpenseItemsDetailsSheetProps {
  selectedItem: ExpenseItem | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  accessToken?: string
  userInfo?: BusinessAppContextProps['userInfo']
}

export function ExpenseItemsDetailsSheet({
  selectedItem,
  isOpen,
  onOpenChange,
  accessToken,
  userInfo
}: Readonly<ExpenseItemsDetailsSheetProps>) {
  return (
    <DetailsSheet
      open={isOpen}
      onOpenChange={onOpenChange}
      title={
        selectedItem?.title ||
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_item_details', 'Expense Item Details')
      }
      testId="expense-item-details-sheet"
    >
      {selectedItem ? (
        <ExpenseItemDetails
          selectedItem={selectedItem}
          onClose={() => onOpenChange(false)}
          accessToken={accessToken ?? ''}
          userInfo={userInfo}
        />
      ) : null}
    </DetailsSheet>
  )
}
