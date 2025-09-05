import React from 'react';
import { Spin, Tooltip } from 'antd';
import { User } from 'lucide-react';
import { useEmployeeName } from '../hooks/useEmployeeName';

export interface EmployeeDisplayNameProps {
  userId: string;
  accessToken?: string;
  showIcon?: boolean;
  fallback?: string;
  testId?: string;
}

/**
 * Component to display employee name fetched from Employee table via GraphQL
 * Replaces UserDisplayName for service desk assignee display
 */
export const EmployeeDisplayName: React.FC<EmployeeDisplayNameProps> = ({
  userId,
  accessToken,
  showIcon = false,
  fallback = 'Unknown User',
  testId,
}) => {
  const { displayName, isLoading, error } = useEmployeeName({
    userId,
    accessToken,
  });

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-400 gba:whitespace-nowrap" 
        data-testid={`${testId}-loading`}
      >
        <Spin size="small" className="gba:flex-shrink-0" />
        <span>Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Tooltip title={`Error loading employee: ${error}`}>
        <div
          data-testid={`${testId}-error`}
          className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-red-600 gba:whitespace-nowrap"
        >
          {showIcon && <User className="gba:w-3 gba:h-3 gba:flex-shrink-0" />}
          <span>Error</span>
        </div>
      </Tooltip>
    );
  }

  // Success state with name
  const name = displayName || fallback;
  const isUnknown = !displayName;

  return (
    <Tooltip title={isUnknown ? `UserId: ${userId}` : `Employee: ${name} (${userId})`}>
      <div
        data-testid={testId}
        className={`gba:flex gba:items-center gba:gap-1 gba:text-xs gba:whitespace-nowrap ${isUnknown ? 'gba:opacity-60 gba:text-gray-400' : 'gba:text-gray-700'}`}
      >
        {showIcon && <User className="gba:w-3 gba:h-3 gba:flex-shrink-0" />}
        <span className="gba:truncate gba:max-w-[100px]">{name}</span>
      </div>
    </Tooltip>
  );
};
