import React from "react";
import { cn } from "../../../common/utils/cn";

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
  headerIcon: React.ReactNode;
  headerLabel: string;
  pageHeaderCenter?: React.ReactNode;
  pageHeaderRight?: React.ReactNode;
  pageController?: React.ReactNode;
  contentHeader?: React.ReactNode;
  contentContainer?: React.ReactNode;
  className?: string;
  variant?: "default" | "display";
}

export const PageLayout: React.FC<Readonly<PageLayoutProps>> = ({
  headerIcon,
  headerLabel,
  pageHeaderCenter,
  pageHeaderRight,
  pageController,
  contentHeader,
  contentContainer,
  className = "",
  variant = "default",
}) => {
  // Determine styles based on variant
  const isDisplay = variant === "display";

  const iconClasses = cn(
    "gba:flex gba:items-center gba:justify-center gba:shrink-0",
    isDisplay ? "gba:w-12 gba:h-12" : "gba:w-8 gba:h-8"
  );

  // Icon size will be controlled through the parent container size

  const labelClasses = cn(
    "gba:leading-none gba:font-medium gba:self-center",
    isDisplay ? "gba:text-4xl gba:font-secondary gba:mb-2" : "gba:text-2xl font-secondary gba:mb-1"
  );

  return (
    <div
      className={`gba:page-layout gba:w-full gba:h-full gba:px-6 gba:flex gba:flex-col gba:bg-white gba:rounded-xl gba:shadow-md gba:overflow-hidden ${className}`.trim()}
      style={{ minHeight: "0", minWidth: "0" }}
    >
      <header className="gba:flex gba:flex-col gba:box-border gba:border-b gba:border-gray-200 gba:relative">
        <div className="gba:h-24 gba:grid gba:grid-cols-3 gba:items-center gba:w-full">
          {/* Left section: Icon + Label */}
          <div className="gba:flex gba:items-center gba:h-full gba:gap-4 gba:justify-start">
            <div className="gba:flex gba:items-center gba:h-full">
              <span className={iconClasses} data-testid="page-header-icon">
                {React.isValidElement(headerIcon)
                  ? React.cloneElement(headerIcon as React.ReactElement, {
                      size: isDisplay ? 48 : 32,
                    })
                  : headerIcon}
              </span>
            </div>
            <div className="gba:flex gba:items-center gba:h-full">
              <span className={labelClasses}>{headerLabel}</span>
            </div>
          </div>
          
          {/* Center section: pageHeaderCenter - Perfectly centered */}
          <div className="gba:flex gba:items-center gba:h-full gba:justify-center">
            {pageHeaderCenter}
          </div>
          
          {/* Right section: pageHeaderRight */}
          <div className="gba:flex gba:items-center gba:h-full gba:justify-end">
            {pageHeaderRight}
          </div>
        </div>
        {pageController && (
          <div className="gba:flex gba:justify-start gba:py-2">
            {pageController}
          </div>
        )}
      </header>
      <div className="flex flex-col flex-1 min-h-0">
        {contentHeader && (
          <div className="gba:py-2 gba:border-b gba:border-gray-200">
            {contentHeader}
          </div>
        )}
        <div className="gba:flex-1 gba:min-h-0">{contentContainer}</div>
      </div>
    </div>
  );
};
