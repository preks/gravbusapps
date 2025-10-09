import React from 'react'
import { cn } from '../../../common/utils/cn'

/**
 * PageLayout provides a consistent frame and layout for all screens, with a configurable header style.
 *
 * Header structure:
 * <header class="page-header">
 *   <div class="page-header-left">
 *     <span class="page-header-icon">{headerIcon}</span>
 *     <span class="page-header-label font-secondary">{headerLabel}</span>
 *   </div>
 *   <div class="page-header-center">...</div>
 *   <div class="page-header-right">...</div>
 * </header>
 *
 * @param headerIcon - Icon to render in the header (required)
 * @param headerLabel - Label/title to render in the header (required)
 * @param pageHeaderCenter - Optional center content (e.g. tabs)
 * @param pageHeaderRight - Optional right content (e.g. actions)
 * @param pageController - Optional controller content (e.g. tab bars)
 * @param contentHeader - Content to render in the content header (inside content)
 * @param contentContainer - Main content area (inside content)
 * @param className - Optional additional class names for custom styling
 * @param variant - Style variant ('default' or 'display')
 */
export interface PageLayoutProps {
  headerIcon: React.ReactNode
  headerLabel: string
  headerLabelClassName?: string
  pageHeaderLeftExtra?: React.ReactNode
  headerTopLeft?: React.ReactNode
  pageHeaderCenter?: React.ReactNode
  pageHeaderRight?: React.ReactNode
  headerHeightClassName?: string // allows compact header heights per screen
  pageControllerClassName?: string // allows tuning spacing under header
  pageController?: React.ReactNode
  contentHeader?: React.ReactNode
  contentContainer?: React.ReactNode
  className?: string
  variant?: 'default' | 'display'
  backgroundImage?: string
}

export const PageLayout: React.FC<Readonly<PageLayoutProps>> = ({
  headerIcon,
  headerLabel,
  headerLabelClassName = '',
  pageHeaderLeftExtra,
  headerTopLeft,
  pageHeaderCenter,
  pageHeaderRight,
  headerHeightClassName = 'gba:h-24',
  pageControllerClassName = 'gba:py-2',
  pageController,
  contentHeader,
  contentContainer,
  className = '',
  variant = 'default',
  backgroundImage
}) => {
  // Determine styles based on variant
  const isDisplay = variant === 'display'

  const iconClasses = cn(
    'gba:flex gba:items-center gba:justify-center gba:shrink-0',
    isDisplay ? 'gba:w-12 gba:h-12' : 'gba:w-8 gba:h-8'
  )

  // Icon size will be controlled through the parent container size

  const labelClasses = cn(
    'gba:text-xl gba:font-semibold gba:tracking-tight gba:truncate',
    headerLabelClassName,
    isDisplay ? 'gba:text-4xl gba:font-secondary' : 'gba:text-2xl font-secondary'
  )

  const backgroundStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        minWidth: '0'
      }
    : { minHeight: '0', minWidth: '0' }

  const containerClasses = backgroundImage
    ? `gba:page-layout gba:w-full gba:h-full gba:px-6 gba:flex gba:flex-col gba:overflow-hidden ${className}`.trim()
    : `gba:page-layout gba:w-full gba:h-full gba:px-6 gba:flex gba:flex-col gba:bg-white gba:rounded-xl gba:shadow-md gba:overflow-hidden ${className}`.trim()

  return (
    <div className={containerClasses} style={backgroundStyle} data-testid="page-layout-container">
      <header
        className="gba:flex gba:flex-col gba:box-border gba:border-b gba:border-gray-200 gba:relative"
        data-testid="page-layout-header"
      >
        {headerTopLeft && (
          <div className="gba:flex gba:items-center gba:py-2" data-testid="page-layout-header-top">
            <div className="gba:flex gba:items-center gba:justify-start gba:w-full">{headerTopLeft}</div>
          </div>
        )}
        <div
          className={`${headerHeightClassName} gba:grid gba:grid-cols-3 gba:items-center gba:w-full`}
          data-testid="page-layout-header-main"
        >
          {/* Left section: Icon + Label */}
          <div
            className="gba:flex gba:items-center gba:h-full gba:gap-4 gba:justify-start"
            data-testid="page-layout-header-left"
          >
            {pageHeaderLeftExtra && (
              <div className="gba:flex gba:items-center gba:h-full" data-testid="page-layout-header-left-extra">
                {pageHeaderLeftExtra}
              </div>
            )}
            <div className="gba:flex gba:items-center gba:h-full">
              <span className={iconClasses} data-testid="page-layout-header-icon">
                {React.isValidElement(headerIcon)
                  ? React.cloneElement(headerIcon as React.ReactElement, {
                      size: isDisplay ? 48 : 32
                    })
                  : headerIcon}
              </span>
            </div>
            <div className="gba:flex gba:items-center gba:h-full">
              <span className={labelClasses} data-testid="page-layout-header-label">
                {headerLabel}
              </span>
            </div>
          </div>

          {/* Center section: pageHeaderCenter - Perfectly centered */}
          <div
            className="gba:flex gba:items-center gba:h-full gba:justify-center"
            data-testid="page-layout-header-center"
          >
            {pageHeaderCenter}
          </div>

          {/* Right section: pageHeaderRight */}
          <div className="gba:flex gba:items-center gba:h-full gba:justify-end" data-testid="page-layout-header-right">
            {pageHeaderRight}
          </div>
        </div>
        {pageController && (
          <div
            className={`gba:flex gba:justify-start ${pageControllerClassName}`}
            data-testid="page-layout-page-controller"
          >
            {pageController}
          </div>
        )}
      </header>
      <div
        className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:overflow-hidden"
        data-testid="page-layout-content"
      >
        {contentHeader && (
          <div className="gba:py-2 gba:border-b gba:border-gray-200" data-testid="page-layout-content-header">
            {contentHeader}
          </div>
        )}
        <div className="gba:flex-1 gba:min-h-0" data-testid="page-layout-content-container">
          {contentContainer}
        </div>
      </div>
    </div>
  )
}
