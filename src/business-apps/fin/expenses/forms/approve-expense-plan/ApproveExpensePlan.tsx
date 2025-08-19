import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Textarea,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Button,
  Spinner, 
  Alert,
  AlertTitle,
  AlertDescription,
  Separator
} from '@newwork/nw-design-system';
import { DownOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDate } from '@/common/utils/windowUtils';
import { GET_EXPENSE_PLAN_FOR_APPROVAL } from './queries/expensePlanQueries';
import { ExpensePlanApprovalData } from './types/expensePlanTypes';
import { getDestinationsFromTrips, getDestinationCountriesSummary } from './utils/destinationUtils';
import { splitExpenseItems } from './utils/expenseItemUtils';

const ApproveExpensePlanContent: React.FC<BusinessAppContextProps> = ({ 
  accessToken, 
  additionalData 
}) => {
  // Extract planId from additionalData or URL parameters
  const planId = additionalData?.planId || 
                 additionalData?.psi_taskPayload?.expensePlan?.id || 
                 new URLSearchParams(window.location.search).get('planId');
  
  const [expensePlan, setExpensePlan] = useState<ExpensePlanApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isDestinationExpanded, setIsDestinationExpanded] = useState(true);
  
  const graphqlClient = useGraphQLClient(accessToken);
  const activeUserLocale = getCurrentActiveUserLocale();

  const fetchExpensePlan = async () => {
    if (!planId) {
      setError('No expense plan ID provided. Please provide a valid plan ID.');
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError('No access token available. Please ensure you are authenticated.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await graphqlClient.request(GET_EXPENSE_PLAN_FOR_APPROVAL, {
        expenseId: planId,
        activeUserLocale
      });

      if (!result?.ExpensePlanByPk) {
        setError(`No expense plan found with ID: ${planId}`);
        setLoading(false);
        return;
      }

      setExpensePlan(result.ExpensePlanByPk);
    } catch (err) {
      console.error('Error fetching expense plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expense plan data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensePlan();
  }, [planId, accessToken]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      // TODO: Implement approval logic with process API
      console.log('Approving expense plan:', planId, 'with message:', message);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Expense plan approved successfully');
    } catch (err) {
      setError('Failed to approve expense plan');
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
      // TODO: Implement return logic with process API
      console.log('Returning expense plan:', planId, 'with message:', message);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Expense plan returned successfully');
    } catch (err) {
      setError('Failed to return expense plan');
      console.error('Error returning expense plan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'EUR'
    }).format(amount);
  };

  const getCatalogValue = (catalogEntry: any): string => {
    if (!catalogEntry) return '';
    
    try {
      const currentLocale = activeUserLocale.toLowerCase();
      if (Array.isArray(catalogEntry.translations)) {
        const translation = catalogEntry.translations.find(
          (t: any) => t?.localeCode?.toLowerCase() === currentLocale
        );
        if (translation && translation.value) return translation.value;
      }
      return catalogEntry.value || '';
    } catch {
      return catalogEntry?.value || '';
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
          <Button size="sm" onClick={fetchExpensePlan} style={{ marginTop: 'var(--nw-spacing-2)' }}>
            Retry
          </Button>
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
  const { expenseAllowances: allowanceItems, expenseItems } = splitExpenseItems(expensePlan.expensePlanItem);
  // Derived destination data for Destination section
  const locations = expensePlan.expenseRequestTrip || [];
  const destinations = getDestinationsFromTrips(locations as any);
  const numberOfDestinations = destinations.length;
  const countriesSummary = getDestinationCountriesSummary(
    destinations as any,
    (region) => (window as any)?.lowcoder?.getCatalogValue ? (window as any).lowcoder.getCatalogValue(region) : getCatalogValue(region as any)
  );
 console.log('expenseAllowances', splitExpenseItems(expensePlan.expensePlanItem));

  return (
    <div className="gba:max-w-[800px] gba:mx-auto" data-testid="approve-expense-plan-container">
      <Card className="gba:shadow-lg gba:m-0">
         <CardContent className="gba:pl-6 gba:pr-6 gba:pb-6 gba:pt-0">
          
                     {/* Header Section */}
           <div 
             className="gba:text-center gba:mb-3" 
             data-testid="approve-expense-plan-header"
           >
             {/* Title - Bold, medium */}
             <h1 
               className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground" 
               data-testid="approve-expense-plan-title"
             >
               {expensePlan.title}
             </h1>
             
             {/* Subtitle - Smaller, gray */}
             <h2 
               className="gba:text-sm gba:font-normal gba:m-0 gba:text-muted-foreground" 
               data-testid="approve-expense-plan-subtitle"
             >
               Expense Plan Approval
             </h2>
           </div>

           <Separator className="gba:h-px gba:bg-secondary gba:mb-6" />

                     {/* Employee Info Section */}
             <div 
             className="gba:grid gba:grid-cols-2 gba:gap-8 gba:mb-6" 
             data-testid="approve-expense-plan-employee-section"
             >
              {/* Left side - Employee details */}
              <div data-testid="approve-expense-plan-employee-details">
               <div>
                 <span className="gba:text-muted-foreground">
                   ID: {expensePlan.code}
                 </span>
               </div>
               <div>
                 <span className="gba:text-muted-foreground">
                   Main Cost Center: {expensePlan.costCenter?.name}
                 </span>
               </div>
              {expensePlan.project && expensePlan.project.name && 
              <div>
                 <span className="gba:text-muted-foreground">
                 Main Project: {expensePlan?.project?.name}
                 </span>
               </div>
               }
             </div>
               

             {/* Right side - Employee profile */}
             <div 
               className="gba:flex gba:items-center gba:gap-3 gba:justify-start" 
               data-testid="approve-expense-plan-employee-profile"
             >
               <Avatar 
                 className="gba:w-10 gba:h-10" 
                 data-testid="approve-expense-plan-employee-avatar"
               >
                 <AvatarImage src={`data:image/jpeg;base64,${expensePlan.employee?.pictureThumbnail}`} />
                 <AvatarFallback>
                   {expensePlan.employee?.firstName?.[0]}{expensePlan.employee?.lastName?.[0]}
                 </AvatarFallback>
               </Avatar>
               <div>
                 {/* Employee name - Bold */}
                 <div 
                   className="gba:text-sm gba:font-semibold gba:text-foreground" 
                   data-testid="approve-expense-plan-employee-name"
                 >
                   {expensePlan.employee?.firstName} {expensePlan.employee?.lastName}
                 </div>
                 {/* Employee role - Gray, smaller */}
                 <div 
                   className="gba:text-xs gba:font-normal gba:text-muted-foreground" 
                   data-testid="approve-expense-plan-employee-role"
                 >
                   {expensePlan.employee?.employeePosition?.jobPosition?.name}
                 </div>
               </div>
             </div>
           </div>

                     {/* Notes Section */}
           <div 
             className="gba:mb-4 gba:bg-gray-100 gba:p-2 gba:rounded-sm gba:w-full" 
             data-testid="approve-expense-plan-notes"
           >
             <div className="gba:text-sm gba:font-semibold gba:mb-2 gba:text-foreground">
               Notes
             </div>
             <Textarea
               placeholder="No notes"
               disabled
               className="gba:bg-transparent gba:border-none gba:text-muted-foreground gba:resize-none gba:p-0"
               data-testid="approve-expense-plan-notes-textarea"
             />
           </div>

                     {/* Trip Section */}
           {expensePlan.expenseRequestTrip && expensePlan.expenseRequestTrip.length > 0 && (
             <div data-testid="approve-expense-plan-trip">
               {/* Trip title - Light gray header bar */}
               <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
                 <span className="gba:text-foreground gba:text-sm gba:font-semibold">
                   Trip
                 </span>
               </div>

             <div className="gba:grid gba:grid-cols-2 gba:gap-8" data-testid="approve-expense-plan-trip-section">
                             {/* Start Location */}
               <div 
                 className="gba:mb-4" 
                 data-testid="approve-expense-plan-start-location"
               >
                 <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                   <EnvironmentOutlined className="gba:text-base gba:text-muted-foreground" />
                   <span className="gba:font-semibold gba:text-foreground">
                     Start Location
                   </span>
                 </div>
                 <div className="gba:ml-6">
                     <div className="gba:text-foreground">
                      {expensePlan.expenseRequestTrip[0]?.address || 'N/A'} 
                     </div>
                     <div className="gba:text-foreground">
                      {expensePlan.startDate && formatDate(expensePlan.startDate)} {expensePlan.expenseRequestTrip[0]?.tripDateTime && formatDate(expensePlan.expenseRequestTrip[0].tripDateTime)}
                     </div>
                 </div>
               </div>

                             {/* End Location */}
               <div 
                 className="gba:mb-4" 
                 data-testid="approve-expense-plan-end-location"
               >
                 <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                   <EnvironmentOutlined className="gba:text-base gba:text-muted-foreground" />
                   <span className="gba:font-semibold gba:text-foreground">
                     End Location
                   </span>
                 </div>
                   <div className="gba:ml-6">
                     <div className="gba:text-foreground">
                      {expensePlan.expenseRequestTrip[expensePlan.expenseRequestTrip.length - 1]?.address || 'N/A'} 
                     </div>
                     <div className="gba:text-foreground">
                      {expensePlan.endDate && formatDate(expensePlan.endDate)} {expensePlan.expenseRequestTrip[expensePlan.expenseRequestTrip.length - 1]?.tripDateTime && formatDate(expensePlan.expenseRequestTrip[expensePlan.expenseRequestTrip.length - 1].tripDateTime)}
                     </div>
                   </div>
                 </div>
               </div>

                             {/* Destination with collapsible */}
               <Collapsible 
                 open={isDestinationExpanded} 
                 onOpenChange={setIsDestinationExpanded}
                 data-testid="approve-expense-plan-destination"
               >
                 <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                   <EnvironmentOutlined className="gba:text-base gba:text-muted-foreground" />
                   <span className="gba:font-semibold gba:text-foreground">
                     Destination Location
                   </span>
                   <div className="gba:flex-1" />
                   <CollapsibleTrigger asChild>
                     <Button 
                       variant="ghost" 
                       size="sm"
                       className="gba:p-1 gba:h-auto"
                       data-testid="approve-expense-plan-destination-toggle"
                     >
                       <DownOutlined 
                         className={`gba:text-base gba:transition-transform gba:duration-200 ${isDestinationExpanded ? 'gba:rotate-180' : 'gba:rotate-0'}`}
                       />
                     </Button>
                   </CollapsibleTrigger>
                 </div>
                 <div className="gba:text-foreground gba:ml-6">
                 {numberOfDestinations} Destination{numberOfDestinations !== 1 ? 's' : ''} {countriesSummary.countries ? `in ${countriesSummary.countries}` : ''}
                  </div>   
                 {/* Collapsible content */}
                 <CollapsibleContent>
                 <Separator className="gba:h-px gba:bg-gray-100 gba:mb-2 gba:mt-3" />
                   <div className="gba:ml-6 gba:mt-1 gba:text-muted-foreground gba:text-sm">
                     {destinations.map((trip, index) => (
                       <div key={index} className="gba:mb-0">
                        <div >
                          <span className="gba:text-muted-foreground gba:font-semibold">Destination:{' '}</span>
                          <span className="gba:text-foreground">{trip.address}, Departure {trip.tripDateTime && formatDate(trip.tripDateTime)}</span>
                        </div>
                       </div>
                     ))}
                   </div>
                 </CollapsibleContent>
               </Collapsible>
            </div>
          )}

                     {/* Estimated Allowances Section */}
           {allowanceItems.length > 0 && (
             <div className="gba:mb-6" data-testid="approve-expense-plan-allowances">
               {/* Title - Grayed out full width */}
               <div className="gba:bg-secondary gba:p-3 gba:rounded-md gba:mb-4 gba:w-full">
                 <span className="gba:text-foreground gba:text-sm gba:font-semibold">
                   Estimated Allowances ({allowanceItems.length})
                 </span>
               </div>
                             {allowanceItems.map((item, index) => (
                 <div key={item.id} className="gba:flex gba:justify-between gba:items-center gba:mb-2" data-testid={`approve-expense-plan-allowance-${index}`}>
                   <div>
                     <div className="gba:font-semibold gba:text-foreground">
                       {item.expenseDate && new Date(item.expenseDate).toLocaleDateString('en-US', { weekday: 'long' })}
                     </div>
                     <div className="gba:text-muted-foreground">
                       {item.expenseDate && formatDate(item.expenseDate)}
                     </div>
                   </div>
                   <div className="gba:font-semibold gba:text-foreground">
                     {formatCurrency(item.totalAmount, currencyCode)}
                   </div>
                 </div>
               ))}
            </div>
          )}

                     {/* Expenses Section */}
           {expenseItems.length > 0 && (
             <div className="gba:mb-6" data-testid="approve-expense-plan-expenses">
               {/* Title - Grayed out full width */}
               <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
                 <span className="gba:text-foreground gba:text-sm gba:font-semibold">
                   Expenses ({expenseItems.length})
                 </span>
               </div>

                             {expenseItems.map((item, index) => (
                 <div key={item.id} className="gba:mb-3" data-testid={`approve-expense-plan-expense-${index}`}>
                   <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
                     <div className="gba:font-semibold gba:text-foreground">
                       {item.title}
                     </div>
                     <div className="gba:font-semibold gba:text-foreground">
                       {formatCurrency(item.totalAmount, currencyCode)}
                     </div>
                   </div>
                   <div className="gba:text-muted-foreground">
                     {getCatalogValue(item.expenseClass)}: {item.expenseRuleGeneralExpense?.name || 'General Expense'}
                   </div>
                 </div>
               ))}
            </div>
          )}

                     {/* Delimiting gray section - 7px height */}
           <Separator className="gba:h-[7px] gba:bg-secondary gba:mb-6 gba:rounded-sm" data-testid="approve-expense-plan-delimiter-section" />

                     {/* Total Expenses */}
           <div className="gba:mb-6" data-testid="approve-expense-plan-total">
             <div className="gba:flex gba:justify-between gba:items-center">
               <div className="gba:text-lg gba:font-semibold gba:text-foreground">
                 Expenses
               </div>
               <div className="gba:text-lg gba:font-semibold gba:text-foreground">
                 {formatCurrency(totalAmount, currencyCode)}
               </div>
             </div>
           </div>

                     {/* Message Section - Gray background, no border */}
           <div className="gba:mb-6" data-testid="approve-expense-plan-message">
             <div className="gba:text-lg gba:font-semibold gba:mb-3 gba:text-foreground">
               Message
             </div>
             <Textarea
               placeholder="Write Message..."
               value={message}
               onChange={(e) => {
                 setMessage(e.target.value);
                 if (showWarning) setShowWarning(false);
               }}
               className="gba:bg-secondary gba:border-none gba:text-foreground"
               data-testid="approve-expense-plan-message-textarea"
             />
             
             {/* Warning message */}
             {showWarning && (
               <div className="gba:text-destructive gba:text-sm gba:mt-2" data-testid="approve-expense-plan-warning">
                 {getTranslationFromI18nKeyAndLabel('approve_expense_plan.warning_message', 'Please add a message!')}
               </div>
             )}
           </div>

                     {/* Action Buttons */}
           <div className="gba:flex gba:justify-end gba:gap-3" data-testid="approve-expense-plan-actions">
             <Button
               variant="outline"
               onClick={handleReturn}
               disabled={submitting}
               data-testid="approve-expense-plan-return-button"
             >
               Return
             </Button>
             <Button
               variant="default"
               onClick={handleApprove}
               disabled={submitting}
               data-testid="approve-expense-plan-approve-button"
             >
               Approve
             </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Approve Expense Plan component
 * @param props - Business app context props
 * @returns Approve Expense Plan component
 */
const ApproveExpensePlan: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, additionalData } = props;
  
  // Fallback additional data for testing when none is provided
  const fallbackAdditionalData = additionalData || {
    planId: "18cfedab-87c4-41b1-9654-7670dd445bf7"
  };
  
  return (
    <div data-testid="approve-expense-plan-wrapper">
      <ApproveExpensePlanContent 
        accessToken={accessToken} 
        additionalData={fallbackAdditionalData} 
      />
    </div>
  );
};

export default ApproveExpensePlan; 