"use client";

import React from "react";
import {
  ActionMenu,
  type ActionMenuProps,
} from "@newwork/nw-design-system";
import { 
  useAppActionData, 
  extractAppActionProps,
  AppActionCommonProps 
} from "@/common/hooks/useAppActionData";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

export type AppActionMenuProps = Omit<ActionMenuProps, "actions"> & AppActionCommonProps & {
  /**
   * Controls how the menu behaves when no flow items are available
   * @default 'disable'
   */
  emptyStateBehavior?: 'disable' | 'hide' | 'enabled';
  /**
   * CSS style object for the container
   */
  style?: React.CSSProperties;
  /**
   * Custom hover handlers for the container
   */
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

const DATA_TEST_ID_PREFIX = "AppActionMenu";

/**
 * AppActionMenu Component
 * Displays an action menu with flow items from the flow registry
 * Based on the ActionMenu from nw-design-system
 */
export const AppActionMenu: React.FC<AppActionMenuProps> = (props) => {
  // Extract App Action specific props and get clean props for ActionMenu
  const { appActionConfig, cleanProps } = extractAppActionProps(props);
  
  // Use shared logic for data fetching and state management
  const {
    combinedData,
    handleDeferredFetch,
    translations,
    shouldShowLoading
  } = useAppActionData(appActionConfig, DATA_TEST_ID_PREFIX);

  // Extract remaining props
  const {
    children,
    onMenuOpen,
    onMenuClose,
    onOpenChange,
    onMouseEnter,
    onMouseLeave,
    style,
    'data-testid': customDataTestId,
    ...actionMenuProps
  } = cleanProps;

  // Generate test IDs
  const containerTestId = customDataTestId || formatDataTestId(
    appActionConfig.prefixDataTestId,
    DATA_TEST_ID_PREFIX,
    'container'
  );
  const menuTestId = formatDataTestId(
    appActionConfig.prefixDataTestId,
    DATA_TEST_ID_PREFIX,
    'Menu'
  );

  // Handle menu open events
  const handleMenuOpen = React.useCallback(() => {
    handleDeferredFetch();
    onMenuOpen?.();
  }, [handleDeferredFetch, onMenuOpen]);

  // Handle open/close state changes
  const handleOpenChange = React.useCallback((open: boolean) => {
    if (open) {
      handleMenuOpen();
    } else {
      onMenuClose?.();
    }
    onOpenChange?.(open);
  }, [handleMenuOpen, onMenuClose, onOpenChange]);

  return (
    <div 
      data-testid={containerTestId}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <ActionMenu
        {...actionMenuProps}
        actions={combinedData}
        emptyStateBehavior={appActionConfig.emptyStateBehavior === 'enabled' ? 'disable' : appActionConfig.emptyStateBehavior}
        actionsLoading={shouldShowLoading}
        loadingText={translations.loading}
        noActionsText={translations.noActions}
        onMenuOpen={handleMenuOpen}
        onMenuClose={onMenuClose}
        onOpenChange={handleOpenChange}
        data-testid={menuTestId}
      >
        {children}
      </ActionMenu>
    </div>
  );
};

export default AppActionMenu;
