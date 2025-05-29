import React from 'react';
import { cn } from '../../../common/utils/cn';

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
 * @param contentHeader - Content to render in the content header (inside content)
 * @param contentContainer - Main content area (inside content)
 * @param className - Optional additional class names for custom styling
 * @param variant - Style variant ('default' or 'display')
 */
export interface PageLayoutProps {
  headerIcon: React.ReactNode;
  headerLabel: string;
  pageHeaderCenter?: React.ReactNode;
  pageHeaderRight?: React.ReactNode;
  contentHeader?: React.ReactNode;
  contentContainer?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'display';
}

export const PageLayout: React.FC<Readonly<PageLayoutProps>> = ({
  headerIcon,
  headerLabel,
  pageHeaderCenter,
  pageHeaderRight,
  contentHeader,
  contentContainer,
  className = '',
  variant = 'default',
}) => {
  // Determine styles based on variant
  const isDisplay = variant === 'display';
  
  const iconClasses = cn(
    "flex items-center justify-center",
    isDisplay ? "w-12 h-12" : "w-10 h-10"
  );
  
  const labelClasses = cn(
    "text-black font-secondary whitespace-nowrap",
    isDisplay ? "ml-4 text-4xl font-black" : "ml-2 text-2xl font-normal"
  );

  return (
    <div
      className={`page-layout w-full h-full flex flex-col bg-white rounded-xl shadow-md overflow-hidden ${className}`.trim()}
      style={{ minHeight: '0', minWidth: '0' }}
    >
      <header className="h-24 p-2 px-4 flex items-center box-border border-b border-gray-200 relative">
        <div className="flex items-center min-w-0 flex-none">
          <span className={iconClasses}>{headerIcon}</span>
          <span className={labelClasses}>{headerLabel}</span>
        </div>
        {pageHeaderCenter && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">{pageHeaderCenter}</div>
          </div>
        )}
        {pageHeaderRight && (
          <div className="flex items-center min-w-0 flex-none justify-end">
            {pageHeaderRight}
          </div>
        )}
      </header>
      <div className="flex flex-col flex-1 min-h-0">
        {contentHeader && (
          <div className="py-2 border-b border-gray-200">{contentHeader}</div>
        )}
        <div className="bg-gray-100 flex-1 min-h-0">{contentContainer}</div>
      </div>
    </div>
  );
};

// For backward compatibility
export const PageLayoutDefault: React.FC<Readonly<Omit<PageLayoutProps, 'variant'>>> = (props) => {
  return <PageLayout {...props} variant="default" />;
};

export const PageLayoutDisplay: React.FC<Readonly<Omit<PageLayoutProps, 'variant'>>> = (props) => {
  return <PageLayout {...props} variant="display" />;
};
