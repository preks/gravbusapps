import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Label, Spinner } from '@newwork/nw-design-system'
import { PiHandCoins } from 'react-icons/pi'
import { AdvancePaymentData } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../utils/formatters'
import { formatDateTime } from '@/common/utils/dateFormatter'

interface AdvancePaymentDetailsSectionProps {
  advancePayment: AdvancePaymentData
  requestCreatedAt?: string | null
  isLoadingRequestDate?: boolean
  prefixDataTestId?: string
}

const AdvancePaymentDetailsSection: React.FC<AdvancePaymentDetailsSectionProps> = ({
  advancePayment,
  requestCreatedAt,
  isLoadingRequestDate = false,
  prefixDataTestId = 'pay-transfer-adv-payment-v2'
}) => {
  // Format payment method
  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-'
    const methodString = String(method).trim()

    if (methodString === 'DIRECT_DEPOSIT') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
        'Direct Deposit'
      )
    }
    if (methodString === 'CASH_PAYMENT') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
        'Cash Payment'
      )
    }

    const lowered = methodString.toLowerCase()
    if (lowered.includes('direct')) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
        'Direct Deposit'
      )
    }
    if (lowered.includes('cash')) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
        'Cash Payment'
      )
    }

    return methodString
  }

  return (
    <Card data-testid={`${prefixDataTestId}-advance-payment-details-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiHandCoins className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', 'Advance Payment')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Amount */}
        <div>
          <Label className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount')}
          </Label>
          <p className="gba:text-sm gba:font-semibold gba:mt-1">
            {formatCurrency(advancePayment.amount, advancePayment.currency.code)}
          </p>
        </div>

        {(advancePayment.paymentMethod || advancePayment.costCenter?.name) && <Separator />}

        {/* Payment Method and Cost Center */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* Payment Method */}
          {advancePayment.paymentMethod && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                  'Payment Method'
                )}
              </Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">
                {formatPaymentMethod(advancePayment.paymentMethod)}
              </p>
            </div>
          )}

          {/* Cost Center */}
          {advancePayment.costCenter?.name && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_overview.side_bar.request_cost_center',
                  'Cost Center'
                )}
              </Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">{advancePayment.costCenter.name}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {advancePayment.description && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.notes_area_label', 'Notes')}
              </Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:whitespace-pre-wrap">
                {advancePayment.description}
              </p>
            </div>
          </>
        )}

        {requestCreatedAt && <Separator />}

        {/* Request Created - Show when available */}
        {requestCreatedAt && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_overview.request_created',
                'Request Created'
              )}
            </Label>
            <p className="gba:text-sm gba:font-medium gba:mt-1">
              {isLoadingRequestDate ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdvancePaymentDetailsSection
