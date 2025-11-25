import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import ExpenseItemDetails from '../../expense-items-tab/ExpenseItemDetails'
import ExpensePlanDetails from '../../expense-plans-tab/ExpensePlanDetails'
import ExpenseRequestDetails from '../../expense-requests-tab/ExpenseRequestDetails'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface DetailsSheetProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  selectedItemForDetails: any | null
  selectedPlanForDetails: any | null
  selectedRequestForDetails: any | null
}

const DetailsSheet: React.FC<DetailsSheetProps> = props => {
  const {
    open,
    onOpenChange,
    onClose,
    selectedItemForDetails,
    selectedPlanForDetails,
    selectedRequestForDetails,
    ...context
  } = props

  const title = selectedItemForDetails
    ? getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.expense_item_details', 'Expense Item Details')
    : selectedPlanForDetails
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:approve_expense_plan.expense_subtitle_details',
          'Expense Plan Details'
        )
      : selectedRequestForDetails
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
        : getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.details', 'Details')

  const headerTitle =
    selectedItemForDetails?.title ||
    selectedPlanForDetails?.title ||
    selectedRequestForDetails?.title ||
    getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.details', 'Details')

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} data-testid="details-sheet">
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
        <SheetHeader>
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">{headerTitle}</SheetTitle>
        </SheetHeader>
        <div className="gba:mt-6 gba:px-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
          {selectedItemForDetails && (
            <ExpenseItemDetails selectedItem={selectedItemForDetails} onClose={onClose} {...context} />
          )}
          {selectedPlanForDetails && (
            <ExpensePlanDetails selectedItem={selectedPlanForDetails} onClose={onClose} {...context} />
          )}
          {selectedRequestForDetails && (
            <ExpenseRequestDetails selectedItem={selectedRequestForDetails} onClose={onClose} {...context} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default DetailsSheet
