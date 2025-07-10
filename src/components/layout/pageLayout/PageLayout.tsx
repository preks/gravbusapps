import React from "react";
import { PageLayout as NWPageLayout, PageLayoutProps as NWPageLayoutProps } from "@newwork/nw-design-system";

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
 * @param headerLabelClassName - Optional CSS class for the header label
 * @param pageHeaderCenter - Optional center content (e.g. tabs)
 * @param pageHeaderRight - Optional right content (e.g. actions)
 * @param pageController - Optional controller content (e.g. tab bars)
 * @param contentHeader - Content to render in the content header (inside content)
 * @param contentContainer - Main content area (inside content) - maps to children
 * @param className - Optional additional class names for custom styling
 * @param variant - Style variant ('default' or 'display')
 * @param backgroundImage - Optional background image URL
 */
export interface PageLayoutProps extends Omit<NWPageLayoutProps, "headerTitle" | "children"> {
  headerIcon?: React.ReactNode;
  headerLabel: string;
  headerLabelClassName?: string;
  pageHeaderCenter?: React.ReactNode;
  pageHeaderRight?: React.ReactNode;
  pageController?: React.ReactNode;
  contentHeader?: React.ReactNode;
  contentContainer?: React.ReactNode;
  className?: string;
  variant?: "default" | "display";
  backgroundImage?: string;
}

/**
 * Wrapper around NWPageLayout that maps custom props to NWPageLayoutProps
 * This provides a consistent frame and layout for all screens, with configurable header styles
 * 
 * @param headerIcon - Icon to render in the header (passed through as-is)
 * @param headerLabel - Label/title to render in the header (required) - will be mapped to headerTitle
 * @param headerLabelClassName - Optional CSS class for the header label (kept for interface consistency)
 * @param pageHeaderCenter - Optional center content (passed through as-is)
 * @param pageHeaderRight - Optional right content (passed through as-is)
 * @param pageController - Optional controller content (passed through as-is)
 * @param contentHeader - Content header (passed through as-is)
 * @param contentContainer - Main content (mapped to children)
 * @param className - CSS classes (passed through as-is)
 * @param variant - Style variant (passed through as-is)
 * @param backgroundImage - Background image (passed through as-is)
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  headerIcon,
  headerLabel,
  contentContainer,
  ...restProps
}) => {
  return (
    <NWPageLayout 
      headerIcon={headerIcon}
      headerTitle={headerLabel}
      {...restProps}
      data-testid="page-layout"
    >
      {contentContainer}
    </NWPageLayout>
  );
};
