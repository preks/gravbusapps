"use client";

import React from "react";
import {
  ActionButton,
  type ActionButtonProps,
} from "@newwork/nw-design-system";
import { 
  useAppActionData, 
  extractAppActionProps,
  AppActionCommonProps 
} from "@/common/hooks/useAppActionData";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

export type AppActionButtonProps = Omit<ActionButtonProps, "actions"> & AppActionCommonProps & {
  /**
   * Controls how the button behaves when no flow items are available
   * @default 'disable'
   */
  emptyStateBehavior?: 'disable' | 'hide' | 'enable';
};

const DATA_TEST_ID_PREFIX = "AppActionButton";

/**
 * AppActionButton Component
 * Displays an action button with flow items from the flow registry
 */
export const AppActionButton: React.FC<AppActionButtonProps> = (props) => {
  // Extract App Action specific props and get clean props for ActionButton
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
    onDropdownOpen,
    onClick,
    'data-testid': customDataTestId,
    ...actionButtonProps
  } = cleanProps;

  // Generate test IDs
  const containerTestId = customDataTestId || formatDataTestId(
    appActionConfig.prefixDataTestId,
    DATA_TEST_ID_PREFIX,
    'container'
  );
  const buttonTestId = formatDataTestId(
    appActionConfig.prefixDataTestId,
    DATA_TEST_ID_PREFIX,
    'Button'
  );

  // Handle dropdown open events for deferred loading
  const handleDropdownOpen = React.useCallback(() => {
    handleDeferredFetch();
    onDropdownOpen?.();
  }, [handleDeferredFetch, onDropdownOpen]);

  return (
    <div data-testid={containerTestId}>
      <ActionButton
        {...actionButtonProps}
        data-testid={buttonTestId}
        noActionsText={translations.noActions}
        loadingText={translations.loading}
        emptyStateBehavior={appActionConfig.emptyStateBehavior === 'enable' ? 'disable' : appActionConfig.emptyStateBehavior}
        actionsLoading={shouldShowLoading}
        actions={combinedData}
        onDropdownOpen={handleDropdownOpen}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick?.(e);
        }}
      />
    </div>
  );
};

export default AppActionButton;