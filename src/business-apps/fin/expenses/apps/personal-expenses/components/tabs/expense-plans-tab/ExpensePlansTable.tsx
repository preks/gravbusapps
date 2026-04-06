import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ExpensePlanDetails from './ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { PrintPreviewDialog, DetailsSheet } from '../../shared/TableSharedComponents'
import { ExpensePlansDataBody } from './components/ExpensePlansDataBody'
import { useExpensePlansTableModel } from './table/useExpensePlansTableModel'
import type { ExpensePlansTableProps } from './expensePlansTable.types'

export type { ExpensePlansTableProps }

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = React.memo(props => {
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
      <ExpensePlansDataBody {...dataBodyProps} />

      <DetailsSheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_details',
            'Expense Plan Details'
          )
        }
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
          (selectedExpenseRequest as { title?: string } | null)?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
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
        title={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.print_expense_plan', 'Print Expense Plan')}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="print-plan"
      />
    </div>
  )
})

export default ExpensePlansTable
