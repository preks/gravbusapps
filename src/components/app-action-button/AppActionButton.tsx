"use client";

import React, { useState } from 'react'
import { ActionButton } from '@newwork/nw-design-system'
import { useTranslation } from 'react-i18next'
import { useMainContextsData } from '@/common/hooks/useMainContextsData'
import { useFlowItems, ExternalContextData } from '@/common/hooks/useFlowItems'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export type AppActionButtonProps = {
  contextsArray?: FlowContextName[]
  externalContextData?: ExternalContextData
  staticFlowData?: any[]
  prefixDataTestId?: string
  accessToken?: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
  deferMainContextRequestsUntilClick?: boolean;
  /**
   * Controls how the button behaves when no flow items are available
   * @default 'disable'
   */
  emptyStateBehavior?: 'disable' | 'hide' | 'enabled';
}

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
  const [isLoading, setIsLoading] = useState(false)
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

  // Combine static and dynamic flow data
  const combinedData = [...(props.staticFlowData ?? []), ...flowData];
  
  // Set loading state based on flow data availability
  /* useEffect(() => {
    // If we have main context data, wait for flow data to be fetched
    if (mainContextsData && Object.keys(mainContextsData).length > 0) {
      // Set loading to false after flow data has been processed
      setIsLoading(false)
    }
  }, [mainContextsData, flowData]) */
  
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
    ...restProps
  } = props;

  return (
    <ActionButton
      {...restProps}
      data-testid={formatDataTestId(dataTestId, "Button")}
      /* noFlowAvailableText={t("flow_button.no_flows_available")}
      noOptionAvailableText={t("flow_button.no_flows_available")} */
      // Apply the emptyStateBehavior provided in props
      // When in deferred mode and 'enabled' mode is not explicitly requested, we ensure it's clickable using loading state instead
      /* emptyStateBehavior={emptyStateBehavior} */
      // Show loading state when actually loading or when in deferred mode with no data yet AND no fetch has been attempted
      /* dropdownLoading={isLoading || (deferMainContextRequestsUntilClick && combinedData.length === 0 && !hasDeferredFetchAttempted)} */
      actions={combinedData}
      /* portalContainer={document.body} */
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
  );
};

export default AppActionButton;
