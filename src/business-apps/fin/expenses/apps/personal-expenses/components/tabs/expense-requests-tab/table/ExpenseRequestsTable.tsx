import React from 'react'
import ExpenseRequestDetails from '../details/ExpenseRequestDetails'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PrintPreviewDialog, DetailsSheet } from '../../../shared/TableSharedComponents'
import { ExpenseRequestsDataBody } from './components/ExpenseRequestsDataBody'
import { useExpenseRequestsTableModel } from '../hooks/useExpenseRequestsTableModel'
import type { ExpenseRequestsTableProps } from '../types/expenseRequestsTable.types'

export type { ExpenseRequestsTableProps } from '../types/expenseRequestsTable.types'

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = React.memo(props => {
  const model = useExpenseRequestsTableModel(props)

  return (
    <>
      <ExpenseRequestsDataBody {...model.dataBodyProps} />

      <DetailsSheet
        open={!!model.selectedItem}
        onOpenChange={open => !open && model.handleCloseDetails()}
        title={
          model.selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
        }
        testId="expense-request-details-sheet"
      >
        {model.selectedItem ? (
          <ExpenseRequestDetails
            selectedItem={model.selectedItem}
            onClose={model.handleCloseDetails}
            accessToken={model.accessToken ?? ''}
            userInfo={model.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <PrintPreviewDialog
        open={model.printModalOpen}
        onOpenChange={open => {
          model.setPrintModalOpen(open)
          if (!open) model.setPrintPdfUrl('')
        }}
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.print_expense_request',
          'Print Expense Request'
        )}
        loading={model.printLoading}
        pdfUrl={model.printPdfUrl}
        testIdPrefix="expense-request"
      />
    </>
  )
})

export default ExpenseRequestsTable
