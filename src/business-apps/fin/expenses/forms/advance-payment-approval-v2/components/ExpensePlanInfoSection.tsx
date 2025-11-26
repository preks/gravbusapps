import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Label, Avatar } from '@newwork/nw-design-system'
import { PiReceipt } from 'react-icons/pi'
import { ExpensePlan } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../utils/formatters'

interface ExpensePlanInfoSectionProps {
  expensePlan: ExpensePlan
  prefixDataTestId?: string
}

const ExpensePlanInfoSection: React.FC<ExpensePlanInfoSectionProps> = ({
  expensePlan,
  prefixDataTestId = 'advance-payment-approval-v2'
}) => {
  // Format request type for display
  const formatRequestType = (requestTypeCode?: string) => {
    if (!requestTypeCode) return '-'
    const typeLower = requestTypeCode.toLowerCase()
    if (typeLower.includes('trip')) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_type.trip', 'Trip')
    }
    if (typeLower.includes('expense')) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_type.expenses', 'Expenses')
    }
    return requestTypeCode
  }

  const displayName =
    `${expensePlan.employee?.firstName || ''} ${expensePlan.employee?.lastName || ''}`.trim() || 'Employee'

  return (
    <Card data-testid={`${prefixDataTestId}-expense-plan-info-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiReceipt className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.expense_request_container.current_expense_plan_label',
            'Expense plan'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Employee Info */}
        <div className="gba:flex gba:items-center gba:gap-4">
          {expensePlan.employee?.pictureThumbnail ? (
            <img
              src={`data:image/jpeg;base64,${expensePlan.employee.pictureThumbnail}`}
              alt={displayName}
              className="gba:w-12 gba:h-12 gba:rounded-full gba:object-cover gba:flex-shrink-0"
              data-testid="employee-avatar"
            />
          ) : (
            <Avatar className="gba:w-12 gba:h-12 gba:bg-blue-500 gba:flex-shrink-0" data-testid="employee-avatar">
              <span className="gba:text-lg gba:text-background">
                {expensePlan.employee?.firstName?.charAt(0) || 'A'}
              </span>
            </Avatar>
          )}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:font-semibold gba:text-foreground gba:break-words gba:leading-relaxed">
              {displayName}
            </div>
            {expensePlan.employee?.employeePosition?.jobPosition?.name && (
              <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                {expensePlan.employee.employeePosition.jobPosition.name}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Request ID and Type */}
        {expensePlan.requestType ? (
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Request ID */}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:approve_advance_payment.id', 'Id')}
              </Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">{expensePlan.code || '-'}</p>
            </div>

            {/* Request Type */}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.type', 'Type')}
              </Label>
              <div className="gba:mt-1">
                <Badge variant="info">{formatRequestType(expensePlan.requestType.code)}</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_advance_payment.id', 'Id')}
            </Label>
            <p className="gba:text-sm gba:font-medium gba:mt-1">{expensePlan.code || '-'}</p>
          </div>
        )}

        {Boolean(expensePlan.title || expensePlan.description) && <Separator />}

        {/* Title */}
        {expensePlan.title && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title')}
            </Label>
            <p className="gba:text-sm gba:font-medium gba:mt-1">{expensePlan.title}</p>
          </div>
        )}

        {/* Description */}
        {expensePlan.description && (
          <>
            {expensePlan.title && <Separator />}
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:initiate_expense_plan.create_expense_plan.comment_text_area',
                  'Comment'
                )}
              </Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:whitespace-pre-wrap">
                {expensePlan.description}
              </p>
            </div>
          </>
        )}

        {Boolean(expensePlan.totalAmount) && <Separator />}

        {/* Total Amount */}
        {Boolean(expensePlan.totalAmount) && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount')}
            </Label>
            <p className="gba:text-sm gba:font-semibold gba:mt-1">
              {formatCurrency(expensePlan.totalAmount, expensePlan.currency.code)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpensePlanInfoSection
