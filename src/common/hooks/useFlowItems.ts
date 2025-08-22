import { useState, useEffect, useCallback } from 'react';
import { FlowItemReduced } from '../types/FlowRegistryTypes';
import { ActionOption } from '@newwork/gravity-ui-catalog';
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
  const flowRegistry = useFlowRegistryClient(accessToken);

  // Function that can be called manually to fetch flow items
  // Optional directContextData parameter allows passing context data directly without relying on state
  const fetchFlowItems = useCallback(async (directContextData?: Record<string, string>) => {
    const contextData = directContextData || mainContextsData;
    if (!contextData) return;
    
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
      }
    } catch (error) {
      console.error('Error fetching flow items:', error);
      setFlowData([]);
    } finally {
      setIsLoading(false);
    }
  }, [mainContextsData, externalContextData, flowRegistry]);

  // Only automatically fetch flow items if not in manual mode
  useEffect(() => {
    if (!manualFetch) {
      fetchFlowItems();
    }
  }, [fetchFlowItems, manualFetch]);

  return { flowData, fetchFlowItems, isLoading };
};

/**
 * Maps flow items from the API response to ActionOption objects for the ActionButton component
 */
const mapFlowItemsToActionOptions = (
  flowItems: FlowItemReduced[],
  externalContextData: ExternalContextData
): ActionOption[] => {
  return flowItems.map((flowItem) => {
    // Create payload directly from externalContextData
    // The context.contextData from the API is just metadata about what context is expected
    const payload: Record<string, any> = { ...externalContextData };
    
    // Create ActionOption with required properties
    const id = flowItem.id || '';
    const flowName = typeof flowItem.flowNameTranslation === 'string' ? 
      flowItem.flowNameTranslation : 
      flowItem.flowName;
      
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