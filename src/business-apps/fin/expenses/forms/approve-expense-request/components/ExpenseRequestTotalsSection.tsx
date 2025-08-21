import React from 'react';

interface ExpenseRequestTotalsSectionProps {
  totalAmount: number;
  reimbursableAmount: number;
  nonReimbursableAmount: number;
  advancePaymentAmount: number;
  currencyCode: string;
  formatCurrency: (amount: number, currencyCode: string) => string;
  expensePlanTotalAmount?: number;
}

const ExpenseRequestTotalsSection: React.FC<ExpenseRequestTotalsSectionProps> = ({
  totalAmount,
  reimbursableAmount,
  nonReimbursableAmount,
  advancePaymentAmount,
  currencyCode,
  formatCurrency,
  expensePlanTotalAmount
}) => {
  // Calculate plan comparison if plan data is available
  const getPlanComparison = () => {
    if (!expensePlanTotalAmount) return null;
    
    const difference = totalAmount - expensePlanTotalAmount;
    const absDifference = (window?.lowcoder?.i18n?.formatNumber && window.lowcoder.formatNumber()) 
      ? window?.lowcoder?.formatNumber(Math.abs(difference), "0.00[,]00") 
      : Math.abs(difference).toFixed(2);
    
    if (difference === 0) {
      return {
        description: window?.lowcoder?.translate?.('lowcoder:approve_expense_request.comparison_with_plan_equal', 'Equals planned amount') || 'Equals planned amount',
        color: '#0ab874'
      };
    } else if (difference < 0) {
      return {
        description: `${absDifference} ${currencyCode} ${window?.lowcoder?.translate?.('lowcoder:approve_expense_request.comparison_with_plan_less', 'Less than planned') || 'Less than planned'}`,
        color: '#0ab874'
      };
    } else if (difference > 0) {
      return {
        description: `${absDifference} ${currencyCode} ${window?.lowcoder?.translate?.('lowcoder:approve_expense_request.comparison_with_plan_more', 'More than planned') || 'More than planned'}`,
        color: '#ffc61a'
      };
    }
    
    return null;
  };

  const planComparison = getPlanComparison();

  return (
    <>
      {/* Delimiting gray section */}
      <div className="gba:h-[20px] gba:bg-gray-100 gba:mb-3 gba:rounded-sm" data-testid="approve-expense-request-delimiter-section" />

      {/* Total Expenses */}
      <div className="gba:mb-6 gba:pl-6" data-testid="approve-expense-request-total">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:text-md gba:text-foreground">
            Expenses
          </div>
          <div className="gba:text-lg gba:font-semibold gba:text-foreground">
            {formatCurrency(totalAmount, currencyCode)}
          </div>
        </div>
        
        {/* Plan comparison if available */}
        {planComparison && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-1">
            <div className="gba:text-sm gba:text-muted-foreground">
              {/* Empty space to align with the amount */}
            </div>
            <div 
              className="gba:text-sm gba:font-medium"
              style={{ color: planComparison.color }}
              data-testid="approve-expense-request-plan-comparison"
            >
              {planComparison.description}
            </div>
          </div>
        )}
        
        {nonReimbursableAmount !== 0 && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-2">
            <div className="gba:text-md gba:text-foreground">
              Non-Reimbursable Amount
            </div>
            <div className="gba:text-md gba:font-semibold" style={{ color: '#A2519A' }}>
              {formatCurrency(nonReimbursableAmount, currencyCode)}
            </div>
          </div>
        )}
        
        {reimbursableAmount !== totalAmount && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-2">
            <div className="gba:text-md gba:text-foreground">
              Reimbursable Amount
            </div>
            <div className="gba:text-md gba:font-semibold" style={{ color: '#0ab874' }}>
              {formatCurrency(reimbursableAmount, currencyCode)}
            </div>
          </div>
        )}
        
        {advancePaymentAmount !== 0 && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-2">
            <div className="gba:text-md gba:text-foreground">
              Advance Payment
            </div>
            <div className="gba:text-md gba:font-semibold" style={{ color: '#A2519A' }}>
              {formatCurrency(advancePaymentAmount, currencyCode)}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ExpenseRequestTotalsSection; 