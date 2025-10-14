import React from 'react'
import { Separator, Button, Badge } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay } from '../../../../personal-expenses/utils'
import { StatusDisplayConfig } from '../../../utils/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../utils/currencyUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface AdvancePaymentDetailsBackofficeProps extends BusinessAppContextProps {
  payment: any
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
        <div className="gba:flex gba:items-center gba:gap-3">
          {(() => {
            const statusConfig: StatusDisplayConfig = getAdvancePaymentStatusDisplay(payment.status)
            return (
              <Badge
                variant={statusConfig.badgeVariant || 'outline'}
                data-testid="advance-payment-status-badge"
              >
                {statusConfig.label}
              </Badge>
            )
          })()}
        </div>
      </div>

      {/* Date Information - no card, flat display */}
      {(payment.expensePlan?.startDate || payment.decisionDate || payment.transactionDate) && (
        <div className="gba:space-y-3">
          {payment.expensePlan?.startDate && payment.expensePlan?.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiCalendarDuotone className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:{' '}
                {formatDate(payment.expensePlan.startDate, 'date.short')} {' → '}
                {formatDate(payment.expensePlan.endDate, 'date.short')}
              </span>
            </div>
          )}

          {payment.decisionDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiPath className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decision_date', 'Decision Date')}:{' '}
                {formatDate(payment.decisionDate, 'date.short')}
              </span>
            </div>
          )}

          {payment.transactionDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:personal_expenses.transaction_date',
                  'Transaction Date'
                )}
                : {formatDate(payment.transactionDate, 'date.short')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Details - flat display without card borders */}
      <div className="gba:space-y-4">
        <h3 className="gba:text-base gba:font-semibold gba:text-gray-900">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_lists.advance_payment_details.payment_details',
            'Payment Details'
          )}
        </h3>
        <div className="gba:space-y-3">
            {(payment.expensePlan?.employee || payment.expensePlan?.reporter) && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_overview.side_bar.requester',
                    'Requester'
                  )}
                  :
                </span>
                <span className="gba:text-gray-900">
                  {payment.expensePlan.employee?.fullName ||
                    payment.expensePlan.employee?.displayName ||
                    payment.expensePlan.reporter}
                </span>
              </div>
            )}

            {payment.expensePlan?.employee?.employeePosition?.supervisor && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.manager_title',
                    'Manager'
                  )}
                  :
                </span>
                <span className="gba:text-gray-900">
                  {payment.expensePlan.employee.employeePosition.supervisor.fullName}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.initial_expense_plan_select_label',
                  'Expense Plan'
                )}
                :
              </span>
              <span className="gba:text-gray-900">
                {payment.expensePlan
                  ? `${payment.expensePlan.code || payment.expensePlan.title}`
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

            {(payment.costCenter?.name ||
              payment.expensePlan?.costCenter?.name ||
              payment.expensePlan?.employee?.employeePosition?.costCenter?.name) && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
                    'Cost Center'
                  )}
                  :
                </span>
                <span className="gba:text-gray-900">
                  {payment.costCenter?.name ||
                    payment.expensePlan?.costCenter?.name ||
                    payment.expensePlan?.employee?.employeePosition?.costCenter?.name}
                </span>
              </div>
            )}

            {(payment.project?.name || payment.expensePlan?.project?.name) && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project')}:
                </span>
                <span className="gba:text-gray-900">
                  {payment.project?.name || payment.expensePlan?.project?.name}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:manager_expense_request_list.expense_table.amount',
                  'Amount'
                )}
                :
              </span>
              <span className="gba:font-bold gba:text-gray-900">
                {formatCurrency(payment.amount || 0, payment.currency?.code || 'EUR')}
              </span>
            </div>

            {payment.expensePlan?.totalAmount && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:font-medium gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.total_amount',
                    'Plan Total Amount'
                  )}
                  :
                </span>
                <span className="gba:font-bold gba:text-gray-900">
                  {formatCurrency(
                    payment.expensePlan.totalAmount || 0,
                    payment.expensePlan.currency?.code || payment.currency?.code || 'EUR'
                  )}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between">
              <span className="gba:font-medium gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                  'Payment Method'
                )}
                :
              </span>
              <span className="gba:text-gray-900">
                {payment.paymentMethod
                  ? toTitleCase(String(payment.paymentMethod))
                  : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.not_specified', 'Not specified')}
              </span>
            </div>
        </div>
      </div>

      <Separator />

      {/* Action Button */}
      {payment.expensePlan?.id && (
        <div className="gba:flex gba:justify-end">
          <Button
            variant="default"
            onClick={() => {
              const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
                expensePlanId: payment.expensePlan.id
              })
              navigateTo(url)
            }}
            data-testid="view-expense-plan-details-button"
          >
            <PiArrowRight className="gba:mr-2" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.plan_details.view_full_details',
              'View Full Details'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export default AdvancePaymentDetailsBackoffice
