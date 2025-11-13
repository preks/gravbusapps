'use client'

import React from 'react'
import { cn } from '../../../common/utils/cn'

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
 * @param dataTestId - Optional data test id for testing
 */
export interface ProfileLayoutProps {
  headerContent: React.ReactNode
  contentHeader?: React.ReactNode
  contentContainer: React.ReactNode
  headerPlacement?: 'top' | 'left'
  className?: string
  'data-testid'?: string
}

export const ProfileLayout: React.FC<Readonly<ProfileLayoutProps>> = ({
  headerContent,
  contentHeader,
  contentContainer,
  headerPlacement = 'top',
  className = '',
  'data-testid': dataTestId = 'profile-layout'
}) => {
  const isTopHeader = headerPlacement === 'top'

  return (
    <div
      className={`profile-layout gba:w-full gba:h-full gba:flex ${
        isTopHeader ? 'gba:flex-col' : 'gba:flex-row'
      } gba:bg-white gba:rounded-xl gba:shadow-md gba:overflow-hidden ${className}`.trim()}
      style={{ minHeight: '0', minWidth: '0' }}
      data-testid={dataTestId}
    >
      {/* Header section - either top or left */}
      <header
        className={cn(
          'gba:bg-white gba:border-gray-200',
          isTopHeader ? 'gba:overflow-visible' : 'gba:overflow-auto',
          isTopHeader
            ? 'gba:w-full gba:border-b gba:flex gba:flex-col' // Removed fixed height to accommodate varying content heights
            : 'gba:w-64 gba:h-full gba:p-4 gba:border-r gba:flex gba:flex-col gba:min-h-0'
        )}
        data-testid={`${dataTestId}-header`}
      >
        <div data-testid={`${dataTestId}-header-content`}>{headerContent}</div>
      </header>

      {/* Content section - always a column layout */}
      <div
        className={`gba:flex gba:flex-col gba:flex-1 gba:min-h-0 ${isTopHeader ? '' : 'gba:w-full'}`}
        data-testid={`${dataTestId}-content-section`}
      >
        {/* Content header - always above content container */}
        {contentHeader && (
          <div
            className="gba:py-3 gba:px-4 gba:border-b gba:border-gray-200 gba:bg-white"
            data-testid={`${dataTestId}-content-header`}
          >
            {contentHeader}
          </div>
        )}

        {/* Main content container */}
        <div
          className="gba:bg-white gba:flex-1 gba:min-h-0 gba:p-4 gba:overflow-auto"
          data-testid={`${dataTestId}-content-container`}
        >
          {contentContainer}
        </div>
      </div>
    </div>
  )
}

export default ProfileLayout
