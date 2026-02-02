import React from 'react'
import { Sheet, SheetContent } from '@newwork/nw-design-system'
import ExpensePlanDetails from '../../expense-plans-tab/ExpensePlanDetails'
import ExpenseRequestDetails from '../../expense-requests-tab/ExpenseRequestDetails'
import ExpenseDetailsShell from '../../../../../../common/components/details-panel/ExpenseDetailsShell'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface DetailsSheetProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: () => void
  selectedPlanForDetails: any | null
  selectedRequestForDetails: any | null
}

const DetailsSheet: React.FC<DetailsSheetProps> = props => {
  const { open, onOpenChange, onClose, selectedPlanForDetails, selectedRequestForDetails, ...context } = props

  const headerTitle =
    selectedPlanForDetails?.title ||
    selectedRequestForDetails?.title ||
    getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.details', 'Details')

  return (
    <Sheet open={open} onOpenChange={onOpenChange} data-testid="details-sheet">
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
        <ExpenseDetailsShell title={headerTitle}>
          {selectedPlanForDetails && (
            <ExpensePlanDetails selectedItem={selectedPlanForDetails} onClose={onClose} {...context} />
          )}
          {selectedRequestForDetails && (
            <ExpenseRequestDetails selectedItem={selectedRequestForDetails} onClose={onClose} {...context} />
          )}
        </ExpenseDetailsShell>
      </SheetContent>
    </Sheet>
  )
}

export default DetailsSheet
