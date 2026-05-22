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
import Pill from '@/components/pill'
import { formatDate } from '@/common/utils/windowUtils'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseRequestRecord } from './hooks/useGetExpenseRequestRecord'
import { getExpenseRequestStatusDisplayT } from '../../common/utils/statusDisplayUtils'
import { formatCurrencyDisplay } from '../expense-plan-record/utils/currency'
import { BackButton } from '@/components/back-button'
import { useFileClient } from '@/common/network/files/useFileClient'
import TravelOrderAttachmentPreview from '../../common/components/document-preview/TravelOrderAttachmentPreview'

// Import tab components
import ExpenseRequestItems from './components/ExpenseRequestItems.tsx'
import ExpenseRequestAllowances from './components/ExpenseRequestAllowances.tsx'
import ExpenseRequestTrip from './components/ExpenseRequestTrip.tsx'
import ExpenseRequestAdvancePayments from './components/ExpenseRequestAdvancePayments.tsx'
import ExpenseRequestComments from './components/ExpenseRequestComments.tsx'
import expenseRequestRecordTranslations from './_i18n'

// Using DS-styled markup instead of antd Typography

const ExpenseRequestRecord: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo, additionalData = {} }) => {
  const { t } = useTranslation(expenseRequestRecordTranslations)
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  const expenseRequestId =
    additionalData.expenseRequestId || new URLSearchParams(window.location.search).get('expenseRequestId') || ''

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

  // Fetch PDF for travel order preview
  const fetchPdf = useCallback(
    async (record: any): Promise<{ success: boolean; pdfUrl?: string; error?: string }> => {
      if (!record?.employeeDocument?.file) {
        return { success: false, error: 'No document available' }
      }

      try {
        const employeeId = record?.employee?.id
        if (!employeeId) {
          return { success: false, error: 'No employee ID available' }
        }

        const fileId = record.employeeDocument.file?.split('/').pop()
        if (!fileId) {
          return { success: false, error: 'No file ID available' }
        }

        const blob = await fileClient.getFile(
          { accessScope: 'tenant', fileId },
          { appName: 'employee-profile', folderPath: `/documents/${employeeId}` }
        )

        const objectUrl = URL.createObjectURL(blob)
        return { success: true, pdfUrl: objectUrl }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to load document' }
      }
    },
    [fileClient]
  )

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
          <PathIcon className="gba:text-xl" />
          <span>{t('expense-request-record-tab-items')}</span>
        </div>
      ),
      children: (
        <ExpenseRequestItems
          expenseRequestItems={expenseRequest?.expenseRequestItem || []}
          currencyCode={expenseRequest?.currency?.code}
          accessToken={accessToken}
          userInfo={userInfo}
          expenseOwnerEmployeeId={expenseRequest?.employee?.id}
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
                <ClockIcon className="gba:text-xl" />
                <span>{t('expense-request-record-allowances')}</span>
              </div>
            ),
            children: (
              <ExpenseRequestAllowances
                expenseAllowances={expenseRequest.expenseAllowance}
                currencyCode={expenseRequest?.currency?.code}
              />
            )
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
                <MapPinIcon className="gba:text-xl" />
                <span>{t('expense-request-record-tab-trip')}</span>
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
                <HandCoinsIcon className="gba:text-xl" />
                <span>{t('expense-request-record-tab-advance-payments')}</span>
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
                <ChatCircleIcon className="gba:text-xl" />
                <span>{t('expense-request-record-comments')}</span>
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
            <div className="gba:mt-1" data-testid="expense-request-record-header-cost-center">
              <span className="gba:text-gray-500">{t('expense-request-record-cost-center-label')}: </span>
              <span>{expenseRequest?.costCenter?.name ?? '-'}</span>
            </div>
          </div>
          <Pill
            type={getExpenseRequestStatusDisplayT(t, expenseRequest.status).type}
            label={getExpenseRequestStatusDisplayT(t, expenseRequest.status).label}
            className="gba:text-base"
            data-testid="expense-request-status-pill"
          />
        </div>
        {expenseRequest?.startDate && expenseRequest?.endDate && (
          <div className="gba:flex gba:items-center gba:mb-2">
            <CalendarIcon weight="duotone" className="gba:mr-2" />
            <span className="gba:text-sm">
              {t('expense-request-record-duration')}: {formatDate(expenseRequest.startDate, 'date.short')} {' → '}
              {formatDate(expenseRequest.endDate, 'date.short')}
            </span>
          </div>
        )}
        <div className="gba:flex gba:items-center gba:mb-2">
          <ClockIcon className="gba:mr-2" />
          <span className="gba:text-sm">
            {t('expense-request-record-request-date')}:{' '}
            {expenseRequest?.requestDate ? formatDate(expenseRequest.requestDate, 'date.short') : '-'}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:mb-4">
          <PathIcon className="gba:mr-2" />
          <span className="gba:text-sm">
            {t('expense-request-record-decision-date')}:{' '}
            {expenseRequest?.decisionDate ? formatDate(expenseRequest.decisionDate, 'date.short') : '-'}
          </span>
        </div>
        <span className="gba:block gba:mb-4">{expenseRequest.description ?? '-'}</span>
        <div className="gba:grid gba:grid-cols-1 gba:gap-1">
          <div>
            <span className="gba:text-gray-500">{t('expense-request-record-requester')}: </span>
            <span>
              {expenseRequest?.employee?.fullName ??
                expenseRequest?.employee?.firstName + ' ' + expenseRequest?.employee?.lastName}
            </span>
          </div>
          {expenseRequest?.employee?.employeePosition?.supervisor && (
            <div>
              <span className="gba:text-gray-500">{t('expense-request-record-manager')}: </span>
              <span>
                {expenseRequest.employee.employeePosition.supervisor.fullName ??
                  expenseRequest.employee.employeePosition.supervisor.firstName +
                    ' ' +
                    expenseRequest.employee.employeePosition.supervisor.lastName}
              </span>
            </div>
          )}
          <div data-testid="expense-request-record-requester-cost-center">
            <span className="gba:text-gray-500">{t('expense-request-record-requester-cost-center-label')}: </span>
            <span>{expenseRequest?.employee?.employeePosition?.costCenter?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">{t('expense-request-record-project')}: </span>
            <span>{expenseRequest?.project?.name ?? '-'}</span>
          </div>
          <div>
            <span className="gba:text-gray-500">{t('expense-request-record-total-amount')}: </span>
            <span>{formatCurrencyDisplay(expenseRequest?.totalAmount, expenseRequest?.currency?.code)}</span>
          </div>
        </div>
        {/* Travel Order Document */}
        <div className="gba:mt-6">
          <TravelOrderAttachmentPreview
            record={expenseRequest}
            fetchPdf={fetchPdf}
            dataTestIdPrefix="expense-request-record"
          />
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
        headerLabel={t('expense-request-record-title')}
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
      errorTitle = t('expense-request-record-missing-request-id')
    } else if (
      error &&
      (error.includes('No expense request data found') || error.includes('No expense request ID provided'))
    ) {
      // Case 2: Expense request not found with the provided ID
      errorTitle = t('expense-request-record-request-not-found')
      errorDescription = `${t('expense-request-record-no-request-found')} ${expenseRequestId}`
    } else {
      // Case 3: Other errors
      errorTitle = t('general-error-title')
    }

    return (
      <PageLayout
        headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
        headerLabel={t('expense-request-record-title')}
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
      headerIcon={<WalletIcon weight="duotone" className="gba:text-primary" />}
      headerLabel={t('expense-request-record-title')}
      headerTopLeft={<BackButton dataTestId="expense-request-record-back-button" backUrl={backUrl} />}
      contentContainer={
        <div className="gba:overflow-y-auto gba:overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="gba:p-3 gba:flex gba:flex-row gba:gap-3" data-testid="expense-request-record-container">
            <Card className="gba:w-1/4">{renderHeader()}</Card>
            <Card className="gba:w-3/4">
              <div className="gba:mt-2" data-testid="expense-request-record-tabs">
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

export default ExpenseRequestRecord
