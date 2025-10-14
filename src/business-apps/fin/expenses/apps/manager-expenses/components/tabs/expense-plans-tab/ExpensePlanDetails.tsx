import React from 'react'
import { Separator, Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import Pill from '@/components/pill'
import { getExpensePlanStatusDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiCalendarDuotone, PiClock, PiPath, PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ExpensePlan } from '../../../hooks/useMainViewExpensePlans'

export interface ExpensePlanDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpensePlan
  onClose: () => void
}

const ExpensePlanDetails: React.FC<ExpensePlanDetailsProps> = ({ selectedItem }) => {
  if (!selectedItem) return null

  // Get user locale for currency and date formatting
  const userLocale = getCurrentActiveUserLocale()

  // Get trip type - localized default since we may not have requestType on manager view
  const getTripType = () => {
    return getTranslationFromI18nKeyAndLabel('lowcoder:trip_type.business_travel', 'Business Travel')
  }

  // Format amount with proper currency formatting
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(userLocale, {
      style: 'currency',
      currency: currency
    }).format(amount)
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
              <Pill
                type={statusConfig.type}
                label={statusConfig.label}
                color={statusConfig.color}
                data-testid="expense-plan-status-badge"
              />
            )
          })()}
        </div>
      </div>

      {/* Date Information */}
      <Card>
        <CardContent className="gba:p-4 gba:space-y-3">
          {selectedItem.startDate && selectedItem.endDate && (
            <div className="gba:flex gba:items-center gba:space-x-2" data-testid="expense-plan-duration">
              <PiCalendarDuotone className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:{' '}
                {new Date(selectedItem.startDate).toLocaleDateString(userLocale, {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                })}{' '}
                {' → '}
                {new Date(selectedItem.endDate).toLocaleDateString(userLocale, {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </span>
            </div>
          )}

          {selectedItem.planDate && (
            <div className="gba:flex gba:items-center gba:space-x-2" data-testid="expense-plan-plan-date">
              <PiClock className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')}:{' '}
                {new Date(selectedItem.planDate).toLocaleDateString(userLocale, {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </span>
            </div>
          )}

          {selectedItem.decisionDate && (
            <div className="gba:flex gba:items-center gba:space-x-2" data-testid="expense-plan-decision-date">
              <PiPath className="gba:text-gray-500" />
              <span className="gba:text-sm gba:text-gray-700">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decision_date', 'Decision Date')}:{' '}
                {new Date(selectedItem.decisionDate).toLocaleDateString(userLocale, {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit'
                })}
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
                  {selectedItem.employee.fullName ||
                    `${selectedItem.employee.firstName ?? ''} ${selectedItem.employee.lastName ?? ''}`.trim()}
                </span>
              </div>
            )}

            {selectedItem.employee?.employeePosition?.organizationalUnit && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.department_title',
                    'Department'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.employee.employeePosition.organizationalUnit.name}
                </span>
              </div>
            )}

            {selectedItem.employee?.employeePosition?.siteLocation && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.profile_icon_list.location_title',
                    'Location'
                  )}
                </span>
                <span className="gba:text-sm gba:text-gray-900">
                  {selectedItem.employee.employeePosition.siteLocation.name}
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
                {typeof selectedItem.totalAmount === 'number' && selectedItem.currency
                  ? formatAmount(selectedItem.totalAmount, selectedItem.currency)
                  : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="default"
          onClick={() => {
            // Navigate to the expense plan record page
            const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
              expensePlanId: selectedItem.id,
              referrer: '/platform/fin/expenses/manager-expenses?tab=expense-plans'
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
