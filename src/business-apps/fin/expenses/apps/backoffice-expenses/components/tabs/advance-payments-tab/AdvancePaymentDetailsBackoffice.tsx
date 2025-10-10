import React from 'react'
import { Separator, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay } from '../../../../personal-expenses/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'

interface AdvancePaymentDetailsBackofficeProps extends BusinessAppContextProps {
  payment: any
  onClose?: () => void
}

const AdvancePaymentDetailsBackoffice: React.FC<AdvancePaymentDetailsBackofficeProps> = ({ payment }) => {
  if (!payment) return null

  const toTitleCase = (value?: string) => {
    if (value === null || value === undefined) return ''
    const normalized = String(value).trim()
    if (!normalized) return ''
    if (normalized.toUpperCase() === 'N/A') return 'N/A'
    return normalized
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="advance-payment-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="advance-payment-title">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.advance_payment_details_title',
              'Advance Payment Details'
            )}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="advance-payment-code">
            {payment.code || 'N/A'}
          </p>
        </div>
        {(() => {
          const statusConfig = getAdvancePaymentStatusDisplay(payment.status)
          return (
            <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="advance-payment-status-badge">
              {statusConfig.label}
            </Badge>
          )
        })()}
      </div>

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:advance_lists.advance_payment_details.payment_details',
              'Payment Details'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_overview.expense_history.expense_history_table.description',
                  'Description'
                )}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {payment.description ??
                  getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_description', 'No description')}
              </span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.initial_expense_plan_select_label',
                  'Expense Plan'
                )}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {payment.expensePlan
                  ? `${payment.expensePlan.code} - ${payment.expensePlan.title}`
                  : getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule_details.query_params_no',
                      'No'
                    ) +
                    ' ' +
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_calculation_rule_details.query_params_expense_plan',
                      'Expense Plan'
                    )}
              </span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:manager_expense_request_list.expense_table.amount',
                  'Amount'
                )}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {formatCurrencyDisplay(payment.amount || 0, payment.currency?.code)}
              </span>
            </div>

            {payment.costCenter && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
                    'Cost Center'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{payment.costCenter.name}</span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                  'Payment Method'
                )}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {payment.paymentMethod
                  ? toTitleCase(String(payment.paymentMethod))
                  : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.not_specified', 'Not specified')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />
    </div>
  )
}

export default AdvancePaymentDetailsBackoffice
