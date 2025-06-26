import { useState, useEffect } from 'react';
import { FlowItemReduced } from '../types/FlowRegistryTypes';
import { ActionOption } from '@newwork/gravity-ui-catalog';
import { startProcess } from '../utils/start-process';
import { useFlowRegistryClient } from '../network/flows/useFlowRegistryClient';

export interface ExternalContextData {
  [key: string]: any;
}

interface UseFlowItemsProps {
  mainContextsData: any;
  externalContextData: ExternalContextData;
  isFlowButtonOrigin?: boolean;
  accessToken?: string; // Add accessToken parameter
}

/**
 * Hook to fetch and process flow items from the flow registry
 */
export const useFlowItems = ({ mainContextsData, externalContextData, accessToken = '' }: UseFlowItemsProps) => {
  const [flowData, setFlowData] = useState<ActionOption[]>([]);
  const flowRegistry = useFlowRegistryClient(accessToken);

  useEffect(() => {
    const fetchFlowItems = async () => {
      if (!mainContextsData) return;

      try {
        const contexts = Object.entries(mainContextsData).map(([contextName, mainContextDataId]) => ({
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
      }
    };

    fetchFlowItems();
  }, [mainContextsData, externalContextData]);

  return { flowData };
};

/**
 * Maps flow items from the API response to ActionOption objects for the ActionButton component
 */
const mapFlowItemsToActionOptions = (
  flowItems: FlowItemReduced[],
  externalContextData: ExternalContextData
): ActionOption[] => {
  return flowItems.map((flowItem) => {
    // Extract data from context for payload
    const payload: Record<string, any> = {};
    
    // Handle single context object (API returns context, not contexts array)
    if (flowItem.context && flowItem.context.contextData && Array.isArray(flowItem.context.contextData) && flowItem.context.contextData.length > 0) {
      const context = flowItem.context;
      const contextData = context?.contextData?.[0];
      // Verify contextData exists and has required properties
      if (contextData && contextData.id && contextData.contextDataType && contextData.contextDataName) {
      
        payload[context.contextName] = {
          id: contextData.id,
          type: contextData.contextDataType,
          name: contextData.contextDataName
        };
      }
    }
    
    // Fallback to contexts array if present (for backwards compatibility)
    else if (flowItem.contexts && Array.isArray(flowItem.contexts)) {
      flowItem.contexts.forEach((context) => {
        if (context && context.contextData && context.contextData.length > 0) {
          const contextData = context.contextData[0];
          payload[context.contextName] = {
            id: contextData.id,
            type: contextData.contextDataType,
            name: contextData.contextDataName
          };
        }
      });
    }

    // Add external context data to payload
    if (externalContextData && typeof externalContextData === 'object') {
      Object.entries(externalContextData).forEach(([key, value]) => {
        payload[key] = value;
      });
    }

    // Create ActionOption with required properties
    const id = flowItem.id || '';
    const flowName = typeof flowItem.flowNameTranslation === 'string' ? 
      flowItem.flowNameTranslation : 
      flowItem.flowName;
      
    return {
      key: id,
      label: flowName,
      onClick: () => {
        startProcess({
          processName: flowItem.processName,
          domain: flowItem.domain,
          payload
        });
      },
      // Additional properties for internal use
      processName: flowItem.processName,
      domain: flowItem.domain,
      category: flowItem.flowType,
      payload
    } as ActionOption;
  });
};
