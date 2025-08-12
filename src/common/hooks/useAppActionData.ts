import { useState, useCallback } from 'react';
import { ActionOption } from '@newwork/nw-design-system';
import { useMainContextsData } from './useMainContextsData';
import { useFlowItems, ExternalContextData } from './useFlowItems';
import { FlowContextName } from '../types/FlowRegistryTypes';
import { formatDataTestId } from '../utils/formatDataTestId';

// Create stable empty array and object to prevent re-renders
export const EMPTY_CONTEXTS_ARRAY: FlowContextName[] = [];
export const EMPTY_EXTERNAL_CONTEXT_DATA: ExternalContextData = {};

/**
 * Common props interface for App Action components
 */
export interface AppActionCommonProps {
  contextsArray?: FlowContextName[];
  externalContextData?: ExternalContextData;
  staticFlowData?: ActionOption[];
  prefixDataTestId?: string;
  accessToken?: string;
  deferMainContextRequestsUntilClick?: boolean;
  emptyStateBehavior?: 'disable' | 'hide' | 'enabled';
  'data-testid'?: string;
  loadingText?: string;
  noActionsText?: string;
}

/**
 * Configuration for the useAppActionData hook
 */
export interface UseAppActionDataConfig {
  contextsArray?: FlowContextName[];
  externalContextData?: ExternalContextData;
  staticFlowData?: ActionOption[];
  prefixDataTestId?: string;
  accessToken?: string;
  deferMainContextRequestsUntilClick?: boolean;
  emptyStateBehavior?: 'disable' | 'hide' | 'enabled';
  loadingText?: string;
  noActionsText?: string;
}

/**
 * Return type for the useAppActionData hook
 */
export interface UseAppActionDataReturn {
  // Data
  combinedData: ActionOption[];
  isLoading: boolean;
  
  // Handlers
  handleDeferredFetch: () => void;
  
  // Test ID utilities
  formatTestId: (suffix: string) => string;
  
  // Translations
  translations: {
    loading: string;
    noActions: string;
  };
  
  // Loading state calculation
  shouldShowLoading: boolean;
  
  // Internal state for debugging
  hasDeferredFetchAttempted: boolean;
}

/**
 * Shared hook for App Action components (Button and Menu)
 * Handles flow data fetching, loading states, and deferred loading logic
 */
export const useAppActionData = (
  config: UseAppActionDataConfig,
  dataTestIdPrefix: string
): UseAppActionDataReturn => {
  // Track whether a deferred fetch has been attempted
  const [hasDeferredFetchAttempted, setHasDeferredFetchAttempted] = useState(false);

  // Use manual mode when deferring requests until click/open
  const {
    mainContextsData,
    fetchMainContextsData,
    isLoading: isLoadingContexts,
  } = useMainContextsData(
    config.contextsArray ?? EMPTY_CONTEXTS_ARRAY,
    config.accessToken ?? "",
    !!config.deferMainContextRequestsUntilClick
  );

  const {
    flowData,
    fetchFlowItems,
    isLoading: isLoadingFlows,
  } = useFlowItems({
    mainContextsData,
    externalContextData: config.externalContextData ?? EMPTY_EXTERNAL_CONTEXT_DATA,
    isFlowButtonOrigin: true,
    accessToken: config.accessToken ?? "",
    manualFetch: !!config.deferMainContextRequestsUntilClick,
  });

  // Track overall loading state - true if either contexts or flows are loading
  const isLoading = isLoadingContexts || isLoadingFlows;

  // Combined data from static and flow sources
  const combinedData = [...(config.staticFlowData ?? []), ...flowData];

  // Calculate whether to show loading state
  const shouldShowLoading = isLoading || 
    (!!config.deferMainContextRequestsUntilClick && 
     combinedData.length === 0 && 
     !hasDeferredFetchAttempted);

  // Translations
  const translations = {
    // Project has no i18n concept active here; use literal fallbacks
    loading: config.loadingText || 'Loading actions…',
    noActions: config.noActionsText || 'No actions available'
  };

  // Test ID formatter
  const formatTestId = useCallback((suffix: string) => {
    return formatDataTestId(config.prefixDataTestId, dataTestIdPrefix, suffix);
  }, [config.prefixDataTestId, dataTestIdPrefix]);

  // Handler for deferred fetching (used by both Button and Menu)
  const handleDeferredFetch = useCallback(() => {
    // If configured to defer requests until interaction, trigger the requests
    if (config.deferMainContextRequestsUntilClick && !hasDeferredFetchAttempted) {
      // Mark that a fetch has been attempted
      setHasDeferredFetchAttempted(true);
      
      // First fetch main contexts data, then pass that data directly to fetchFlowItems
      if (fetchMainContextsData) {
        fetchMainContextsData().then((contextData) => {
          // Only fetch flow items if we have context data
          if (contextData && fetchFlowItems) {
            fetchFlowItems(contextData);
          }
        }).catch((error) => {
          console.error('Error fetching context data:', error);
        });
      }
    }
  }, [
    config.deferMainContextRequestsUntilClick,
    hasDeferredFetchAttempted,
    fetchMainContextsData,
    fetchFlowItems
  ]);

  return {
    combinedData,
    isLoading,
    handleDeferredFetch,
    formatTestId,
    translations,
    shouldShowLoading,
    hasDeferredFetchAttempted
  };
};

/**
 * Utility function to extract common props from component props
 * Removes App Action specific props and returns clean props for the underlying component
 */
export const extractAppActionProps = <T extends AppActionCommonProps>(
  props: T
): {
  appActionConfig: UseAppActionDataConfig;
  cleanProps: Omit<T, keyof AppActionCommonProps> & { 'data-testid'?: string };
} => {
  const {
    contextsArray,
    externalContextData,
    staticFlowData,
    prefixDataTestId,
    accessToken,
    deferMainContextRequestsUntilClick,
    emptyStateBehavior = 'disable',
    'data-testid': customDataTestId,
    loadingText,
    noActionsText,
    ...cleanProps
  } = props;

  const appActionConfig: UseAppActionDataConfig = {
    contextsArray,
    externalContextData,
    staticFlowData,
    prefixDataTestId,
    accessToken,
    deferMainContextRequestsUntilClick,
    emptyStateBehavior,
    loadingText,
    noActionsText
  };

  return {
    appActionConfig,
    cleanProps: { ...cleanProps, 'data-testid': customDataTestId } as Omit<T, keyof AppActionCommonProps> & { 'data-testid'?: string }
  };
};
