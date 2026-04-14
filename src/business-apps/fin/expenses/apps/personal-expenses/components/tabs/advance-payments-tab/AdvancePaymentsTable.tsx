import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import AdvancePaymentDetails from './AdvancePaymentDetails'
import ExpensePlanDetails from '../expense-plans-tab/details/ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/details/ExpenseRequestDetails'
import { DetailsSheet } from '../../shared/TableSharedComponents'
import { AdvancePaymentsDataBody } from './components/AdvancePaymentsDataBody'
import { AdvancePaymentGenerateDocumentDialog } from './components/GenerateDocumentDialog'
import { useAdvancePaymentsTableModel } from './hooks/useAdvancePaymentsTableModel'
import type { AdvancePaymentsTableProps } from './types/advancePaymentsTable.types'

export type { AdvancePaymentsTableProps } from './types/advancePaymentsTable.types'

function resolveExpensePlanTypeLabel(selectedExpensePlan: unknown): string | undefined {
  const sp = selectedExpensePlan as {
    requestType?: { value?: string } | unknown
    type?: { value?: string } | unknown
  }
  const requestTypeValue =
    sp.requestType && typeof sp.requestType === 'object' && 'value' in sp.requestType
      ? (sp.requestType as { value?: string }).value
      : undefined
  const typeValue =
    sp.type && typeof sp.type === 'object' && 'value' in sp.type ? (sp.type as { value?: string }).value : undefined
  if (requestTypeValue) return requestTypeValue
  if (typeValue) return typeValue
  if (sp.requestType) return String(sp.requestType)
  if (sp.type) return String(sp.type)
  return undefined
}

const AdvancePaymentsTable = React.forwardRef<HTMLDivElement, AdvancePaymentsTableProps>((props, ref) => {
  const model = useAdvancePaymentsTableModel(props)

  return (
    <div ref={ref}>
      <AdvancePaymentsDataBody {...model.dataBodyProps} />

      <DetailsSheet
        open={!!model.selectedItem}
        onOpenChange={open => !open && model.handleCloseDetails()}
        title={
          model.selectedItem?.expensePlan?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.advance_payment_details',
            'Advance Payment Details'
          )
        }
        testId="advance-payment-details-sheet"
        onClose={model.handleCloseDetails}
      >
        {model.selectedItem ? (
          <AdvancePaymentDetails
            payment={model.selectedItem}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <DetailsSheet
        open={!!model.selectedExpensePlan}
        onOpenChange={open => !open && model.handleCloseDetails()}
        title={
          (model.selectedExpensePlan as { title?: string } | null)?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_details',
            'Expense Plan Details'
          )
        }
        testId="expense-plan-details-sheet"
        onClose={model.handleCloseDetails}
      >
        {model.selectedExpensePlan ? (
          <ExpensePlanDetails
            selectedItem={model.selectedExpensePlan}
            onClose={model.handleCloseDetails}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
            planTypeLabel={resolveExpensePlanTypeLabel(model.selectedExpensePlan)}
          />
        ) : null}
      </DetailsSheet>

      <DetailsSheet
        open={!!model.selectedExpenseRequest}
        onOpenChange={open => !open && model.handleCloseDetails()}
        title={
          (model.selectedExpenseRequest as { title?: string } | null)?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
            'Expense Request Details'
          )
        }
        testId="expense-request-details-sheet"
        onClose={model.handleCloseDetails}
      >
        {model.selectedExpenseRequest ? (
          <ExpenseRequestDetails
            selectedItem={model.selectedExpenseRequest}
            onClose={model.handleCloseDetails}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <AdvancePaymentGenerateDocumentDialog
        open={model.generateDocOpen}
        record={model.generateDocRecord}
        accessToken={model.accessToken}
        onOpenChange={open => {
          model.setGenerateDocOpen(open)
          if (!open) {
            model.setGenerateDocRecord(null)
          }
        }}
      />
    </div>
  )
})

AdvancePaymentsTable.displayName = 'AdvancePaymentsTable'

export default React.memo(AdvancePaymentsTable)
