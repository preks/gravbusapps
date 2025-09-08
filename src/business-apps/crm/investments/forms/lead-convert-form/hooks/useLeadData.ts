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
  
  // Debug InvestmentLead ID extraction
  console.log('🔍 ConvertInvestmentLeadForm - Investment Lead ID Investigation:', {
    additionalData: additionalData,
    additionalDataKeys: additionalData ? Object.keys(additionalData) : 'null',
    platformParams: platformParams,
    calculatedActualLeadId: actualLeadId,
    hasInvestmentLeadId: !!actualLeadId,
    // PRIMARY SOURCE: AppActionButton externalContextData
    externalContextData: (additionalData as any)?.externalContextData,
    externalLeadId: platformParams.externalLeadId,
    // Check for nested payloads
    hasNestedTaskPayload: !!(additionalData as any)?.psi_taskPayload,
    hasNestedInitialParams: !!(additionalData as any)?.psi_initialParameters,
    nestedTaskPayload: (additionalData as any)?.psi_taskPayload,
    nestedInitialParams: (additionalData as any)?.psi_initialParameters,
    note: 'InvestmentLead ID should come from externalContextData.leadId (AppActionButton) or additionalData'
  });

  // Initialize GraphQL client
  const graphQLClient = useGraphQLClient(accessToken);

  // Load lead data from GraphQL
  useEffect(() => {
    const loadLeadData = async () => {
      if (!actualLeadId || !accessToken) {
        console.log('⚠️ Missing required data for lead loading:', { actualLeadId, hasAccessToken: !!accessToken });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Loading lead data for ID:', actualLeadId);
        console.log('🔍 GraphQL Query:', GET_INVESTMENT_LEAD_PREFILL_DATA);
        console.log('🔍 Query Variables:', { leadId: actualLeadId });
        
        const response = await graphQLClient.request(GET_INVESTMENT_LEAD_PREFILL_DATA, {
          leadId: actualLeadId
        });
        
        console.log('🔍 Full GraphQL Response:', response);
        
        const leadData = response?.InvestmentLead?.[0];
        if (leadData) {
          console.log('✅ Lead data loaded successfully:', leadData);
          console.log('🔍 Lead data keys:', Object.keys(leadData));
          setLeadData(leadData);
        } else {
          console.warn('⚠️ No lead data found for ID:', actualLeadId);
          console.warn('⚠️ Response structure:', response);
          setLeadData(null);
        }
      } catch (error) {
        console.error('❌ Error loading lead data:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          leadId: actualLeadId
        });
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
