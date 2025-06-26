/**
 * Expense Request Management Tab Component
 * Delegates table functionality to ExpenseRequestsTable and manages statistics
 */

import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Alert } from 'antd';
import ExpenseRequestsTable from './ExpenseRequestsTable';



interface ExpenseRequestTabProps extends BusinessAppContextProps {
  onContentHeaderChange?: (header: React.ReactNode) => void;
}

const ExpenseRequestTab: React.FC<ExpenseRequestTabProps> = (props) => {
  const { onContentHeaderChange } = props;
  
  // Search term state for synchronization with table
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Create statistics header and pass to parent via onContentHeaderChange
  useEffect(() => {
    if (onContentHeaderChange) {
      const header = (
        <div className="gba:mb-4" data-testid="expense-request-stats-header">
          <Alert
            message="Expense Requests Overview"
            description="View and manage all expense requests across the organization"
            type="info"
            showIcon
            data-testid="expense-request-stats-alert"
          />
        </div>
      );
      onContentHeaderChange(header);
    }
  }, [onContentHeaderChange]);

  // Handle search changes from the table
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
  };

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = {
    accessToken: props.accessToken,
    userInfo: props.userInfo
  };

  return (
    <ExpenseRequestsTable
      {...contextProps}
      search={searchTerm}
      onSearchChange={handleSearchChange}
    />
  );
};

export default ExpenseRequestTab;
