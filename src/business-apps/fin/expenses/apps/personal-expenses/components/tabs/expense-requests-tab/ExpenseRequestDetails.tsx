import React from 'react'
import { Separator, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { generateExpenseRequestActions } from '../../../utils/expenseRequestActions'
import { useExpenseRequestFileService } from '../../../utils/expenseRequestFileService'
import TravelOrderAttachmentPreview from '../../common/TravelOrderAttachmentPreview'

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  selectedItem: any
  onClose: () => void
  requestTypeLabel?: string
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({
  selectedItem,
  onClose,
  requestTypeLabel,
  ...contextProps
}) => {
  if (!selectedItem) return null

  const { printExpenseRequest } = useExpenseRequestFileService(contextProps)

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

  // Translate known request type values with i18n keys; fall back gracefully
  const translateRequestTypeValue = (raw?: string) => {
    if (!raw) return 'N/A'
    const code = raw.includes(':') ? raw.split(':').pop()?.toUpperCase() : raw.toUpperCase()
    switch (code) {
      case 'TRIP':
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
      case 'EXPENSE':
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
      default:
        return formatTypeLabel(raw)
    }
  }

  const getRequestType = () => {
    if (selectedItem.requestType?.value) return selectedItem.requestType.value
    if (selectedItem.requestType) return String(selectedItem.requestType)
    return 'N/A'
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
          {(() => {
            const availableActions = generateExpenseRequestActions(
              selectedItem,
              {
                employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
                accessToken: contextProps.accessToken || '',
                onClose: onClose
              },
              {
                includeDetails: false
              }
            )

            // Only show action button if there are available actions
            if (availableActions.length > 0) {
              return (
                <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
                  <AppActionButton
                    data-testid="expense-request-details-action-button"
                    size="icon"
                    staticFlowData={availableActions}
                    prefixDataTestId="expense-request-details-action"
                    accessToken={contextProps.accessToken}
                    emptyStateBehavior="disable"
                    deferMainContextRequestsUntilClick={true}
                  />
                </div>
              )
            }
            return null
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
            {selectedItem.employee && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_overview.side_bar.requester',
                    'Requester'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.employee.fullName}</span>
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

            {selectedItem.costCenter && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
                    'Cost Center'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.costCenter.name}</span>
              </div>
            )}

            {selectedItem.project && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project')}
                </span>
                <span className="gba:text-sm gba:text-gray-900">{selectedItem.project.name}</span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
                  'Request Type'
                )}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {translateRequestTypeValue(requestTypeLabel ?? getRequestType())}
              </span>
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
                  : '-'}
              </span>
            </div>

            {(() => {
              const advanceAmountValue = selectedItem.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
              const advanceAmount = advanceAmountValue && advanceAmountValue > 0 ? advanceAmountValue : null

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
        record={selectedItem}
        fetchPdf={printExpenseRequest as any}
        dataTestIdPrefix="expense-request-details"
      />

      <Separator />

      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="default"
          onClick={() => {
            // Navigate to the expense request record page
            const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
              expenseRequestId: selectedItem.id,
              referrer: '/platform/fin/expenses/personal-expenses?tab=expense-requests'
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

export default ExpenseRequestDetails
