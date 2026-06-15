import React, { useState, useEffect, useCallback } from 'react'
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
import { formatDate } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrencyDisplay } from './utils/currency'
import { useGetExpensePlanRecord } from './hooks/useGetExpensePlanRecord'
import { getExpensePlanStatusDisplayT } from '../../common/utils/statusDisplayUtils'
import { BackButton } from '@/components/back-button'

// Import tab components
import ExpensePlanItems from './components/ExpensePlanItems.tsx'
import { ExpenseRecordHeaderSummary } from '../../common/components/record/ExpenseRecordHeaderSummary'
import ExpensePlanAllowances from './components/ExpensePlanAllowances.tsx'
import ExpensePlanTrip from './components/ExpensePlanTrip.tsx'
import ExpensePlanAdvancePayments from './components/ExpensePlanAdvancePayments.tsx'
import ExpensePlanComments from './components/ExpensePlanComments.tsx'
import { useExpensePlanRecordActions } from './hooks/useExpensePlanRecordActions'
import { ExpenseOwnerActionMenu } from '../../common/components/owner-actions/ExpenseOwnerActionMenu'
import { ExpenseEntityOwnerDiscardDialog } from '../../common/components/owner-actions/ExpenseEntityOwnerDiscardDialog'
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

const ExpensePlanRecord: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo, additionalData = {} }) => {
  const { t } = useTranslation(expensePlanRecordTranslations)
  const expensePlanId =
    additionalData.expensePlanId || new URLSearchParams(window.location.search).get('expensePlanId') || ''

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

  const handleDiscardSuccess = useCallback(() => {
    navigateTo(backUrl)
  }, [backUrl])

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
  const { expensePlan, loading, error, fetchExpensePlan } = useGetExpensePlanRecord({
    accessToken,
    expensePlanId
  })

  useProcessCompletion({
    onSuccess: () => {
      if (expensePlanId) {
        void fetchExpensePlan(expensePlanId, { silent: true })
      }
    }
  })

  const planOwnerActions = useExpensePlanRecordActions({
    expensePlan,
    expensePlanId,
    accessToken,
    userInfo,
    onDiscardSuccess: handleDiscardSuccess
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
          <span>{t('expense-plan-record-tab-items')}</span>
        </div>
      ),
      children: (
        <ExpensePlanItems
          expensePlanItems={expensePlan?.expensePlanItem || []}
          planTotals={{
            totalAmount: expensePlan?.totalAmount ?? 0,
            reimbursableAmount: expensePlan?.reimbursableAmount ?? 0,
            nonReimbursableAmount: expensePlan?.nonReimbursableAmount ?? 0,
            deductibleAmount: expensePlan?.deductibleAmount ?? 0,
            nonDeductibleAmount: expensePlan?.nonDeductibleAmount ?? 0
          }}
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
                <span>{t('expense-plan-record-tab-allowances')}</span>
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
                <span>{t('expense-plan-record-tab-trip')}</span>
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
                <span>{t('expense-plan-record-tab-advance-payments')}</span>
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
                <span>{t('expense-plan-record-comments')}</span>
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
      <div className="gba:px-4 gba:py-2">
        <ExpenseRecordHeaderSummary
          title={expensePlan.title}
          code={expensePlan.code}
          costCenterLabel={t('expense-plan-record-cost-center-label')}
          costCenterName={expensePlan.costCenter?.name}
          statusType={getExpensePlanStatusDisplayT(t, expensePlan.status).type}
          statusLabel={getExpensePlanStatusDisplayT(t, expensePlan.status).label}
          costCenterTestId="expense-plan-record-header-cost-center"
          statusTestId="expense-plan-status-pill"
          titleActions={
            <ExpenseOwnerActionMenu
              actions={planOwnerActions.actions}
              accessToken={accessToken}
              placement="record-header"
              testIdPrefix="expense-plan-record-action"
            />
          }
        />
        {expensePlan?.startDate && expensePlan?.endDate && (
          <div className="gba:flex gba:items-center gba:mb-2">
            <CalendarIcon weight="duotone" className="gba:mr-2" />
            <span className="gba:text-sm">
              {t('expense-plan-record-duration')}: {formatDate(expensePlan.startDate, 'date.short')} {' → '}
              {formatDate(expensePlan.endDate, 'date.short')}
            </span>
          </div>
        )}
        <div className="gba:flex gba:items-center gba:mb-2">
          <ClockIcon className="gba:mr-2" />
          <span className="gba:text-sm">
            {t('expense-plan-record-plan-date')}:{' '}
            {expensePlan?.planDate ? formatDate(expensePlan.planDate, 'date.short') : '-'}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:mb-4">
          <PathIcon className="gba:mr-2" />
          <span className="gba:text-sm">
            {t('expense-plan-record-decision-date')}:{' '}
            {expensePlan?.decisionDate ? formatDate(expensePlan.decisionDate, 'date.short') : '-'}
          </span>
        </div>
        <span className="gba:block gba:mb-4">{expensePlan.description ?? '-'}</span>
        <div className="gba:grid gba:grid-cols-1 gba:gap-1">
          <div>
            <span className="gba:text-gray-500">{t('expense-plan-record-requester')}: </span>
            <span>
              {expensePlan?.employee?.fullName ??
                expensePlan?.employee?.firstName + ' ' + expensePlan?.employee?.lastName}
            </span>
          </div>
          {expensePlan?.employee?.employeePosition?.supervisor && (
            <div>
              <span className="gba:text-gray-500">{t('expense-plan-record-manager')}: </span>
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
            <span className="gba:text-gray-500">{t('expense-plan-record-project')}: </span>
            <span>{expensePlan?.project?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">{t('expense-plan-record-total-amount')}: </span>
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
        headerLabel={t('expense-plan-record-title')}
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
      errorTitle = t('expense-plan-record-missing-plan-id')
    } else if (
      error &&
      (error.includes('No expense plan data found') || error.includes('No expense plan ID provided'))
    ) {
      // Case 2: Expense plan not found with the provided ID
      errorTitle = t('expense-plan-record-plan-not-found')
      errorDescription = t('expense-plan-record-no-plan-found')
    } else {
      // Case 3: Other errors
      errorTitle = t('general-error-title')
    }

    return (
      <PageLayout
        headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
        headerLabel={t('expense-plan-record-title')}
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
    <>
      <PageLayout
        headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
        headerLabel={t('expense-plan-record-title')}
        headerTopLeft={
          <BackButton
            dataTestId="expense-plan-record-back-button"
            customBackText={t('expense-plan-record-back')}
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

      <ExpenseEntityOwnerDiscardDialog
        open={planOwnerActions.discardDialogOpen}
        entityTitle={planOwnerActions.discardTarget?.title}
        isSubmitting={planOwnerActions.isDiscarding}
        labels={planOwnerActions.discardDialogLabels}
        testIdPrefix="discard-expense-plan-record"
        t={planOwnerActions.t}
        onOpenChange={planOwnerActions.handleDiscardDialogOpenChange}
        onConfirm={planOwnerActions.handleConfirmDiscard}
      />
    </>
  )
}

export default ExpensePlanRecord
