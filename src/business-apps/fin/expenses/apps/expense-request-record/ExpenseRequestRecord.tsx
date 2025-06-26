import React, { useState, useEffect } from 'react';
import { Tabs, Card } from '@newwork/gravity-ui-catalog';
import { Typography, Spin, Alert, Descriptions } from 'antd';
import { PiPath, PiHandCoins, PiMapPin, PiClock, PiChatCircle, PiWalletDuotone, PiCalendarDuotone } from 'react-icons/pi';
import Pill from '@/components/pill';
import dayjs from 'dayjs';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useGetExpenseRequestRecord } from './hooks/useGetExpenseRequestRecord';
import { getExpenseRequestStatusDisplay } from './utils';

// Import tab components
import ExpenseRequestItems from './components/ExpenseRequestItems.tsx';
import ExpenseRequestAllowances from './components/ExpenseRequestAllowances.tsx';
import ExpenseRequestTrip from './components/ExpenseRequestTrip.tsx';
import ExpenseRequestAdvancePayments from './components/ExpenseRequestAdvancePayments.tsx';
import ExpenseRequestComments from './components/ExpenseRequestComments.tsx';

const { Title, Text } = Typography;

const ExpenseRequestRecord: React.FC<BusinessAppContextProps> = ({ accessToken, additionalData = {} }) => {
  const { expenseRequestId = 'bfe6323f-236b-4245-9759-5215a6a97209' } = additionalData;
  // Helper function to get initial tab from URL or available tabs
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const defaultTab = 'items'; // Items tab is always available
    
    // If no tab specified in URL, return default
    if (!tabFromUrl) {
      return defaultTab;
    }
    
    // Check if the requested tab has data and should be shown
    const hasAllowances = expenseRequest?.expenseAllowance && expenseRequest.expenseAllowance.length > 0;
    const hasTrips = expenseRequest?.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0;
    const hasAdvancePayments = expenseRequest?.expensePlan?.advancePayment && expenseRequest.expensePlan.advancePayment.length > 0;
    const hasComments = expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0;
    
    // Map tabs to their data availability
    const availableTabs: Record<string, boolean> = {
      'items': true, // Always available
      'allowances': Boolean(hasAllowances),
      'trip': Boolean(hasTrips),
      'advance-payments': Boolean(hasAdvancePayments),
      'comments': Boolean(hasComments)
    };
    
    // Return the requested tab if it's valid and has data, otherwise default
    return (tabFromUrl in availableTabs && availableTabs[tabFromUrl]) ? tabFromUrl : defaultTab;
  };

  // Default to 'items' tab initially
  const [activeTab, setActiveTab] = useState<string>('items');
  
  // Use the custom hook to fetch expense request data
  const { 
    expenseRequest, 
    loading, 
    error 
  } = useGetExpenseRequestRecord({ 
    accessToken, 
    expenseRequestId 
  });
  
  // Update active tab when expense request data is loaded
  useEffect(() => {
    if (expenseRequest) {
      // Now that we have data, we can determine which tab to show
      const initialTab = getInitialTab();
      setActiveTab(initialTab);
    }
  }, [expenseRequest]);



  // Update URL when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({}, '', url.toString());
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      const defaultTab = 'items';
      
      if (!tabFromUrl) {
        setActiveTab(defaultTab);
        return;
      }
      
      // Check if the requested tab has data and should be shown
      const hasAllowances = expenseRequest?.expenseAllowance && expenseRequest.expenseAllowance.length > 0;
      const hasTrips = expenseRequest?.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0;
      const hasAdvancePayments = expenseRequest?.expensePlan?.advancePayment && expenseRequest.expensePlan.advancePayment.length > 0;
      const hasComments = expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0;
      
      // Map tabs to their data availability
      const availableTabs: Record<string, boolean> = {
        'items': true, // Always available
        'allowances': Boolean(hasAllowances),
        'trip': Boolean(hasTrips),
        'advance-payments': Boolean(hasAdvancePayments),
        'comments': Boolean(hasComments)
      };
      
      // Set the requested tab if it's available, otherwise default
      if (tabFromUrl in availableTabs && availableTabs[tabFromUrl]) {
        setActiveTab(tabFromUrl);
      } else {
        setActiveTab(defaultTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [expenseRequest]);

  // Define tab items - only include tabs with data
  const tabItems = [
    // Items tab - always show as it's the main tab
    {
      key: 'items',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiPath className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('expense.request.record.tabs.items', 'Items')}</span>
        </div>
      ),
      children: <ExpenseRequestItems expenseRequestItems={expenseRequest?.expenseRequestItem || []} />,
    },
    
    // Allowances tab - only show if there are allowances
    ...(expenseRequest?.expenseAllowance && expenseRequest.expenseAllowance.length > 0 ? [{
      key: 'allowances',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiClock className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('expense.request.record.tabs.allowances', 'Allowances')}</span>
        </div>
      ),
      children: <ExpenseRequestAllowances expenseAllowances={expenseRequest.expenseAllowance} />,
    }] : []),
    
    // Trip tab - only show if there are trips
    ...(expenseRequest?.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0 ? [{
      key: 'trip',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiMapPin className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('expense.request.record.tabs.trip', 'Trip')}</span>
        </div>
      ),
      children: <ExpenseRequestTrip expenseRequestTrips={expenseRequest.expenseRequestTrip} />,
    }] : []),
    
    // Advance payments tab - only show if there are advance payments
    ...(expenseRequest?.expensePlan?.advancePayment && expenseRequest.expensePlan.advancePayment.length > 0 ? [{
      key: 'advance-payments',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiHandCoins className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('expense.request.record.tabs.advance.payments', 'Advance Payments')}</span>
        </div>
      ),
      children: <ExpenseRequestAdvancePayments advancePayments={expenseRequest.expensePlan.advancePayment} />,
    }] : []),
    
    // Comments tab - only show if there are comments
    ...(expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0 ? [{
      key: 'comments',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiChatCircle className="gba:text-xl" />
          <span>{getTranslationFromI18nKeyAndLabel('expense.request.record.tabs.comments', 'Comments')}</span>
        </div>
      ),
      children: <ExpenseRequestComments comments={expenseRequest.expenseRequestComment} />,
    }] : []),
  ];
  // Render header with expense request summary
  const renderHeader = () => {
    if (!expenseRequest) return null;
    
    return (
      <div className="gba:mb-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div>
            <Title level={4} className="gba:mb-1">{expenseRequest.title}</Title>
            <Text type="secondary">{expenseRequest?.code}</Text>
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
            <Text className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel('expense.request.duration', 'Duration')}: {' '}
              {dayjs(expenseRequest.startDate).format('DD.MM.YYYY')} {' → '} 
              {dayjs(expenseRequest.endDate).format('DD.MM.YYYY')}
            </Text>
          </div>
        )}
        <div className="gba:flex gba:items-center gba:mb-2">
          <PiClock className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.request.requestDate', 'Request Date')}: {' '}
            {expenseRequest?.requestDate ? dayjs(expenseRequest.requestDate).format('DD.MM.YYYY') : '-'}
          </Text>
        </div>
        <div className="gba:flex gba:items-center gba:mb-4">
          <PiPath className="gba:mr-2" />
          <Text className="gba:text-sm">
            {getTranslationFromI18nKeyAndLabel('expense.request.decisionDate', 'Decision Date')}: {' '}
            {expenseRequest?.decisionDate ? dayjs(expenseRequest.decisionDate).format('DD.MM.YYYY') : '-'}
          </Text>
        </div>
        <Text className="gba:block gba:mb-4">{expenseRequest.description}</Text>
        <Descriptions size="small" column={1}>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.requester', 'Requester')}>
            {expenseRequest?.employee?.fullName}
          </Descriptions.Item>
          {expenseRequest?.employee?.employeePosition?.supervisor && (
            <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.manager', 'Manager')}>
              {expenseRequest.employee.employeePosition.supervisor.fullName}
            </Descriptions.Item>
          )}
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.costCenter', 'Cost Center')}>
            {expenseRequest?.costCenter?.name}
          </Descriptions.Item>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.project', 'Project')}>
            {expenseRequest?.project?.name}
          </Descriptions.Item>
          <Descriptions.Item label={getTranslationFromI18nKeyAndLabel('expense.request.amount', 'Total Amount')}>
            {expenseRequest?.totalAmount} {expenseRequest?.currency?.code}
          </Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

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
      headerIcon={<PiWalletDuotone color="#c92559"/>}
        headerLabel={getTranslationFromI18nKeyAndLabel('expense.plan.record.title', 'Expense Plan Record')}
        contentContainer={
          <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="expense-plan-record-loading">
            <Spin size="large" />
          </div>
        }
      />
    );
  }

  // Handle various error cases
  if (error || !expenseRequestId) {
    let errorTitle;
    let errorDescription;
    
    if (!expenseRequestId) {
      // Case 1: No expense plan ID provided
      errorTitle = getTranslationFromI18nKeyAndLabel('expense.plan.record.missing.title', 'Missing Expense Plan ID');
      errorDescription = getTranslationFromI18nKeyAndLabel(
        'expense.plan.record.missing.description', 
        'No expense plan ID was provided. Please specify an expense plan ID.'
      );
    } else if (error && (error.includes('No expense request data found') || error.includes('No expense request ID provided'))) {
      // Case 2: Expense request not found with the provided ID
      errorTitle = getTranslationFromI18nKeyAndLabel('expense.request.record.notfound.title', 'Expense Request Not Found');
      errorDescription = getTranslationFromI18nKeyAndLabel(
        'expense.request.record.notfound.description', 
        `No expense request found with ID: ${expenseRequestId}`
      );
    } else {
      // Case 3: Other errors
      errorTitle = getTranslationFromI18nKeyAndLabel('expense.request.record.error.title', 'Error');
      errorDescription = getTranslationFromI18nKeyAndLabel('expense.request.record.error.description', error ?? '');
    }
    
    return (
      <PageLayout 
      headerIcon={<PiWalletDuotone color="#c92559"/>}
        headerLabel={getTranslationFromI18nKeyAndLabel('expense.plan.record.title', 'Expense Plan Record')}
        contentContainer={
          <Alert 
            message={errorTitle}
            description={errorDescription}
            type="error" 
            showIcon 
            data-testid="expense-plan-record-error"
          />
        }
      />
    );
  }

  return (
    <PageLayout 
      headerIcon={<PiWalletDuotone color="#c92559"/>}
      headerLabel={getTranslationFromI18nKeyAndLabel('expense.plan.record.title', 'Expense Plan Record')}
      contentContainer={
        <div className="gba:p-3 gba:flex gba:flex-row gba:gap-3" data-testid="expense-plan-record-container">
          <Card className="gba:w-1/4">
            {renderHeader()}
          </Card>
          <Card className="gba:w-3/4">
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              className="gba:mt-4"
              data-testid="expense-plan-record-tabs"
            />
          </Card> 
        </div>
      }
    />
  );
};

export default ExpenseRequestRecord;
