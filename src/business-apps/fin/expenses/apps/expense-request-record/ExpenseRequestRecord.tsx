import React, { useState, useEffect } from 'react'
import { Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { Spinner, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import {
  PiPath,
  PiHandCoins,
  PiMapPin,
  PiClock,
  PiChatCircle,
  PiWalletDuotone,
  PiCalendarDuotone
} from 'react-icons/pi'
import Pill from '@/components/pill'
import { formatDate } from '@/common/utils/windowUtils'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetExpenseRequestRecord } from './hooks/useGetExpenseRequestRecord'
import { getExpenseRequestStatusDisplay } from './utils'
import { formatCurrencyDisplay } from '../expense-plan-record/utils/currency'
import { BackButton } from '@/components/back-button'

// Import tab components
import ExpenseRequestItems from './components/ExpenseRequestItems.tsx'
import ExpenseRequestAllowances from './components/ExpenseRequestAllowances.tsx'
import ExpenseRequestTrip from './components/ExpenseRequestTrip.tsx'
import ExpenseRequestAdvancePayments from './components/ExpenseRequestAdvancePayments.tsx'
import ExpenseRequestComments from './components/ExpenseRequestComments.tsx'

// Using DS-styled markup instead of antd Typography

const ExpenseRequestRecord: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData = {} }) => {
  const expenseRequestId =
    additionalData.expenseRequestId ||
    new URLSearchParams(window.location.search).get('expenseRequestId') ||
    'bfe6323f-236b-4245-9759-5215a6a97209'

  // Determine the back URL based on referrer or query parameter
  const getBackUrl = (): string => {
    const urlParams = new URLSearchParams(window.location.search)
    const referrerParam = urlParams.get('referrer')

    // If a referrer is explicitly provided in the URL
    if (referrerParam) {
      return referrerParam
    }

    // Check document referrer
    if (document.referrer) {
      const referrerUrl = new URL(document.referrer)
      // If coming from personal-expenses, manager-expenses, or backoffice-expenses
      if (referrerUrl.pathname.includes('/personal-expenses')) {
        return '/platform/fin/expenses/personal-expenses?tab=expense-requests'
      }
      if (referrerUrl.pathname.includes('/manager-expenses')) {
        return '/platform/fin/expenses/manager-expenses?tab=expense-requests'
      }
      if (referrerUrl.pathname.includes('/backoffice-expenses')) {
        return '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
      }
    }

    // Default fallback to expenses launcher
    return '/platform/fin/expenses/expenses-launcher'
  }

  const backUrl = getBackUrl()

  // Helper function to get initial tab from URL or available tabs
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    const defaultTab = 'items' // Items tab is always available

    // If no tab specified in URL, return default
    if (!tabFromUrl) {
      return defaultTab
    }

    // Check if the requested tab has data and should be shown
    const hasAllowances = expenseRequest?.expenseAllowance && expenseRequest.expenseAllowance.length > 0
    const hasTrips = expenseRequest?.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0
    const hasAdvancePayments =
      expenseRequest?.expensePlan?.advancePayment && expenseRequest.expensePlan.advancePayment.length > 0
    const hasComments = expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0

    // Map tabs to their data availability
    const availableTabs: Record<string, boolean> = {
      items: true, // Always available
      allowances: Boolean(hasAllowances),
      trip: Boolean(hasTrips),
      'advance-payments': Boolean(hasAdvancePayments),
      comments: Boolean(hasComments)
    }

    // Return the requested tab if it's valid and has data, otherwise default
    return tabFromUrl in availableTabs && availableTabs[tabFromUrl] ? tabFromUrl : defaultTab
  }

  // Default to 'items' tab initially
  const [activeTab, setActiveTab] = useState<string>('items')

  // Use the custom hook to fetch expense request data
  const { expenseRequest, loading, error } = useGetExpenseRequestRecord({
    accessToken,
    expenseRequestId
  })

  // Update active tab when expense request data is loaded
  useEffect(() => {
    if (expenseRequest) {
      // Now that we have data, we can determine which tab to show
      const initialTab = getInitialTab()
      setActiveTab(initialTab)
    }
  }, [expenseRequest])

  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    window.history.pushState({}, '', url.toString())
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabFromUrl = urlParams.get('tab')
      const defaultTab = 'items'

      if (!tabFromUrl) {
        setActiveTab(defaultTab)
        return
      }

      // Check if the requested tab has data and should be shown
      const hasAllowances = expenseRequest?.expenseAllowance && expenseRequest.expenseAllowance.length > 0
      const hasTrips = expenseRequest?.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0
      const hasAdvancePayments =
        expenseRequest?.expensePlan?.advancePayment && expenseRequest.expensePlan.advancePayment.length > 0
      const hasComments = expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0

      // Map tabs to their data availability
      const availableTabs: Record<string, boolean> = {
        items: true, // Always available
        allowances: Boolean(hasAllowances),
        trip: Boolean(hasTrips),
        'advance-payments': Boolean(hasAdvancePayments),
        comments: Boolean(hasComments)
      }

      // Set the requested tab if it's available, otherwise default
      if (tabFromUrl in availableTabs && availableTabs[tabFromUrl]) {
        setActiveTab(tabFromUrl)
      } else {
        setActiveTab(defaultTab)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [expenseRequest])

  // Define tab items - only include tabs with data
  const tabItems = [
    // Items tab - always show as it's the main tab
    {
      key: 'items',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiPath className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.items', 'Items')}</span>
        </div>
      ),
      children: (
        <ExpenseRequestItems
          expenseRequestItems={expenseRequest?.expenseRequestItem || []}
          currencyCode={expenseRequest?.currency?.code}
        />
      )
    },

    // Allowances tab - only show if there are allowances
    ...(expenseRequest?.expenseAllowance && expenseRequest.expenseAllowance.length > 0
      ? [
          {
            key: 'allowances',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiClock className="gba:text-xl" />
                <span>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.allowances', 'Allowances')}
                </span>
              </div>
            ),
            children: <ExpenseRequestAllowances expenseAllowances={expenseRequest.expenseAllowance} />
          }
        ]
      : []),

    // Trip tab - only show if there are trips
    ...(expenseRequest?.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0
      ? [
          {
            key: 'trip',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiMapPin className="gba:text-xl" />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')}</span>
              </div>
            ),
            children: <ExpenseRequestTrip expenseRequestTrips={expenseRequest.expenseRequestTrip} />
          }
        ]
      : []),

    // Advance payments tab - only show if there are advance payments
    ...(expenseRequest?.expensePlan?.advancePayment && expenseRequest.expensePlan.advancePayment.length > 0
      ? [
          {
            key: 'advance-payments',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiHandCoins className="gba:text-xl" />
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_landing_page.advance_payments',
                    'Advance Payments'
                  )}
                </span>
              </div>
            ),
            children: <ExpenseRequestAdvancePayments advancePayments={expenseRequest.expensePlan.advancePayment} />
          }
        ]
      : []),

    // Comments tab - only show if there are comments
    ...(expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0
      ? [
          {
            key: 'comments',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiChatCircle className="gba:text-xl" />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.comments', 'Comments')}</span>
              </div>
            ),
            children: <ExpenseRequestComments comments={expenseRequest.expenseRequestComment} />
          }
        ]
      : [])
  ]
  // Render header with expense request summary
  const renderHeader = () => {
    if (!expenseRequest) return null

    return (
      <div className="gba:ml-6 gba:mr-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-1">{expenseRequest.title ?? '-'}</h4>
            <span className="gba:text-gray-500">{expenseRequest?.code}</span>
          </div>
          <Pill
            type={getExpenseRequestStatusDisplay(expenseRequest.status).type}
            label={getExpenseRequestStatusDisplay(expenseRequest.status).label}
            className="gba:text-base"
            data-testid="expense-request-status-pill"
          />
        </div>
        {expenseRequest?.startDate && expenseRequest?.endDate && (
          <div className="gba:flex gba:items-center gba:mb-2">
            <PiCalendarDuotone className="gba:mr-2" />
            <span className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:{' '}
              {formatDate(expenseRequest.startDate, 'date.short')} {' → '}
              {formatDate(expenseRequest.endDate, 'date.short')}
            </span>
          </div>
        )}
        <div className="gba:flex gba:items-center gba:mb-2">
          <PiClock className="gba:mr-2" />
          <span className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:confirm_transfer_advance_payment.request_date_label',
              'Request Date'
            )}
            : {expenseRequest?.requestDate ? formatDate(expenseRequest.requestDate, 'date.short') : '-'}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:mb-4">
          <PiPath className="gba:mr-2" />
          <span className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.decision_date', 'Decision Date')}:{' '}
            {expenseRequest?.decisionDate ? formatDate(expenseRequest.decisionDate, 'date.short') : '-'}
          </span>
        </div>
        <span className="gba:block gba:mb-4">{expenseRequest.description ?? '-'}</span>
        <div className="gba:grid gba:grid-cols-1 gba:gap-1">
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.requester', 'Requester')}:{' '}
            </span>
            <span>{expenseRequest?.employee?.fullName}</span>
          </div>
          {expenseRequest?.employee?.employeePosition?.supervisor && (
            <div>
              <span className="gba:text-gray-500">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.summary_layout.public_profile_container.manager',
                  'Manager'
                )}
                :{' '}
              </span>
              <span>{expenseRequest.employee.employeePosition.supervisor.fullName}</span>
            </div>
          )}
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
                'Cost Center'
              )}
              :{' '}
            </span>
            <span>{expenseRequest?.costCenter?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project')}:{' '}
            </span>
            <span>{expenseRequest?.project?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.expense_plan_table.total_amount',
                'Total Amount'
              )}
              :{' '}
            </span>
            <span>{formatCurrencyDisplay(expenseRequest?.totalAmount, expenseRequest?.currency?.code)}</span>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Helper function to map expense plan status to appropriate Pill type
   *
   * Status definitions:
   * - PREPARED: Initial state when expense plan is being prepared but not yet submitted
   * - CREATED: Expense plan has been created in the system
   * - ASSIGNED: Expense plan has been assigned to a reviewer/approver
   * - PENDING: Expense plan is pending approval
   * - APPROVED: Expense plan has been approved
   * - RETURNED: Expense plan has been returned for corrections
   * - REJECTED: Expense plan has been rejected
   * - VERIFIED: Expense plan has been verified after approval
   * - BOOKED: Expense plan has been booked in the financial system
   * - PAID: Expense plan has been paid out
   * - CLOSED: Expense plan process is completed and closed
   * - DISCARDED: Expense plan has been discarded/canceled
   * - TRANSFERRED: Expense plan has been transferred to another system
   */
  // Status display is now handled by the imported getExpensePlanStatusDisplay function

  if (loading) {
    return (
      <PageLayout
        headerIcon={<PiWalletDuotone className="gba:text-primary" />}
        headerLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_records.request.title',
          'Expense Request Record'
        )}
        headerTopLeft={<BackButton dataTestId="expense-request-record-back-button" backUrl={backUrl} />}
        contentContainer={
          <div
            className="gba:flex gba:justify-center gba:items-center gba:h-64"
            data-testid="expense-request-record-loading"
          >
            <Spinner />
          </div>
        }
      />
    )
  }

  // Handle various error cases
  if (error || !expenseRequestId) {
    let errorTitle
    let errorDescription

    if (!expenseRequestId) {
      // Case 1: No expense plan ID provided
      errorTitle = getTranslationFromI18nKeyAndLabel('expense.plan.record.missing.title', 'Missing Expense Plan ID')
    } else if (
      error &&
      (error.includes('No expense request data found') || error.includes('No expense request ID provided'))
    ) {
      // Case 2: Expense request not found with the provided ID
      errorTitle = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_records.request.request_not_found',
        'Expense Request Not Found'
      )
      errorDescription =
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_records.request.no_request_found',
          `No expense request found with ID:`
        ) +
        ' ' +
        expenseRequestId
    } else {
      // Case 3: Other errors
      errorTitle = getTranslationFromI18nKeyAndLabel('lowcoder:general_notifications.error_title', 'Error')
    }

    return (
      <PageLayout
        headerIcon={<PiWalletDuotone className="gba:text-primary" />}
        headerLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_records.request.title',
          'Expense Request Record'
        )}
        headerTopLeft={<BackButton dataTestId="expense-request-record-back-button" backUrl={backUrl} />}
        contentContainer={
          <Alert variant="destructive" data-testid="expense-request-record-error">
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorDescription}</AlertDescription>
          </Alert>
        }
      />
    )
  }

  return (
    <PageLayout
      headerIcon={<PiWalletDuotone className="gba:text-primary" />}
      headerLabel={getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_records.request.title',
        'Expense Request Record'
      )}
      headerTopLeft={<BackButton dataTestId="expense-request-record-back-button" backUrl={backUrl} />}
      contentContainer={
        <div className="gba:overflow-y-auto gba:overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="gba:p-3 gba:flex gba:flex-row gba:gap-3" data-testid="expense-request-record-container">
            <Card className="gba:w-1/4">{renderHeader()}</Card>
            <Card className="gba:w-3/4">
              <div className="gba:mt-2" data-testid="expense-request-record-tabs">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="gba:grid gba:grid-cols-5 gba:w-full gba:ml-6 gba:mr-6">
                    {tabItems.map(t => (
                      <TabsTrigger key={t.key} value={t.key}>
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {tabItems.map(t => (
                    <TabsContent key={t.key} value={t.key} className="gba:mt-4">
                      <div className="gba:overflow-y-auto gba:overflow-x-hidden" style={{ maxHeight: 600 }}>
                        {t.children}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </Card>
          </div>
        </div>
      }
    />
  )
}

export default ExpenseRequestRecord
