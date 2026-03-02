import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Label } from '@newwork/nw-design-system'
import { CaretRightIcon, FileTextIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../utils/formatters'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { getAdvancePaymentStatusDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/utils/utils'

interface RequestDetailsSectionProps {
  amount: number
  currency: {
    code: string
  }
  requestDate?: string | null
  status: string
  expensePlanTitle?: string
  expensePlanDocument?: {
    id: string
    file: string
    mimeType: string
  }
  prefixDataTestId?: string
  onDocumentClick?: () => void
}

const RequestDetailsSection: React.FC<RequestDetailsSectionProps> = ({
  amount,
  currency,
  requestDate,
  status,
  expensePlanTitle,
  expensePlanDocument,
  prefixDataTestId = 'pay-transfer-adv-payment-v2',
  onDocumentClick
}) => {
  const statusConfig = getAdvancePaymentStatusDisplay(status)

  return (
    <Card data-testid={`${prefixDataTestId}-request-details-section`}>
      <CardHeader>
        <CardTitle data-testid={`${prefixDataTestId}-request-details-title`}>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:confirm_transfer_advance_payment.request_details',
            'Request Details'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Amount, Request Date, Status in 3 columns */}
        <div className="gba:grid gba:grid-cols-3 gba:gap-4">
          {/* Amount */}
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.amount', 'Amount')}
            </Label>
            <p className="gba:text-base gba:font-semibold gba:text-foreground">
              {formatCurrency(amount, currency.code)}
            </p>
          </div>

          {/* Request Date */}
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:confirm_transfer_advance_payment.request_date_label',
                'Request Date'
              )}
            </Label>
            <p className="gba:text-base gba:font-semibold gba:text-foreground">
              {requestDate ? formatDateTime(requestDate, 'date') : '-'}
            </p>
          </div>

          {/* Status */}
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}
            </Label>
            <Badge variant={statusConfig.badgeVariant || 'outline'} className="gba:text-xs">
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Expense Plan Title and Document */}
        {expensePlanTitle && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:pt-2">
            <button
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:cursor-pointer gba:transition-colors"
              data-testid="expense-plan-link-button"
            >
              <CaretRightIcon size={16} />
              {expensePlanTitle}
            </button>
            {expensePlanDocument?.file && (
              <button
                className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:hover:scale-105 gba:transition-transform gba:cursor-pointer"
                onClick={onDocumentClick}
                data-testid="document-view-button"
                title="View Document"
              >
                <FileTextIcon size={16} />
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RequestDetailsSection
