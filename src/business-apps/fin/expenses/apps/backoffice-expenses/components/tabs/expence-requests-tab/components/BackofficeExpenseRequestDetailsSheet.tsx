import React from 'react'
import { Button, Badge, Separator, Sheet, SheetContent } from '@newwork/nw-design-system'
import { formatDate } from '@/common/utils/windowUtils'
import type { TranslateFn } from '../../../../utils/utils'
import { formatCurrency } from '../../../../utils/currencyUtils'
import { getExpenseRequestStatusDisplay } from '../../../../utils/utils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import TravelOrderAttachmentPreview from '../../../../../../common/components/document-preview/TravelOrderAttachmentPreview'
import {
  ExpenseDetailsPanelContent,
  type ExpenseDetailsPanelRecord
} from '../../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import ExpenseDetailsShell from '../../../../../../common/components/details-panel/ExpenseDetailsShell'
import type {
  HasEmployeeDocument,
  PrintRequestResult
} from '../../../../../../common/files/useExpenseRequestFileService'
import type { ExpenseData } from '../../../../types'

export interface BackofficeExpenseRequestDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedExpense: ExpenseData | null
  t: TranslateFn
  accessToken: string
  printExpenseRequest: (record: HasEmployeeDocument) => Promise<PrintRequestResult>
}

function BackofficeExpenseRequestDetailsSheet(props: Readonly<BackofficeExpenseRequestDetailsSheetProps>) {
  const { open, onOpenChange, selectedExpense, t, accessToken, printExpenseRequest } = props

  return (
    <Sheet open={open} onOpenChange={onOpenChange} data-testid="backoffice-expense-request-details-sheet">
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
        <ExpenseDetailsShell title={selectedExpense?.title || t('detail-expense-request-details')}>
          {selectedExpense ? (
            <ExpenseDetailsPanelContent
              dataTestIdPrefix="backoffice-expense-request-details"
              record={
                {
                  ...selectedExpense,
                  startDate: selectedExpense.startDate ? formatDate(selectedExpense.startDate, 'date.short') : 'N/A',
                  endDate: selectedExpense.endDate ? formatDate(selectedExpense.endDate, 'date.short') : 'N/A',
                  creationDate: selectedExpense.creationDate
                    ? formatDate(selectedExpense.creationDate, 'date.short')
                    : 'N/A'
                } as ExpenseDetailsPanelRecord
              }
              formatAmount={(amount, currencyCode) => formatCurrency(amount, currencyCode)}
              showHeader={false}
              t={t}
              headerRight={
                <Badge
                  variant={getExpenseRequestStatusDisplay(selectedExpense.status, t).badgeVariant || 'outline'}
                  data-testid="expense-request-status-badge"
                >
                  {getExpenseRequestStatusDisplay(selectedExpense.status, t).label}
                </Badge>
              }
              extraContent={
                <TravelOrderAttachmentPreview
                  record={selectedExpense as any}
                  fetchPdf={printExpenseRequest}
                  dataTestIdPrefix="backoffice-expense-request-details"
                />
              }
              footer={
                <>
                  <Separator />
                  <div className="gba:flex gba:justify-end gba:mt-4">
                    <Button
                      variant="default"
                      onClick={() => {
                        const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
                          expenseRequestId: selectedExpense.id ? String(selectedExpense.id) : '',
                          referrer: '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
                        })
                        navigateTo(url)
                      }}
                      data-testid="view-expense-request-details-button"
                    >
                      {t('detail-view-full-details')}
                    </Button>
                  </div>
                </>
              }
              expenseRequestId={selectedExpense?.id}
              accessToken={accessToken}
            />
          ) : null}
        </ExpenseDetailsShell>
      </SheetContent>
    </Sheet>
  )
}

export default React.memo(BackofficeExpenseRequestDetailsSheet)
