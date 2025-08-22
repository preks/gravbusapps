import React from 'react';
import { formatDate } from '@/common/utils/windowUtils';

interface AllowanceItem {
  id: string;
  expenseDate?: string;
  totalAmount: number;
}

interface AllowancesSectionProps {
  allowanceItems: AllowanceItem[];
  currencyCode: string;
  formatCurrency: (amount: number, currencyCode: string) => string;
}

const AllowancesSection: React.FC<AllowancesSectionProps> = ({
  allowanceItems,
  currencyCode,
  formatCurrency
}) => {
  if (allowanceItems.length === 0) {
    return null;
  }

  return (
    <div data-testid="approve-expense-plan-allowances">
      {/* Title - Grayed out full width */}
      <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
        <span className="gba:text-foreground gba:text-sm gba:font-semibold gba:pl-3">
          Estimated Allowances ({allowanceItems.length})
        </span>
      </div>
      {allowanceItems.map((item, index) => (
        <div key={item.id} className="gba:flex gba:justify-between gba:items-center gba:mb-3 gba:pl-6" data-testid={`approve-expense-plan-allowance-${index}`}>
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
  );
};

export default AllowancesSection; 