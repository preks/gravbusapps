import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent,
  Spinner, 
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getDestinationsFromTrips, getDestinationCountriesSummary } from '../approve-expense-plan/utils/destinationUtils';
import { splitExpenseItems } from '../approve-expense-plan/utils/expenseItemUtils';
import { useExpenseRequestData } from './hooks/useExpenseRequestData';
import { formatCurrency, getCatalogValue } from '../approve-expense-plan/utils/formatters';

// Component imports - reusing from approve-expense-plan
import { ExpenseRequestHeader, ExpenseRequestTotalsSection } from './components';
import EmployeeInfoSection from '../approve-expense-plan/components/EmployeeInfoSection';
import NotesSection from '../approve-expense-plan/components/NotesSection';
import TripSection from '../approve-expense-plan/components/TripSection';
import AllowancesSection from '../approve-expense-plan/components/AllowancesSection';
import ExpensesSection from '../approve-expense-plan/components/ExpensesSection';
import MessageSection from '../approve-expense-plan/components/MessageSection';
import ActionButtons from '../approve-expense-plan/components/ActionButtons';

const ApproveExpenseRequestContent: React.FC<BusinessAppContextProps> = ({ 
  accessToken, 
  additionalData,
  userInfo
}) => {
  // Extract expenseId from additionalData or URL parameters
  const expenseId = additionalData?.expenseId || 
                   additionalData?.psi_taskPayload?.expenseRequest?.id || 
                   new URLSearchParams(window.location.search).get('expenseId');
  
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  const { expenseRequest, loading, error, refetch } = useExpenseRequestData({ expenseId, accessToken });

  // Handle modal close events to prevent task removal
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Prevent default close behavior and dispatch cancel event
      try {
        dispatchProcessContinueEvent("pse_cancel", {
          event: "pse_cancel",
          pso_exitStrategy: "cancel",
          pso_completeNotification: {
            type: 'info',
            messageKey: 'The approval process has been canceled.'
          }
        });
      } catch (processError) {
        console.error('Error canceling process:', processError);
      }
      event.preventDefault();
      event.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden (modal close, tab switch, etc.)
        try {
          dispatchProcessContinueEvent("pse_cancel", {
            event: "pse_cancel",
            pso_exitStrategy: "cancel",
            pso_completeNotification: {
              type: 'info',
              messageKey: 'The approval process has been canceled.'
            }
          });
        } catch (processError) {
          console.error('Error canceling process:', processError);
        }
      }
    };

    // Listen for beforeunload event (browser close, refresh, navigation)
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Listen for visibility change (modal close, tab switch)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      // Create approval payload
      const approvalPayload = {
        event: "pse_approve",
        expenseRequestComment: {
          commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message.length > 0 ? message : "",
          commentType: "APPROVE_COMMENT",
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expenseRequest: expenseRequest?.id
        }
      };

      // Dispatch the approval event
      dispatchProcessContinueEvent("pse_approve", approvalPayload);
      
      console.log('Approving expense request:', expenseId, 'with payload:', approvalPayload);
    } catch (err) {
      console.error('Error approving expense request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!message.trim()) {
      setShowWarning(true);
      return;
    }
    
    setSubmitting(true);
    try {
      // Create rejection payload
      const rejectionPayload = {
        event: "pse_reject",
        changeMode: "INSERT",
        expenseRequestComment: {
          commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message,
          commentType: "REJECT_COMMENT",
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expenseRequest: expenseRequest?.id
        }
      };

      // Dispatch the rejection event
      dispatchProcessContinueEvent("pse_reject", rejectionPayload);
      
      console.log('Returning expense request:', expenseId, 'with payload:', rejectionPayload);
    } catch (err) {
      console.error('Error returning expense request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]" data-testid="approve-expense-request-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approve-expense-request-error">
        <AlertTitle>Error Loading Expense Request</AlertTitle>
        <AlertDescription>
          <div>
            <p><strong>Error:</strong> {error}</p>
            <p><strong>Expense ID:</strong> {expenseId}</p>
            <p><strong>Access Token:</strong> {accessToken ? 'Present' : 'Missing'}</p>
            <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          </div>
          <button 
            onClick={refetch} 
            style={{ marginTop: 'var(--nw-spacing-2)' }}
            className="gba:px-3 gba:py-1 gba:bg-red-600 gba:text-white gba:rounded gba:text-sm"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!expenseRequest) {
    return (
      <Alert data-testid="approve-expense-request-no-data">
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Expense request not found</AlertDescription>
      </Alert>
    );
  }

  const currencyCode = expenseRequest.currency?.code || 'EUR';
  const totalAmount = expenseRequest.totalAmount || 0;
  const reimbursableAmount = expenseRequest.reimbursableAmount || 0;
  const nonReimbursableAmount = expenseRequest.nonReimbursableAmount || 0;
  const advancePaymentAmount = expenseRequest.expensePlan?.advancePaymentTotalAmount || 0;
  // Transform expense request items to match expense plan format for component compatibility
  const transformedExpenseItems = expenseRequest.expenseItem?.map(item => ({
    ...item,
    expenseGroup: item.expensePosition?.[0]?.expenseGroup || { value: '', translations: [], catalog: { defaultLocale: 'en' } }
  })) || [];
  
  const { expenseAllowances: itemAllowances, expenseItems } = splitExpenseItems(transformedExpenseItems as any);
  
  // Transform expense allowances to match component expectations
  const allowanceItems = expenseRequest.expenseAllowance?.map((allowance, index) => ({
    id: `allowance-${index}`,
    expenseDate: allowance.allowanceDate,
    totalAmount: allowance.dayRate
  })) || [];
  
  // Combine allowances from both sources
  const allAllowances = [...allowanceItems, ...itemAllowances];
  
  // Derived destination data for Destination section
  const locations = expenseRequest.expenseRequestTrip || [];
  const destinations = getDestinationsFromTrips(locations as any);
  const numberOfDestinations = destinations.length;
  const countriesSummary = getDestinationCountriesSummary(
    destinations as any,
    (region) => (window as any)?.lowcoder?.getCatalogValue ? (window as any).lowcoder.getCatalogValue(region) : getCatalogValue(region as any)
  );

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (showWarning) setShowWarning(false);
  };

  return (
    <div className="gba:max-w-[800px] gba:mx-auto" data-testid="approve-expense-request-container">
      <Card className="gba:border-0 gba:shadow-none">
        <CardContent className="gba:p-0">
          
          <ExpenseRequestHeader title={expenseRequest.title} />
          
          <EmployeeInfoSection
            code={expenseRequest.code}
            costCenterName={expenseRequest.costCenter?.name}
            projectName={expenseRequest.project?.name}
            employee={expenseRequest.employee || {}}
          />
          
          <NotesSection description={expenseRequest.description} />
          
          <TripSection
            expenseRequestTrip={expenseRequest.expenseRequestTrip}
            startDate={undefined} // Expense requests don't have start/end dates in the same way
            endDate={undefined}
            destinations={destinations}
            numberOfDestinations={numberOfDestinations}
            countriesSummary={countriesSummary}
          />
          
          <AllowancesSection
            allowanceItems={allAllowances}
            currencyCode={currencyCode}
            formatCurrency={formatCurrency}
          />
          
          <ExpensesSection
            expenseItems={expenseItems}
            currencyCode={currencyCode}
            formatCurrency={formatCurrency}
            getCatalogValue={getCatalogValue}
          />
          
          <ExpenseRequestTotalsSection
            totalAmount={totalAmount}
            reimbursableAmount={reimbursableAmount}
            nonReimbursableAmount={nonReimbursableAmount}
            advancePaymentAmount={advancePaymentAmount}
            currencyCode={currencyCode}
            formatCurrency={formatCurrency}
            expensePlanTotalAmount={expenseRequest.expensePlan?.totalAmount}
          />
          
          <MessageSection
            message={message}
            showWarning={showWarning}
            onMessageChange={handleMessageChange}
          />
          
          <ActionButtons
            submitting={submitting}
            onApprove={handleApprove}
            onReturn={handleReturn}
          />
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Approve Expense Request component
 * @param props - Business app context props
 * @returns Approve Expense Request component
 */
const ApproveExpenseRequest: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, additionalData, userInfo } = props;
  
  // Fallback additional data for testing when none is provided
  const fallbackAdditionalData = additionalData || {
    expenseId: "8f760576-8587-4822-ae03-a2ffc45f9b80"
  };
  
  return (
    <div data-testid="approve-expense-request-wrapper">
      <ApproveExpenseRequestContent 
        accessToken={accessToken} 
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
      />
    </div>
  );
};

export default ApproveExpenseRequest; 