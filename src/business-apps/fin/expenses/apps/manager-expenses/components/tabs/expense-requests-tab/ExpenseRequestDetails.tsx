import React from 'react'
import { Separator, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import Pill from '@/components/pill'
import { PiArrowRight, PiCheckCircle, PiXCircle, PiCalendarDuotone, PiClock } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel, getDateFormat, formatNumberFunction } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import dayjs from 'dayjs'

export interface ExpenseRequestDetailsProps extends BusinessAppContextProps {
  request: any
  onApprove?: (requestId: string) => Promise<void>
  onReject?: (requestId: string) => Promise<void>
}

const ExpenseRequestDetails: React.FC<ExpenseRequestDetailsProps> = ({ request, onApprove, onReject }) => {
  if (!request) return null

  // Get trip type
  const getTripType = () => {
    return 'Business Travel'
  }

  const canApprove = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED'
  const canReject = request.status === 'IN_APPROVAL' || request.status === 'VERIFICATION_REQUIRED'
  const statusConfig = getExpenseRequestStatusDisplay(request.status)

  const handleApprove = () => {
    if (onApprove) {
      onApprove(request.id)
    }
  }

  const handleReject = () => {
    if (onReject) {
      onReject(request.id)
    }
  }

  return (
    <div className="gba:p-6 gba:space-y-6" data-testid="expense-request-details-content">
      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start gba:mb-6">
        <div className="gba:flex-1">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-1" data-testid="expense-request-title">
            {request.title}
          </h2>
          <p className="gba:text-sm gba:text-gray-500" data-testid="expense-request-code">
            {request.code}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-3">
          <Pill
            type={statusConfig.type}
            label={statusConfig.label}
            color={statusConfig.color}
            data-testid="expense-request-status-badge"
          />
        </div>
      </div>

      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {request.startDate && request.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiCalendarDuotone className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:{' '}
                {dayjs(request.startDate).format(getDateFormat('date.short'))} {' → '}
                {dayjs(request.endDate).format(getDateFormat('date.short'))}
              </span>
            </div>
          )}

          {request.requestDate && (
            <div className="gba:flex gba:items-center gba:space-x-2">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.request_date', 'Request Date')}:{' '}
                {dayjs(request.requestDate).format(getDateFormat('date.short'))}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {request.description && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.description', 'Description')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-sm gba:text-gray-700" data-testid="expense-request-description">
              {request.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Information */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.title', 'Request Details')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:grid gba:grid-cols-1 gba:gap-4">
            {request.employee && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_overview.side_bar.requester',
                    'Requester'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {request.employee.displayName || request.employee.fullName}
                </span>
              </div>
            )}

            {request.employee?.employeePosition?.organizationalUnit && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.department_title',
                    'Department'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {request.employee.employeePosition.organizationalUnit.name}
                </span>
              </div>
            )}

            {request.employee?.employeePosition?.siteLocation && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.location_title',
                    'Location'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {request.employee.employeePosition.siteLocation.name}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.trip_type', 'Trip Type')}
              </span>
              <span className="gba:text-sm gba:text-gray-900">{getTripType()}</span>
            </div>

            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.expense_plan_table.total_amount',
                  'Total Amount'
                )}
              </span>
              <span className="gba:text-sm gba:font-semibold gba:text-gray-900">
                {typeof request.totalAmount === 'number'
                  ? `${formatNumberFunction(String(request.totalAmount))} ${
                      request.currencyRef?.split(':').pop() || '-'
                    }`
                  : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="gba:flex gba:justify-end gba:gap-3">
        {canApprove && onApprove && (
          <Button
            variant="default"
            onClick={handleApprove}
            className="gba:flex gba:items-center gba:gap-2 gba:bg-green-500 gba:text-background gba:hover:bg-green-600"
            data-testid="expense-request-approve-button"
          >
            {getTranslationFromI18nKeyAndLabel('expense_request_approve', 'Approve')}
            <PiCheckCircle className="gba:h-4 gba:w-4" />
          </Button>
        )}
        {canReject && onReject && (
          <Button
            variant="destructive"
            onClick={handleReject}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="expense-request-reject-button"
          >
            {getTranslationFromI18nKeyAndLabel('expense_request_reject', 'Reject')}
            <PiXCircle className="gba:h-4 gba:w-4" />
          </Button>
        )}
        <Button
          variant="default"
          onClick={() => {
            // Navigate to the expense request record page
            const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
              expenseRequestId: request.id,
              referrer: '/platform/fin/expenses/manager-expenses?tab=expense-requests'
            })
            navigateTo(url)
          }}
          data-testid="expense-request-view-details-button"
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
