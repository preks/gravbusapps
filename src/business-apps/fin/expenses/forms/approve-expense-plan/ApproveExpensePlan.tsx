import React, { useState } from 'react';
import { 
  Spinner, 
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getDestinationsFromTrips, getDestinationCountriesSummary } from './utils/destinationUtils';
import { splitExpenseItems } from './utils/expenseItemUtils';
import { useExpensePlanData } from './hooks/useExpensePlanData';
import { formatCurrency, getCatalogValue } from './utils/formatters';

// Component imports
import ExpensePlanHeader from './components/ExpensePlanHeader';
import ExpensesSection from './components/ExpensesSection';
import TotalsSection from './components/TotalsSection';
// Shared components
import { 
  EmployeeInfoSection, 
  NotesSection, 
  MessageSection, 
  ActionButtons,
  TripSection,
  AllowancesSection
} from '../../reusable-components/approval';

const ApproveExpensePlanContent: React.FC<BusinessAppContextProps> = ({ 
  accessToken, 
  additionalData,
  userInfo
}) => {
  // Extract planId from additionalData or URL parameters
  const planId = additionalData?.planId || 
                 additionalData?.psi_taskPayload?.expensePlan?.id || 
                 new URLSearchParams(window.location.search).get('planId');
  
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  const { expensePlan, loading, error, refetch } = useExpensePlanData({ planId, accessToken });

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      // Create absence object for approval
      const absenceObject = {
        typeRef: "AbsenceType:v1:A101",
        employeeId: expensePlan?.employee?.id,
        startDate: expensePlan?.startDate,
        endDate: expensePlan?.endDate,
        description: expensePlan?.description,
        substituteEmployee: "",
        status: "APPROVED"
      };

             // Create approval payload
       const approvalPayload = {
         event: "pse_approve",
         expensePlanComment: {
           commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
           comment: message.length > 0 ? message : "",
           commentType: "APPROVE_COMMENT",
           authorEmployee: userInfo?.employeeDetails?.employeeId,
           expensePlan: expensePlan?.id
         },
         employeeAbsence: absenceObject
       };

      // Dispatch the approval event
      dispatchProcessContinueEvent("pse_approve", approvalPayload);
      

    } catch (err) {
      console.error('Error approving expense plan:', err);
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
         expensePlanComment: {
           commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
           comment: message,
           commentType: "REJECT_COMMENT",
           authorEmployee: userInfo?.employeeDetails?.employeeId,
           expensePlan: expensePlan?.id
         }
       };

      // Dispatch the rejection event
      dispatchProcessContinueEvent("pse_reject", rejectionPayload);
      
    } catch (err) {
      console.error('Error returning expense plan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]" data-testid="approve-expense-plan-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approve-expense-plan-error">
        <AlertTitle>Error Loading Expense Plan</AlertTitle>
        <AlertDescription>
          {error}
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

    if (!expensePlan) {
    return (
      <Alert data-testid="approve-expense-plan-no-data">
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Expense plan not found</AlertDescription>
      </Alert>
    );
  }

  const currencyCode = expensePlan.currency?.code || 'EUR';
  const totalAmount = expensePlan.totalAmount || 0;
  const reimbursableAmount = expensePlan.reimbursableAmount || 0;
  const nonReimbursableAmount = expensePlan.nonReimbursableAmount || 0;
  const advancePaymentAmount = expensePlan.advancePaymentAggregate.aggregate.sum.amount| 0;
  const { expenseAllowances: allowanceItems, expenseItems } = splitExpenseItems(expensePlan.expensePlanItem);
  
  // Derived destination data for Destination section
  const locations = expensePlan.expenseRequestTrip || [];
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
     <div className="gba:border-0 gba:bg-transparent" data-testid="approve-expense-plan-container">
       <ExpensePlanHeader title={expensePlan.title} />
       
       <EmployeeInfoSection
         code={expensePlan.code}
         costCenterName={expensePlan.costCenter?.name}
         projectName={expensePlan.project?.name}
         employee={expensePlan.employee}
         prefixDataTestId="approve-expense-plan"
       />
       
      <NotesSection 
        description={expensePlan.description} 
        prefixDataTestId="approve-expense-plan"
      />
       
               <TripSection
          expenseRequestTrip={expensePlan.expenseRequestTrip}
          startDate={expensePlan.startDate}
          endDate={expensePlan.endDate}
          destinations={destinations}
          numberOfDestinations={numberOfDestinations}
          countriesSummary={countriesSummary}
          prefixDataTestId="approve-expense-plan"
        />
        
        <AllowancesSection
          allowanceItems={allowanceItems}
          currencyCode={currencyCode}
          formatCurrency={formatCurrency}
          prefixDataTestId="approve-expense-plan"
        />
       
       <ExpensesSection
         expenseItems={expenseItems}
         currencyCode={currencyCode}
         formatCurrency={formatCurrency}
         getCatalogValue={getCatalogValue}
       />
       
       <TotalsSection
         totalAmount={totalAmount}
         reimbursableAmount={reimbursableAmount}
         nonReimbursableAmount={nonReimbursableAmount}
         advancePaymentAmount={advancePaymentAmount}
         currencyCode={currencyCode}
         formatCurrency={formatCurrency}
       />
       
       <MessageSection
         message={message}
         showWarning={showWarning}
         onMessageChange={handleMessageChange}
         prefixDataTestId="approve-expense-plan"
         warningKey="approve_expense_plan.warning_message"
       />
       
       <ActionButtons
         submitting={submitting}
         onApprove={handleApprove}
         onReturn={handleReturn}
         prefixDataTestId="approve-expense-plan"
       />
     </div>
  );
};

/**
 * Approve Expense Plan component
 * @param props - Business app context props
 * @returns Approve Expense Plan component
 */
const ApproveExpensePlan: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, additionalData, userInfo } = props;
  
  // Fallback additional data for testing when none is provided
  const fallbackAdditionalData = additionalData || {
    planId: "b38909fe-b3e0-467c-8906-240f11d0267d"
  };
  
  return (
    <div data-testid="approve-expense-plan-wrapper">
      <ApproveExpensePlanContent 
        accessToken={accessToken} 
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
      />
    </div>
  );
};

export default ApproveExpensePlan; 