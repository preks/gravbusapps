'use client';

import React from 'react';
import { cn } from '@/utils/cn';

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
      className={`profile-layout w-full h-full flex ${
        isTopHeader ? 'flex-col' : 'flex-row'
      } bg-white rounded-xl shadow-md overflow-hidden ${className}`.trim()}
      style={{ minHeight: '0', minWidth: '0' }}
    >
      {/* Header section - either top or left */}
      <header
        className={cn(
          'bg-white border-gray-200 overflow-visible',
          isTopHeader
            ? 'w-full border-b flex flex-col' // Removed fixed height to accommodate varying content heights
            : 'w-64 h-full p-4 border-r flex flex-col'
        )}
      >
        {headerContent}
      </header>

      {/* Content section - always a column layout */}
      <div className={`flex flex-col flex-1 min-h-0 ${isTopHeader ? '' : 'w-full'}`}>
        {/* Content header - always above content container */}
        {contentHeader && (
          <div className="py-3 px-4 border-b border-gray-200 bg-white">{contentHeader}</div>
        )}
        
        {/* Main content container */}
        <div className="bg-gray-100 flex-1 min-h-0 p-4 overflow-auto">{contentContainer}</div>
      </div>
    </div>
  );
};

export default ProfileLayout;
