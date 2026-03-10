import React from 'react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { ExpenseData } from '../../../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import withStoppedPropagation from '../../common/withStoppedPropagation'
import type { ExpenseRequestActionHandlers } from '../../../../types/expenseRequestActionHandlers'

interface ExpenseRequestTableActionsProps extends ExpenseRequestActionHandlers {
  record: ExpenseData
  accessToken: string
  transferInProgress?: boolean
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
  const onNavigate = withStoppedPropagation(() => onNavigateToExpenseRequest(record))
  const onDownload = withStoppedPropagation(() => onDownloadAccountingNote(record))
  const onTriggerCsvAction = withStoppedPropagation(() => onTriggerCSV(record))
  const onPrint = withStoppedPropagation(() => onPrintExpenseRequest(record))
  const onTransfer = withStoppedPropagation(() => {
    if (transferInProgress) {
      return
    }
    onTransferPayment(record)
  })

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
            onClick: onNavigate
          },
          {
            category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
            key: 'download-accounting-note',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.modal_list_or_flow_button.download_text',
              'Download Accounting Note'
            ),
            onClick: onDownload
          },
          {
            category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
            key: 'trigger-csv',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_plan_list.expense_plan_flows.trigger_csv',
              'Trigger CSV'
            ),
            onClick: onTriggerCsvAction
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
                  onClick: onTransfer
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
                  onClick: onPrint
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
