'use client';

import React from 'react';
import { cn } from '../../../common/utils/cn';

/**
 * ProfileLayout provides a consistent layout for profile screens with configurable header placement.
 *
 * Features:
 * - Header can be positioned at the top or on the left side
 * - Content header is always positioned above the content container
 * - Responsive design that adapts to different screen sizes
 * - Consistent styling with the rest of the application
 *
 * @param headerContent - Content to render in the header (required)
 * @param contentHeader - Content to render in the content header (optional)
 * @param contentContainer - Main content area (required)
 * @param headerPlacement - Position of the header ('top' or 'left')
 * @param className - Optional additional class names for custom styling
 */
export interface ProfileLayoutProps {
  headerContent: React.ReactNode;
  contentHeader?: React.ReactNode;
  contentContainer: React.ReactNode;
  headerPlacement?: 'top' | 'left';
  className?: string;
}

export const ProfileLayout: React.FC<Readonly<ProfileLayoutProps>> = ({
  headerContent,
  contentHeader,
  contentContainer,
  headerPlacement = 'top',
  className = '',
}) => {
  const isTopHeader = headerPlacement === 'top';

  return (
    <div
      className={`profile-layout gba:w-full gba:h-full gba:flex ${
        isTopHeader ? 'gba:flex-col' : 'gba:flex-row'
      } gba:bg-white gba:rounded-xl gba:shadow-md gba:overflow-hidden ${className}`.trim()}
      style={{ minHeight: '0', minWidth: '0' }}
    >
      {/* Header section - either top or left */}
      <header
        className={cn("gba:bg-white gba:border-gray-200 gba:overflow-visible", isTopHeader
            ? 'gba:w-full gba:border-b gba:flex gba:flex-col' // Removed fixed height to accommodate varying content heights
            : 'gba:w-64 gba:h-full gba:p-4 gba:border-r gba:flex gba:flex-col'
        )}
      >
        {headerContent}
      </header>

      {/* Content section - always a column layout */}
      <div className={`gba:flex gba:flex-col gba:flex-1 gba:min-h-0 ${isTopHeader ? '' : 'gba:w-full'}`}>
        {/* Content header - always above content container */}
        {contentHeader && (
          <div className="gba:py-3 gba:px-4 gba:border-b gba:border-gray-200 gba:bg-white">{contentHeader}</div>
        )}
        
        {/* Main content container */}
        <div className="gba:bg-gray-100 gba:flex-1 gba:min-h-0 gba:p-4 gba:overflow-auto">{contentContainer}</div>
      </div>
    </div>
  );
};

export default ProfileLayout;
