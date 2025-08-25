import React from 'react';
import { Separator } from '@newwork/nw-design-system';

interface ExpenseRequestHeaderProps {
  title: string;
}

const ExpenseRequestHeader: React.FC<ExpenseRequestHeaderProps> = ({ title }) => {
  return (
    <>
      {/* Header Section */}
      <div 
        className="gba:text-center gba:mb-3" 
        data-testid="approve-expense-request-header"
      >
        {/* Title - Bold, medium */}
        <h1 
          className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground" 
          data-testid="approve-expense-request-title"
        >
          {title}
        </h1>
        
        {/* Subtitle - Smaller, gray */}
        <h2 
          className="gba:text-sm gba:font-normal gba:m-0 gba:text-muted-foreground" 
          data-testid="approve-expense-request-subtitle"
        >
          Expense Request Approval
        </h2>
      </div>

      <Separator className="gba:h-px gba:bg-secondary gba:mb-6" />
    </>
  );
};

export default ExpenseRequestHeader; 