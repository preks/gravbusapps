import React from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system';
import { navigateTo } from '@/common/utils/navigationUtils';

export interface EnhancedEmployeeDisplayProps {
  userId: string;
  displayName: string;
  employeeData?: any; // Full employee data from batch fetch (for profile picture support)
  testId?: string;
  showTooltip?: boolean;
}

/**
 * Enhanced Employee Display Component with Avatar
 * 
 * Features:
 * - Profile picture with fallback to initials
 * - Clickable to navigate to employee profile
 * - Hover effects and tooltips
 * - Consistent styling across the application
 */
export const EnhancedEmployeeDisplay: React.FC<EnhancedEmployeeDisplayProps> = ({ 
  userId, 
  displayName, 
  employeeData, 
  testId, 
  showTooltip = true 
}) => {
  // Helper function to get employee initials
  const getInitials = (name: string) => {
    if (!name || name === "-") return "U";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2); // Max 2 characters
  };

  // Handle click to navigate to employee record
  const handleEmployeeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userId && userId !== 'unknown' && employeeData?.id) {
      const employeeId = employeeData.id;
      navigateTo(`/platform/employee-record?employeeId=${employeeId}`);
    }
  };

  const avatarDisplay = (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group gba:py-0 gba:px-1 gba:rounded gba:transition-colors hover:gba:bg-gray-100"
      data-testid={testId}
      onClick={handleEmployeeClick}
    >
      <Avatar size="sm" className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full gba:flex-shrink-0">
        {(employeeData?.pictureThumbnail || employeeData?.picture || employeeData?.avatar || employeeData?.profilePicture) && (
          <AvatarImage
            src={`data:image/png;base64,${employeeData.pictureThumbnail || employeeData.picture || employeeData.avatar || employeeData.profilePicture}`}
            alt={displayName}
            onError={(e) => {
              // Try different image formats if PNG fails
              const target = e.target as HTMLImageElement;
              const imageData = employeeData.pictureThumbnail || employeeData.picture || employeeData.avatar || employeeData.profilePicture;
              if (target.src.includes('png')) {
                target.src = `data:image/jpeg;base64,${imageData}`;
              } else if (target.src.includes('jpeg')) {
                target.src = `data:image/gif;base64,${imageData}`;
              }
            }}
          />
        )}
        <AvatarFallback>
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <span className="gba:text-sm gba:group-hover:gba:text-blue-600 gba:transition-colors gba:leading-normal">
        {displayName}
      </span>
    </div>
  );

  if (showTooltip && userId && userId !== 'unknown') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {avatarDisplay}
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to view employee profile</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarDisplay;
};
