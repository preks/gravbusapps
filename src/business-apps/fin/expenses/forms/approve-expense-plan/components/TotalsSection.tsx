import React from 'react';

interface TotalsSectionProps {
  totalAmount: number;
  reimbursableAmount: number;
  nonReimbursableAmount: number;
  advancePaymentAmount: number;
  currencyCode: string;
  formatCurrency: (amount: number, currencyCode: string) => string;
}

const TotalsSection: React.FC<TotalsSectionProps> = ({
  totalAmount,
  reimbursableAmount,
  nonReimbursableAmount,
  advancePaymentAmount,
  currencyCode,
  formatCurrency
}) => {
  return (
    <>
      {/* Delimiting gray section */}
      <div className="gba:h-[20px] gba:bg-gray-100 gba:mb-3 gba:rounded-sm" data-testid="approve-expense-plan-delimiter-section" />

      {/* Total Expenses */}
      <div className="gba:mb-6 gba:pl-6" data-testid="approve-expense-plan-total">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:text-md gba:text-foreground">
            Expenses
          </div>
          <div className="gba:text-lg gba:font-semibold gba:text-foreground">
            {formatCurrency(totalAmount, currencyCode)}
          </div>
        </div>
        {nonReimbursableAmount !== 0 && (
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:text-md gba:text-foreground">
              Non-Reimbursable Amount
            </div>
            <div className="gba:text-md gba:font-semibold gba:text-[#A2519A]">
              {formatCurrency(nonReimbursableAmount, currencyCode)}
            </div>
          </div>
        )}
        {reimbursableAmount !== totalAmount && (
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:text-md gba:text-foreground">
              Reimbursable Amount
            </div>
            <div className="gba:text-md gba:font-semibold gba:text-[#0ab874]">
              {formatCurrency(reimbursableAmount, currencyCode)}
            </div>
          </div>
        )}
      </div>

      {/* Advance Payment */}
      {advancePaymentAmount !== 0 && (
        <>
          <div className="gba:h-[20px] gba:bg-gray-100 gba:mb-3 gba:rounded-sm" data-testid="approve-expense-plan-delimiter-section" />
          <div className="gba:mb-6 gba:pl-6" data-testid="approve-expense-plan-advance">
            <div className="gba:flex gba:justify-between gba:items-center">
              <div className="gba:text-md gba:text-foreground">
                Advance Payment
              </div>
              <div className="gba:text-md gba:font-semibold gba:text-[#A2519A]">
                {formatCurrency(advancePaymentAmount, currencyCode)}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TotalsSection; 