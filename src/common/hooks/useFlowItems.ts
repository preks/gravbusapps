import { useState, useEffect, useCallback } from 'react';
import { FlowItemReduced } from '../types/FlowRegistryTypes';
import { ActionOption } from '@newwork/nw-design-system';
import { startProcess } from '../utils/start-process';
import { navigateTo } from '../utils/navigationUtils';
import { useFlowRegistryClient } from '../network/flows/useFlowRegistryClient';

export interface ExternalContextData {
  [key: string]: any;
}

interface UseFlowItemsProps {
  mainContextsData: any;
  externalContextData: ExternalContextData;
  isFlowButtonOrigin?: boolean;
  accessToken?: string;
  manualFetch?: boolean; // When true, data will not be fetched automatically
}

/**
 * Hook to fetch and process flow items from the flow registry
 */
export const useFlowItems = ({ mainContextsData, externalContextData, accessToken = '', manualFetch = false }: UseFlowItemsProps) => {
  const [flowData, setFlowData] = useState<ActionOption[]>([]);
  const [isLoading, setIsLoading] = useState(!manualFetch);
  const [lastFetchedContexts, setLastFetchedContexts] = useState<string>(''); // Track last fetched contexts
  const flowRegistry = useFlowRegistryClient(accessToken);

  // Function that can be called manually to fetch flow items
  // Optional directContextData parameter allows passing context data directly without relying on state
  const fetchFlowItems = useCallback(async (directContextData?: Record<string, string>) => {
    const contextData = directContextData || mainContextsData;
    if (!contextData) return;
    
    // Create a unique key for this context combination to prevent duplicate fetches
    const contextKey = JSON.stringify({ contextData, externalContextData });
    if (contextKey === lastFetchedContexts && !directContextData) {
      return; // Skip if we've already fetched for these exact contexts
    }
    setIsLoading(true);
    try {
      const contexts = Object.entries(contextData).map(([contextName, mainContextDataId]) => ({
        contextName: contextName as any,
        mainContextDataId: externalContextData?.[mainContextDataId as string] as string
      }));

      if (contexts.length === 0) return;

      const response = await flowRegistry.getPermissionFlowItemsV2({
        contexts
      });

      if (response?.flowItems) {
        const mappedFlowItems = mapFlowItemsToActionOptions(response.flowItems, externalContextData);
        setFlowData(mappedFlowItems);
        setLastFetchedContexts(contextKey); // Update last fetched contexts
      }
    } catch (error) {
      console.error('Error fetching flow items:', error);
      setFlowData([]);
    } finally {
      setIsLoading(false);
    }
  }, [mainContextsData, externalContextData, flowRegistry, lastFetchedContexts]);

  // Only automatically fetch flow items if not in manual mode
  useEffect(() => {
    if (!manualFetch && mainContextsData) {
      fetchFlowItems();
    }
  }, [mainContextsData, manualFetch]); // Removed fetchFlowItems to avoid circular dependency

  return { flowData, fetchFlowItems, isLoading };
};

/**
 * Maps flow items from the API response to ActionOption objects for the ActionButton component
 */
const mapFlowItemsToActionOptions = (
  flowItems: FlowItemReduced[],
  externalContextData: ExternalContextData
): ActionOption[] => {
  /**
   * Formats a flow name by removing a leading bracketed prefix like "[ABC]" and trimming whitespace.
   */
  const formatFlowName = (rawName: string): string => {
    if (!rawName) return '';
    let name = String(rawName).trim();
    if (name.startsWith('[')) {
      const closingIndex = name.indexOf(']');
      if (closingIndex !== -1) {
        name = name.slice(closingIndex + 1);
      }
    }
    return name.trim();
  };

  return flowItems.map((flowItem) => {
    // Create payload directly from externalContextData
    // The context.contextData from the API is just metadata about what context is expected
    const payload: Record<string, any> = { ...externalContextData };
    
    // Create ActionOption with required properties
    const id = flowItem.id || '';
    const rawFlowName = typeof flowItem.flowNameTranslation === 'string' ? 
      flowItem.flowNameTranslation : 
      flowItem.flowName;
    const flowName = formatFlowName(rawFlowName);
      
    // Handle different flow types differently
    let onClick: () => void;
    
    switch (flowItem.flowType) {
      case 'NAVIGATION':
      case 'REPORT':
        // For NAVIGATION and REPORT types, navigate to the target URL
        onClick = () => {
          // Replace placeholders in targetDesktop with actual values from externalContextData
          let targetUrl = flowItem.targetDesktop;
          
          // The context.contextData tells us what context names are expected
          // We use those names to find values in externalContextData
          if (flowItem.context?.contextData) {
            flowItem.context.contextData.forEach(contextDataItem => {
              const placeholder = `{${contextDataItem.contextDataName}}`;
              const contextValue = externalContextData[contextDataItem.contextDataName];
              
              if (contextValue && targetUrl.includes(placeholder)) {
                targetUrl = targetUrl.replace(placeholder, contextValue);
              }
            });
          }
          
          // Navigate to the target URL using the navigation utility
          // This handles environment-specific logic (dev vs prod) and platform URL mapping
          navigateTo(targetUrl);
        };
        break;

      case 'ACTION':
      default:
        // For ACTION and unknown flow types, start a process
        onClick = () => {
          startProcess({
            processName: flowItem.processName,
            domain: flowItem.domain,
            payload,
            builderType: flowItem.builderType === 'NATIVE_SCREEN' ? 'NATIVE_SCREEN' : 'LOWCODER'
          });
        };
        break;
    }
      
    return {
      key: id,
      label: flowName,
      onClick,
      // Additional properties for internal use
      processName: flowItem.processName,
      domain: flowItem.domain,
      category: flowItem.flowType,
      payload
    } as ActionOption;
  });
};