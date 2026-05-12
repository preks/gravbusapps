import React, { useState, useEffect } from 'react'
import {
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  useTranslation
} from '@newwork/nw-design-system'
import {
  PathIcon,
  HandCoinsIcon,
  MapPinIcon,
  ClockIcon,
  ChatCircleIcon,
  WalletIcon,
  CalendarIcon
} from '@phosphor-icons/react'
import Pill from '@/components/pill'
import { formatDate } from '@/common/utils/windowUtils'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from './utils/currency'
import { useGetExpensePlanRecord } from './hooks/useGetExpensePlanRecord'
import { getExpensePlanStatusDisplay } from './utils'
import { BackButton } from '@/components/back-button'

// Import tab components
import ExpensePlanItems from './components/ExpensePlanItems.tsx'
import ExpensePlanAllowances from './components/ExpensePlanAllowances.tsx'
import ExpensePlanTrip from './components/ExpensePlanTrip.tsx'
import ExpensePlanAdvancePayments from './components/ExpensePlanAdvancePayments.tsx'
import ExpensePlanComments from './components/ExpensePlanComments.tsx'
import expensePlanRecordTranslations from './_i18n'

// Helper function to check if expense plan has comments
const hasComments = (expensePlan: any): boolean => {
  if (!expensePlan) return false

  // Check if expense plan has comments
  const hasPlanComments = expensePlan.expensePlanComment && expensePlan.expensePlanComment.length > 0

  // Check if any advance payment has comments
  const hasAdvancePaymentComments =
    expensePlan.advancePayment &&
    expensePlan.advancePayment.some((ap: any) => ap.advancePaymentComment && ap.advancePaymentComment.length > 0)

  return hasPlanComments || hasAdvancePaymentComments
}

const ExpensePlanRecord: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData = {} }) => {
  const { t } = useTranslation(expensePlanRecordTranslations)
  const expensePlanId =
    additionalData.expensePlanId ||
    new URLSearchParams(window.location.search).get('expensePlanId') ||
    'd64d1b89-148e-462d-9add-534722eefe95'

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
        return '/platform/fin/expenses/personal-expenses?tab=expense-plans'
      }
      if (referrerUrl.pathname.includes('/manager-expenses')) {
        return '/platform/fin/expenses/manager-expenses?tab=expense-plans'
      }
      if (referrerUrl.pathname.includes('/backoffice-expenses')) {
        return '/platform/fin/expenses/backoffice-expenses?tab=expense-plans'
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
    const hasAllowances = expensePlan?.expenseAllowance && expensePlan.expenseAllowance.length > 0
    const hasTrips = expensePlan?.expenseRequestTrip && expensePlan.expenseRequestTrip.length > 0
    const hasAdvancePayments = expensePlan?.advancePayment && expensePlan.advancePayment.length > 0
    const hasCommentsResult = hasComments(expensePlan)
    // Map tabs to their data availability
    const availableTabs: Record<string, boolean> = {
      items: true, // Always available
      allowances: Boolean(hasAllowances),
      trip: Boolean(hasTrips),
      'advance-payments': Boolean(hasAdvancePayments),
      comments: Boolean(hasCommentsResult)
    }

    // Return the requested tab if it's valid and has data, otherwise default
    return tabFromUrl in availableTabs && availableTabs[tabFromUrl] ? tabFromUrl : defaultTab
  }

  // Default to 'items' tab initially
  const [activeTab, setActiveTab] = useState<string>('items')

  // Use the custom hook to fetch expense plan data
  const { expensePlan, loading, error } = useGetExpensePlanRecord({
    accessToken,
    expensePlanId
  })

  // Update active tab when expense plan data is loaded
  useEffect(() => {
    if (expensePlan) {
      // Now that we have data, we can determine which tab to show
      const initialTab = getInitialTab()
      setActiveTab(initialTab)
    }
  }, [expensePlan])

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
      const hasAllowances = expensePlan?.expenseAllowance && expensePlan.expenseAllowance.length > 0
      const hasTrips = expensePlan?.expenseRequestTrip && expensePlan.expenseRequestTrip.length > 0
      const hasAdvancePayments = expensePlan?.advancePayment && expensePlan.advancePayment.length > 0
      const hasCommentsResult = hasComments(expensePlan)
      // Map tabs to their data availability
      const availableTabs: Record<string, boolean> = {
        items: true, // Always available
        allowances: Boolean(hasAllowances),
        trip: Boolean(hasTrips),
        'advance-payments': Boolean(hasAdvancePayments),
        comments: Boolean(hasCommentsResult)
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
  }, [expensePlan])

  // Define tab items - only include tabs with data
  const tabItems = [
    // Items tab - always show as it's the main tab
    {
      key: 'items',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PathIcon className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.items', 'Items')}</span>
        </div>
      ),
      children: (
        <ExpensePlanItems
          expensePlanItems={expensePlan?.expensePlanItem || []}
          currencyCode={expensePlan?.currency?.code}
        />
      )
    },

    // Allowances tab - only show if there are allowances
    ...(expensePlan?.expenseAllowance && expensePlan.expenseAllowance.length > 0
      ? [
          {
            key: 'allowances',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <ClockIcon className="gba:text-xl" />
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.expense_group_placeholders',
                    'Allowances'
                  )}
                </span>
              </div>
            ),
            children: (
              <ExpensePlanAllowances
                expenseAllowances={expensePlan.expenseAllowance}
                currencyCode={expensePlan?.currency?.code}
              />
            )
          }
        ]
      : []),

    // Trip tab - only show if there are trips
    ...(expensePlan?.expenseRequestTrip && expensePlan.expenseRequestTrip.length > 0
      ? [
          {
            key: 'trip',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <MapPinIcon className="gba:text-xl" />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')}</span>
              </div>
            ),
            children: <ExpensePlanTrip expenseRequestTrips={expensePlan.expenseRequestTrip} />
          }
        ]
      : []),

    // Advance payments tab - only show if there are advance payments
    ...(expensePlan?.advancePayment && expensePlan.advancePayment.length > 0
      ? [
          {
            key: 'advance-payments',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <HandCoinsIcon className="gba:text-xl" />
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_landing_page.advance_payments',
                    'Advance Payments'
                  )}
                </span>
              </div>
            ),
            children: <ExpensePlanAdvancePayments advancePayments={expensePlan.advancePayment} />
          }
        ]
      : []),

    // Comments tab - only show if there are comments
    ...(expensePlan?.expensePlanComment && expensePlan.expensePlanComment.length > 0
      ? [
          {
            key: 'comments',
            label: (
              <div className="gba:flex gba:items-center gba:gap-2">
                <ChatCircleIcon className="gba:text-xl" />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.comments', 'Comments')}</span>
              </div>
            ),
            children: (
              <ExpensePlanComments
                comments={expensePlan.expensePlanComment}
                advancePaymentComments={expensePlan.advancePayment?.flatMap(ap => ap.advancePaymentComment) || []}
              />
            )
          }
        ]
      : [])
  ]
  // Render header with expense plan summary
  const renderHeader = () => {
    if (!expensePlan) return null

    return (
      <div className="gba:ml-6 gba:mr-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <h4 className="gba:text-lg gba:font-semibold gba:mb-1">{expensePlan.title ?? '-'}</h4>
            <span className="gba:text-gray-500">{expensePlan?.code}</span>
            <div className="gba:mt-1" data-testid="expense-plan-record-header-cost-center">
              <span className="gba:text-gray-500">{t('expense-plan-record-cost-center-label')}: </span>
              <span>{expensePlan?.costCenter?.name ?? '-'}</span>
            </div>
          </div>
          <Pill
            type={getExpensePlanStatusDisplay(expensePlan.status).type}
            label={getExpensePlanStatusDisplay(expensePlan.status).label}
            className="gba:text-base"
            data-testid="expense-plan-status-pill"
          />
        </div>
        {expensePlan?.startDate && expensePlan?.endDate && (
          <div className="gba:flex gba:items-center gba:mb-2">
            <CalendarIcon weight="duotone" className="gba:mr-2" />
            <span className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration')}:{' '}
              {formatDate(expensePlan.startDate, 'date.short')} {' → '}
              {formatDate(expensePlan.endDate, 'date.short')}
            </span>
          </div>
        )}
        <div className="gba:flex gba:items-center gba:mb-2">
          <ClockIcon className="gba:mr-2" />
          <span className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')}:{' '}
            {expensePlan?.planDate ? formatDate(expensePlan.planDate, 'date.short') : '-'}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:mb-4">
          <PathIcon className="gba:mr-2" />
          <span className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.decision_date', 'Decision Date')}:{' '}
            {expensePlan?.decisionDate ? formatDate(expensePlan.decisionDate, 'date.short') : '-'}
          </span>
        </div>
        <span className="gba:block gba:mb-4">{expensePlan.description ?? '-'}</span>
        <div className="gba:grid gba:grid-cols-1 gba:gap-1">
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.requester', 'Requester')}:{' '}
            </span>
            <span>
              {expensePlan?.employee?.fullName ??
                expensePlan?.employee?.firstName + ' ' + expensePlan?.employee?.lastName}
            </span>
          </div>
          {expensePlan?.employee?.employeePosition?.supervisor && (
            <div>
              <span className="gba:text-gray-500">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.summary_layout.public_profile_container.manager',
                  'Manager'
                )}
                :{' '}
              </span>
              <span>
                {expensePlan.employee.employeePosition.supervisor.fullName ??
                  expensePlan.employee.employeePosition.supervisor.firstName +
                    ' ' +
                    expensePlan.employee.employeePosition.supervisor.lastName}
              </span>
            </div>
          )}
          <div data-testid="expense-plan-record-requester-cost-center">
            <span className="gba:text-gray-500">{t('expense-plan-record-requester-cost-center-label')}: </span>
            <span>{expensePlan?.employee?.employeePosition?.costCenter?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project')}:{' '}
            </span>
            <span>{expensePlan?.project?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.expense_plan_table.total_amount',
                'Total Amount'
              )}
              :{' '}
            </span>
            <span>{formatCurrencyDisplay(expensePlan?.totalAmount, expensePlan?.currency?.code)}</span>
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
        headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
        headerLabel={getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.title', 'Expense Plan Record')}
        headerTopLeft={<BackButton dataTestId="expense-plan-record-back-button" backUrl={backUrl} />}
        contentContainer={
          <div
            className="gba:flex gba:justify-center gba:items-center gba:h-64"
            data-testid="expense-plan-record-loading"
          >
            <Spinner />
          </div>
        }
      />
    )
  }

  // Handle various error cases
  if (error || !expensePlanId) {
    let errorTitle
    let errorDescription

    if (!expensePlanId) {
      // Case 1: No expense plan ID provided
      errorTitle = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_records.plan.missing_plan_id',
        'Missing Expense Plan ID'
      )
    } else if (
      error &&
      (error.includes('No expense plan data found') || error.includes('No expense plan ID provided'))
    ) {
      // Case 2: Expense plan not found with the provided ID
      errorTitle = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_records.plan.plan_not_found',
        'Expense Plan Not Found'
      )
      errorDescription = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_records.plan.no_plan_found',
        `No expense plan found with provided ID`
      )
    } else {
      // Case 3: Other errors
      errorTitle = getTranslationFromI18nKeyAndLabel('lowcoder:general_notifications.error_title', 'Error')
    }

    return (
      <PageLayout
        headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
        headerLabel={getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.title', 'Expense Plan Record')}
        headerTopLeft={<BackButton dataTestId="expense-plan-record-back-button" backUrl={backUrl} />}
        contentContainer={
          <Alert variant="destructive" data-testid="expense-plan-record-error">
            <AlertTitle>{errorTitle}</AlertTitle>
            <AlertDescription>{errorDescription}</AlertDescription>
          </Alert>
        }
      />
    )
  }

  return (
    <PageLayout
      headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
      headerLabel={getTranslationFromI18nKeyAndLabel('lowcoder:expense_records.plan.title', 'Expense Plan Record')}
      headerTopLeft={
        <BackButton
          dataTestId="expense-plan-record-back-button"
          customBackText={getTranslationFromI18nKeyAndLabel('lowcoder:modify_expense_request.back_text', 'Back')}
          backUrl={backUrl}
        />
      }
      contentContainer={
        <div className="gba:overflow-y-auto gba:overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="gba:p-3 gba:flex gba:flex-row gba:gap-3" data-testid="expense-plan-record-container">
            <Card className="gba:w-1/4">{renderHeader()}</Card>
            <Card className="gba:w-3/4">
              <div className="gba:mt-2" data-testid="expense-plan-record-tabs">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList className="gba:inline-flex gba:w-auto gba:mx-6">
                    {tabItems.map(t => (
                      <TabsTrigger key={t.key} value={t.key}>
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {tabItems.map(t => (
                    <TabsContent key={t.key} value={t.key} className="gba:mt-4 gba:mx-6">
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

export default ExpensePlanRecord
