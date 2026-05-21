import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../../../../_i18n'
import ExpensePlanDetails from '../details/ExpensePlanDetails'
import ExpenseRequestDetails from '../../expense-requests-tab/details/ExpenseRequestDetails'
import { PrintPreviewDialog, DetailsSheet } from '../../../shared/TableSharedComponents'
import { ExpensePlansTableDisplay } from './ExpensePlansTableDisplay'
import { useExpensePlansTableModel } from './useExpensePlansTableModel'
import type { ExpensePlansTableProps } from './expensePlansTable.types'

export type { ExpensePlansTableProps } from './expensePlansTable.types'

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = React.memo(props => {
  const { t } = useTranslation(personalTranslations)
  const {
    dataBodyProps,
    selectedItem,
    selectedExpenseRequest,
    handleCloseDetails,
    printModalOpen,
    setPrintModalOpen,
    printPdfUrl,
    setPrintPdfUrl,
    printLoading,
    accessToken,
    userInfo
  } = useExpensePlansTableModel(props)

  return (
    <div>
      <ExpensePlansTableDisplay {...dataBodyProps} />

      <DetailsSheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={selectedItem?.title || t('expense-plans-sheet-plan-title')}
        testId="expense-plan-details-sheet"
      >
        {selectedItem ? (
          <ExpensePlanDetails
            selectedItem={selectedItem}
            onClose={handleCloseDetails}
            accessToken={accessToken}
            userInfo={userInfo}
          />
        ) : null}
      </DetailsSheet>

      <DetailsSheet
        open={!!selectedExpenseRequest}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          (selectedExpenseRequest as { title?: string } | null)?.title || t('expense-plans-sheet-expense-request-title')
        }
        testId="expense-request-details-sheet"
      >
        {selectedExpenseRequest ? (
          <ExpenseRequestDetails
            selectedItem={selectedExpenseRequest}
            onClose={handleCloseDetails}
            accessToken={accessToken}
            userInfo={userInfo}
          />
        ) : null}
      </DetailsSheet>

      <PrintPreviewDialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) {
            setPrintModalOpen(false)
            setPrintPdfUrl('')
          }
        }}
        title={t('expense-plans-print-dialog-title')}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="print-plan"
      />
    </div>
  )
})

export default ExpensePlansTable
