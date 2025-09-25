import React from 'react';
import { Spin, Tooltip } from 'antd';
import { User } from 'lucide-react';
import { useEmployeeName } from '../hooks/useEmployeeName';
import { useEmployeeNameCache } from '../../../hooks/useEmployeeNameCache';
import { useEmployeeNameCacheOptional } from '../../../services/employee-cache';

export interface EmployeeDisplayNameProps {
  userId: string;
  accessToken?: string;
  showIcon?: boolean;
  fallback?: string;
  testId?: string;
  /** Pre-fetched display name from batch operation (bypasses individual fetching) */
  prefetchedDisplayName?: string;
  /** Whether to use cache-aware hook (default: true) */
  useCache?: boolean;
}

/**
 * Component to display employee name fetched from Employee table via GraphQL
 * Now supports caching and pre-fetched names for better performance
 */
export const EmployeeDisplayName: React.FC<EmployeeDisplayNameProps> = ({
  userId,
  accessToken,
  showIcon = false,
  fallback = 'Unknown User',
  testId,
  prefetchedDisplayName,
  useCache = true,
}) => {
  // Check if cache is available
  const cacheContext = useEmployeeNameCacheOptional();
  const shouldUseCache = useCache && cacheContext?.isInitialized;

  // Always call both hooks but disable them appropriately
  const cacheResult = useEmployeeNameCache({
    userId,
    accessToken,
    enabled: shouldUseCache && !prefetchedDisplayName, // Skip if we have prefetched data
  });

  const originalResult = useEmployeeName({
    userId: shouldUseCache || prefetchedDisplayName ? '' : userId, // Empty userId to prevent API call
    accessToken,
  });

  // Determine which result to use
  const { displayName, isLoading, error } = shouldUseCache ? cacheResult : originalResult;

  // Use prefetched name if available
  const finalDisplayName = prefetchedDisplayName || displayName;

  // Don't show loading state if we have prefetched data
  if (isLoading && !prefetchedDisplayName) {
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
  const name = finalDisplayName || fallback;
  const isUnknown = !finalDisplayName;

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
