import React from 'react'
import { Separator, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { getExpensePlanStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { generateExpensePlanActions } from '../../../utils/expensePlanActions'
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService'
import TravelOrderAttachmentPreview from '../../common/TravelOrderAttachmentPreview'

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: any
  onClose: () => void
  planTypeLabel?: string
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({
  selectedItem,
  onClose,
  planTypeLabel,
  ...contextProps
}) => {
  if (!selectedItem) return null

  const { printExpensePlan } = useExpensePlanFileService(contextProps)

  const formatTypeLabel = (value?: string) => {
    if (!value) return 'N/A'
    const trimmed = String(value).trim()
    if (!trimmed) return 'N/A'
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  }

  // Translate known plan/request type values; fallback to formatted text
  const translatePlanTypeValue = (raw?: string) => {
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

  const getPlanType = () => {
    if (selectedItem.requestType?.value) return selectedItem.requestType.value
    if (selectedItem.type?.value) return selectedItem.type.value
    if (selectedItem.requestType) return String(selectedItem.requestType)
    if (selectedItem.type) return String(selectedItem.type)
    return 'N/A'
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="expense-plan-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="expense-plan-title">
            {selectedItem.title}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-code">
            {selectedItem.code}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          {(() => {
            const statusConfig = getExpensePlanStatusDisplay(selectedItem.status)
            return (
              <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-badge">
                {statusConfig.label}
              </Badge>
            )
          })()}
          {(() => {
            const availableActions = generateExpensePlanActions(
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
                    data-testid="expense-plan-details-action-button"
                    size="icon"
                    staticFlowData={availableActions}
                    prefixDataTestId="expense-plan-details-action"
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

          {selectedItem.planDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')}:{' '}
                {formatDate(selectedItem.planDate, 'date.short')}
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
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.description', 'Description')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700" data-testid="expense-plan-description">
              {selectedItem.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_details', 'Plan Details')}
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
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.employee.fullName ??
                    selectedItem.employee.firstName + ' ' + selectedItem.employee.lastName}
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
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type')}
              </span>
              <span className="gba:text-sm gba:text-gray-900">
                {translatePlanTypeValue(planTypeLabel ?? getPlanType())}
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
                {formatCurrencyDisplay(selectedItem.totalAmount, selectedItem.currency?.code)}
              </span>
            </div>

            {selectedItem.advancePaymentPaidAmount > 0 && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:approve_expense_request.advance_payment',
                    'Advance Payment'
                  )}
                </span>
                <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                  {formatCurrencyDisplay(selectedItem.advancePaymentPaidAmount, selectedItem.currency?.code)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TravelOrderAttachmentPreview
        record={selectedItem}
        fetchPdf={printExpensePlan as any}
        dataTestIdPrefix="expense-plan-details"
      />

      <Separator />

      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="default"
          onClick={() => {
            // Navigate to the expense plan record page
            const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
              expensePlanId: selectedItem.id,
              referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
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
    </div>
  )
}

export default ExpensePlanDetails
