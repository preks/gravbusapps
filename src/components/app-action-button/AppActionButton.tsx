"use client";

import React from "react";
import {
  ActionButton,
  ActionOption,
  type ActionButtonProps,
} from "@newwork/gravity-ui-catalog";
import { useTranslation } from "react-i18next";
import { useMainContextsData } from "@/common/hooks/useMainContextsData";
import { useFlowItems, ExternalContextData } from "@/common/hooks/useFlowItems";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

export type AppActionButtonProps = Omit<ActionButtonProps, "flowData"> & {
  contextsArray?: FlowContextName[];
  externalContextData?: ExternalContextData;
  staticFlowData?: ActionOption[];
  prefixDataTestId?: string;
  accessToken?: string;
  deferMainContextRequestsUntilClick?: boolean;
  /**
   * Controls how the button behaves when no flow items are available
   * @default 'disable'
   */
  emptyStateBehavior?: 'disable' | 'hide' | 'enabled';
  /**
   * Test ID for the AppActionButton container
   */
  'data-testid'?: string;
};

const DATA_TEST_ID_PREFIX = "AppActionButton";

/**
 * AppActionButton Component
 * Displays an action button with flow items from the flow registry
 */
export const AppActionButton: React.FC<AppActionButtonProps> = (props) => {
  const { t } = useTranslation('client-components');
  const dataTestId = formatDataTestId(
    props.prefixDataTestId,
    DATA_TEST_ID_PREFIX
  );
  
  // Track whether a deferred fetch has been attempted
  const [hasDeferredFetchAttempted, setHasDeferredFetchAttempted] = React.useState(false);

  // Use manual mode when deferring requests until click
  const {
    mainContextsData,
    fetchMainContextsData,
    isLoading: isLoadingContexts,
  } = useMainContextsData(
    props?.contextsArray ?? [],
    props?.accessToken ?? "",
    !!props.deferMainContextRequestsUntilClick
  );

  const {
    flowData,
    fetchFlowItems,
    isLoading: isLoadingFlows,
  } = useFlowItems({
    mainContextsData,
    externalContextData: props.externalContextData ?? {},
    isFlowButtonOrigin: true,
    accessToken: props?.accessToken ?? "",
    manualFetch: !!props.deferMainContextRequestsUntilClick,
  });

  // Track overall loading state - true if either contexts or flows are loading
  const isLoading = isLoadingContexts || isLoadingFlows;

  const combinedData = [...(props.staticFlowData ?? []), ...flowData];

  // Process execution is now handled directly in the onClick handler of each ActionOption

  // Extract custom props that shouldn't be passed to DOM
  const {
    prefixDataTestId,
    accessToken,
    contextsArray,
    externalContextData,
    staticFlowData,
    deferMainContextRequestsUntilClick,
    emptyStateBehavior = 'disable',
    'data-testid': customDataTestId,
    ...restProps
  } = props;

  return (
    <div data-testid={customDataTestId || `${dataTestId}-container`}>
      <ActionButton
        {...restProps}
        data-testid={formatDataTestId(dataTestId, "Button")}
        noFlowAvailableText={t("flow_button.no_flows_available")}
        noOptionAvailableText={t("flow_button.no_flows_available")}
        // Apply the emptyStateBehavior provided in props
        // When in deferred mode and 'enabled' mode is not explicitly requested, we ensure it's clickable using loading state instead
        emptyStateBehavior={emptyStateBehavior}
        // Show loading state when actually loading or when in deferred mode with no data yet AND no fetch has been attempted
        dropdownLoading={isLoading || (deferMainContextRequestsUntilClick && combinedData.length === 0 && !hasDeferredFetchAttempted)}
        flowData={combinedData}
        portalContainer={document.body}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();

          // If configured to defer requests until click, trigger the requests
          if (deferMainContextRequestsUntilClick) {
            // Mark that a fetch has been attempted
            setHasDeferredFetchAttempted(true);
            
            // First fetch main contexts data, then pass that data directly to fetchFlowItems
            fetchMainContextsData && 
              fetchMainContextsData().then((contextData) => {
                // Only fetch flow items if we have context data
                if (contextData && fetchFlowItems) {
                  fetchFlowItems(contextData);
                }
              });
          }
        }}
      />
    </div>
  );
};

export default AppActionButton;