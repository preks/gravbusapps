import React from 'react'
import { Separator, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay, formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { useExpenseRequestFileService as useCommonExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'

export interface ExpenseRequestDetailsBackofficeProps extends BusinessAppContextProps {
  selectedItem: any
  onClose?: () => void
  requestTypeLabel?: string
}

const ExpenseRequestDetailsBackoffice: React.FC<ExpenseRequestDetailsBackofficeProps> = ({
  selectedItem,
  requestTypeLabel,
  ...contextProps
}) => {
  if (!selectedItem) return null

  const { printExpenseRequest } = useCommonExpenseRequestFileService(contextProps)

  // Trip type removed in favor of explicit request/plan type labels passed from parent
  const formatTypeLabel = (value?: string) => {
    if (value === null || value === undefined) return 'N/A'
    const trimmed = String(value).trim()
    if (!trimmed) return 'N/A'
    if (trimmed.toUpperCase() === 'N/A') return 'N/A'
    return trimmed
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="expense-request-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="expense-request-title">
            {selectedItem.title}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="expense-request-code">
            {selectedItem.code}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          {(() => {
            const statusConfig = getExpenseRequestStatusDisplay(selectedItem.status)
            return (
              <Badge
                variant={(statusConfig as any).badgeVariant || 'outline'}
                data-testid="expense-request-status-badge"
              >
                {statusConfig.label}
              </Badge>
            )
          })()}
        </div>
      </div>

      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {selectedItem.startDate && selectedItem.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiCalendarDuotone className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:{' '}
                {formatDate(selectedItem.startDate, 'date.short')} {' → '}
                {formatDate(selectedItem.endDate, 'date.short')}
              </span>
            </div>
          )}

          {selectedItem.requestDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:confirm_transfer_advance_payment.request_date_label',
                  'Request Date'
                )}
                : {formatDate(selectedItem.requestDate, 'date.short')}
              </span>
            </div>
          )}

          {selectedItem.decisionDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiPath className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decision_date', 'Decision Date')}:{' '}
                {formatDate(selectedItem.decisionDate, 'date.short')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {selectedItem.description && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_overview.expense_history.expense_history_table.description',
                'Description'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700" data-testid="expense-request-description">
              {selectedItem.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
              'Request Details'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            {(selectedItem.employee || selectedItem.reporter) && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_overview.side_bar.requester',
                    'Requester'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.employee?.fullName || selectedItem.employee || selectedItem.reporter}
                </span>
              </div>
            )}

            {selectedItem.employee?.employeePosition?.supervisor && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.manager_title',
                    'Manager'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.employee.employeePosition.supervisor.fullName}
                </span>
              </div>
            )}

            {(selectedItem.costCenter?.name || selectedItem.employee?.employeePosition?.costCenter?.name) && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
                    'Cost Center'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.costCenter?.name || selectedItem.employee?.employeePosition?.costCenter?.name}
                </span>
              </div>
            )}

            {(selectedItem.project?.name || selectedItem.project) && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.project?.name || selectedItem.project}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.affected_expense_modal.request_type',
                  'Request Type'
                )}
              </span>
              <span className="gba:text-sm gba:text-gray-900">{formatTypeLabel(requestTypeLabel)}</span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.expense_plan_table.total_amount',
                  'Total Amount'
                )}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {typeof selectedItem.totalAmount === 'number'
                  ? formatCurrencyDisplay(selectedItem.totalAmount, selectedItem.currency?.code)
                  : typeof selectedItem.amount === 'number'
                    ? formatCurrencyDisplay(selectedItem.amount, selectedItem.currency?.code)
                    : '-'}
              </span>
            </div>

            {(() => {
              const aggAmount = selectedItem.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
              const listAmount =
                Array.isArray(selectedItem.expensePlan?.advancePayment) &&
                selectedItem.expensePlan.advancePayment.length > 0
                  ? selectedItem.expensePlan.advancePayment.reduce((sum: number, ap: any) => sum + (ap.amount || 0), 0)
                  : null
              const advanceAmount =
                aggAmount && aggAmount > 0 ? aggAmount : listAmount && listAmount > 0 ? listAmount : null

              return advanceAmount ? (
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:approve_expense_request.advance_payment',
                      'Advance Payment'
                    )}
                  </span>
                  <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                    {formatCurrencyDisplay(advanceAmount, selectedItem.currency?.code)}
                  </span>
                </div>
              ) : null
            })()}
          </div>
        </CardContent>
      </Card>

      <TravelOrderAttachmentPreview
        record={selectedItem as any}
        fetchPdf={printExpenseRequest as any}
        dataTestIdPrefix="backoffice-expense-request-details"
      />

      <Separator />

      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="default"
          onClick={() => {
            const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
              expenseRequestId: selectedItem.id,
              referrer: '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
            })
            navigateTo(url)
          }}
          data-testid="view-expense-request-details-button"
        >
          <PiArrowRight className="gba:mr-2" />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.plan_details.view_full_details',
            'View Full Details'
          )}
        </Button>
      </div>
    </div>
  )
}

export default ExpenseRequestDetailsBackoffice
