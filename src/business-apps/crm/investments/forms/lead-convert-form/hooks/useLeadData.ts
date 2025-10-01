import { useState, useEffect, useMemo } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_INVESTMENT_LEAD_PREFILL_DATA } from '../queries/leadQueries';

export const useLeadData = (accessToken: string, additionalData: any) => {
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Extract InvestmentLead ID from additionalData following investment form patterns
  const platformParams = useMemo(() => {
    // Following TaskForm pattern - check nested process payloads
    const nested = (additionalData as any)?.psi_taskPayload?.psi_initialParameters || 
                   (additionalData as any)?.psi_initialParameters || 
                   {};
    
    // AppActionButton passes leadId via externalContextData (from investment lead table)
    const externalContext = (additionalData as any)?.externalContextData || {};
    
    return {
      // Primary source: externalContextData from AppActionButton
      externalLeadId: externalContext?.leadId,
      // Alternative sources following TaskForm pattern
      leadId: (additionalData as any)?.leadId || nested?.leadId,
      entityId: (additionalData as any)?.entityId || nested?.entityId,
      recordId: (additionalData as any)?.recordId || nested?.recordId,
      id: (additionalData as any)?.id || nested?.id,
      investmentLeadId: (additionalData as any)?.investmentLeadId || nested?.investmentLeadId,
    };
  }, [additionalData]);
  
  // InvestmentLead ID extraction priority: externalContextData first (from AppActionButton)
  const actualLeadId = platformParams.externalLeadId ||  // From AppActionButton
                       platformParams.leadId || 
                       platformParams.entityId || 
                       platformParams.recordId || 
                       platformParams.id || 
                       platformParams.investmentLeadId;
  

  // Initialize GraphQL client
  const graphQLClient = useGraphQLClient(accessToken);

  // Load lead data from GraphQL
  useEffect(() => {
    const loadLeadData = async () => {
      if (!actualLeadId || !accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const response = await graphQLClient.request(GET_INVESTMENT_LEAD_PREFILL_DATA, {
          leadId: actualLeadId
        });
        
        const leadData = response?.InvestmentLead?.[0];
        if (leadData) {
          setLeadData(leadData);
        } else {
          setLeadData(null);
        }
      } catch (error) {
        setLeadData(null);
      } finally {
        setLoading(false);
      }
    };

    loadLeadData();
  }, [actualLeadId, accessToken, graphQLClient]);

  return {
    leadData,
    loading,
    actualLeadId,
    platformParams
  };
};
