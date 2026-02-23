import React from 'react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { ExpenseData } from '../../../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ExpenseRequestTableActionsProps {
  record: ExpenseData
  accessToken: string
  transferInProgress?: boolean
  onNavigateToExpenseRequest: (record: ExpenseData) => void
  onDownloadAccountingNote: (record: ExpenseData) => void
  onTriggerCSV: (record: ExpenseData) => void
  onPrintExpenseRequest: (record: ExpenseData) => void
  onTransferPayment: (record: ExpenseData) => void
}

const ExpenseRequestTableActions: React.FC<ExpenseRequestTableActionsProps> = ({
  record,
  accessToken,
  transferInProgress = false,
  onNavigateToExpenseRequest,
  onDownloadAccountingNote,
  onTriggerCSV,
  onPrintExpenseRequest,
  onTransferPayment
}) => {
  const canPrint =
    (record.status === 'PAID' ||
      record.status === 'BOOKED' ||
      record.status === 'APPROVED' ||
      record.status === 'VERIFIED' ||
      record.status === 'TRANSFERRED') &&
    record.employeeDocumentId !== null

  const canTransferPayment = record.status === 'BOOKED'

  return (
    <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
      <AppActionButton
        data-testid={`expense-request-actions-${record.id}`}
        size="icon"
        staticFlowData={[
          {
            category: getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_list.flows_button.navigations',
              'Navigations'
            ),
            key: 'view-expense-request-details',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
              'View Request Details'
            ),
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              onNavigateToExpenseRequest(record)
            }
          },
          {
            category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
            key: 'download-accounting-note',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.modal_list_or_flow_button.download_text',
              'Download Accounting Note'
            ),
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              onDownloadAccountingNote(record)
            }
          },
          {
            category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
            key: 'trigger-csv',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_plan_list.expense_plan_flows.trigger_csv',
              'Trigger CSV'
            ),
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              onTriggerCSV(record)
            }
          },
          ...(canTransferPayment
            ? [
                {
                  category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
                  key: 'transfer-payment',
                  label: transferInProgress
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:transfer_expense_request.in_progress',
                        'Transfer in Progress'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:transfer_expense_request.info_message_container.transfer_payment',
                        'Transfer Payment'
                      ),
                  disabled: transferInProgress,
                  onClick: (e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    if (transferInProgress) {
                      return
                    }
                    onTransferPayment(record)
                  }
                }
              ]
            : []),
          ...(canPrint
            ? [
                {
                  category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
                  key: 'print-expense-request',
                  label: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_plan_list.expense_plan_flows.print',
                    'Print'
                  ),
                  onClick: (e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    onPrintExpenseRequest(record)
                  }
                }
              ]
            : [])
        ]}
        prefixDataTestId="expense-request-actions"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      />
    </div>
  )
}

export default ExpenseRequestTableActions
