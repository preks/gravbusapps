import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import ExpenseItemDetails from '../details/ExpenseItemDetails'
import { DetailsSheet } from '../../../shared/TableSharedComponents'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../../../../_i18n'

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
  const { t } = useTranslation(personalTranslations)

  return (
    <DetailsSheet
      open={isOpen}
      onOpenChange={onOpenChange}
      title={selectedItem?.title || t('expense-items-sheet-title')}
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
