import React from 'react';
import { Spin } from 'antd';
import { User } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useUserDetails, getEmployeeDisplayName } from '../hooks/useUserDetails';

export interface UserDisplayNameProps extends BusinessAppContextProps {
  /**
   * Employee/User ID to fetch and display name for
   */
  userId?: string;
  
  /**
   * Fallback text to show if user not found or loading fails
   */
  fallback?: string;
  
  /**
   * Whether to show a user icon next to the name
   */
  showIcon?: boolean;
  
  /**
   * Size of the text display
   */
  size?: 'small' | 'default' | 'large';
  
  /**
   * Color theme for the display
   */
  color?: 'default' | 'blue' | 'orange' | 'green' | 'gray';
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Test ID for testing
   */
  testId?: string;
}

/**
 * Component that displays a user's real name by fetching it via GraphQL
 * Shows a loading spinner while fetching, and falls back to the user ID if fetch fails
 */
export const UserDisplayName: React.FC<UserDisplayNameProps> = ({
  userId,
  accessToken,
  userInfo,
  fallback = 'Unknown User',
  showIcon = true,
  size = 'default',
  color = 'default',
  className = '',
  testId,
}) => {
  const { employee, isLoading, error } = useUserDetails({
    employeeId: userId,
    accessToken,
    userInfo,
  });

  // Get the display name
  const displayName = getEmployeeDisplayName(employee, userId || fallback);
  
  // Determine text color based on color prop
  const getTextColor = (): string => {
    switch (color) {
      case 'blue': return 'gba:text-blue-600';
      case 'orange': return 'gba:text-orange-600';
      case 'green': return 'gba:text-green-600';
      case 'gray': return 'gba:text-gray-500';
      default: return 'gba:text-gray-900';
    }
  };
  
  // Determine icon color based on color prop
  const getIconColor = (): string => {
    switch (color) {
      case 'blue': return 'gba:text-blue-500';
      case 'orange': return 'gba:text-orange-500';
      case 'green': return 'gba:text-green-500';
      case 'gray': return 'gba:text-gray-400';
      default: return 'gba:text-gray-400';
    }
  };
  
  // Determine text size
  const getTextSize = (): string => {
    switch (size) {
      case 'small': return 'gba:text-xs';
      case 'large': return 'gba:text-lg';
      default: return 'gba:text-sm';
    }
  };

  // If we don't have a user ID, show fallback immediately
  if (!userId) {
    return (
      <div 
        className={`gba:flex gba:items-center gba:gap-2 ${className}`}
        data-testid={testId}
      >
        {showIcon && <User className={`gba:w-4 gba:h-4 ${getIconColor()}`} />}
        <span className={`${getTextSize()} ${getTextColor()} gba:font-normal`}>
          {fallback}
        </span>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className={`gba:flex gba:items-center gba:gap-2 ${className}`}
        data-testid={testId}
      >
        {showIcon && <User className={`gba:w-4 gba:h-4 ${getIconColor()}`} />}
        <div className="gba:flex gba:items-center gba:gap-1">
          <Spin size="small" />
          <span className={`${getTextSize()} ${getTextColor()} gba:font-normal`}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // Show error state or fallback to user ID
  if (error || !employee) {
    return (
      <div 
        className={`gba:flex gba:items-center gba:gap-2 ${className}`}
        data-testid={testId}
      >
        {showIcon && <User className={`gba:w-4 gba:h-4 ${getIconColor()}`} />}
        <span className={`${getTextSize()} ${getTextColor()} gba:font-normal`}>
          {userId}
        </span>
      </div>
    );
  }

  // Show the real name
  return (
    <div 
      className={`gba:flex gba:items-center gba:gap-2 ${className}`}
      data-testid={testId}
    >
      {showIcon && <User className={`gba:w-4 gba:h-4 ${getIconColor()}`} />}
      <span className={`${getTextSize()} ${getTextColor()} gba:font-normal`}>
        {displayName}
      </span>
    </div>
  );
};
