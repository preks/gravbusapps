import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import AdvancePaymentDetails from '../details/AdvancePaymentDetails'
import ExpensePlanDetails from '../../expense-plans-tab/details/ExpensePlanDetails'
import ExpenseRequestDetails from '../../expense-requests-tab/details/ExpenseRequestDetails'
import { DetailsSheet } from '../../../shared/TableSharedComponents'
import { AdvancePaymentsDataBody } from './components/AdvancePaymentsDataBody'
import { AdvancePaymentGenerateDocumentDialog } from './components/GenerateDocumentDialog'
import { useAdvancePaymentsTableModel } from '../hooks/useAdvancePaymentsTableModel'
import type { AdvancePaymentsTableProps } from '../types/advancePaymentsTable.types'

export type { AdvancePaymentsTableProps } from '../types/advancePaymentsTable.types'

function readCatalogValueFromUnknown(obj: unknown): string | undefined {
  if (obj !== null && typeof obj === 'object' && 'value' in obj) {
    const v = (obj as { value?: unknown }).value
    return typeof v === 'string' ? v : undefined
  }
  return undefined
}

function primitiveDisplayLabel(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return undefined
}

function resolveExpensePlanTypeLabel(selectedExpensePlan: unknown): string | undefined {
  if (selectedExpensePlan === null || typeof selectedExpensePlan !== 'object') {
    return undefined
  }
  const sp = selectedExpensePlan as Record<string, unknown>
  const requestTypeValue = readCatalogValueFromUnknown(sp.requestType)
  const typeValue = readCatalogValueFromUnknown(sp.type)
  if (requestTypeValue !== undefined) {
    return requestTypeValue
  }
  if (typeValue !== undefined) {
    return typeValue
  }
  const fromRequestType = primitiveDisplayLabel(sp.requestType)
  if (fromRequestType !== undefined) {
    return fromRequestType
  }
  return primitiveDisplayLabel(sp.type)
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
