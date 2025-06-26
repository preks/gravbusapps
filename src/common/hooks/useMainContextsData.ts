import { useState, useEffect } from 'react';
import { notification } from '@newwork/gravity-ui-catalog';
import { useTranslation } from 'react-i18next';
import { FlowContextName } from '../types/FlowRegistryTypes';
import { useFlowRegistryClient } from '../network/flows/useFlowRegistryClient';

/**
 * Hook to fetch main context data from the flow registry
 * @param contexts - List of context names to fetch data for
 * @param accessToken - Access token for authentication
 */
export const useMainContextsData = (contexts: FlowContextName[], accessToken: string) => {
  const [mainContextsData, setMainContextsData] = useState<Record<string, string> | undefined>();
  const { t } = useTranslation();
  const flowRegistry = useFlowRegistryClient(accessToken);

  useEffect(() => {
    if (contexts.length === 0) return;

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

    const fetchData = async () => {
      const data = await getAllMainContextsData(contexts);
      data && setMainContextsData(data);
    };

    fetchData();
  }, [contexts]);

  return { mainContextsData };
};
