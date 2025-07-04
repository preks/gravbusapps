import { useState, useEffect } from 'react';
import { notification } from '@newwork/gravity-ui-catalog';
import { useTranslation } from 'react-i18next';
import { FlowContextName } from '../types/FlowRegistryTypes';
import { useFlowRegistryClient } from '../network/flows/useFlowRegistryClient';

/**
 * Hook to fetch main context data from the flow registry
 * @param contexts - List of context names to fetch data for
 * @param accessToken - Access token for authentication
 * @param manualMode - When true, data will not be fetched automatically on mount
 */
export const useMainContextsData = (contexts: FlowContextName[], accessToken: string, manualMode: boolean = false) => {
  const [mainContextsData, setMainContextsData] = useState<Record<string, string> | undefined>();
  const [isLoading, setIsLoading] = useState(!manualMode);
  const { t } = useTranslation();
  const flowRegistry = useFlowRegistryClient(accessToken);

  // Function to fetch context data that can be called manually
  const fetchMainContextsData = async () => {
    if (contexts.length === 0) return null;
    
    setIsLoading(true);
    try {
      const data = await getAllMainContextsData(contexts);
      if (data) {
        setMainContextsData(data);
        return data; // Return the data directly
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getAllMainContextsData = async (contextsToFetch: FlowContextName[]) => {
      try {
        const mainContexts = await flowRegistry.getMainContextData({
          contextNames: contextsToFetch
        });
        
        if (mainContexts?.contextData) {
          // Transform the response into a map of contextName -> mainContextDataName
          const contextMap: Record<string, string> = {};
          mainContexts.contextData.forEach((item: { contextName: string; mainContextDataName: string }) => {
            contextMap[item.contextName] = item.mainContextDataName;
          });
          return contextMap;
        }
      } catch (error) {
        notification.error({
          message: t('common:error'),
          description: t('common:error_loading_data'),
        });
        console.error('Error fetching main contexts data:', error);
      }
      return {};
    };

  // Only automatically fetch data if not in manual mode
  useEffect(() => {
    if (!manualMode) {
      fetchMainContextsData();
    }
  }, [contexts, manualMode]);

  return { mainContextsData, fetchMainContextsData, isLoading };
};
