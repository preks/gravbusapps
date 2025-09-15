import { useState, useEffect } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useGetInvestmentOpportunityById } from '@/common/data/investment/hooks/useInvestmentOpportunities';
import type { InvestmentOpportunity } from '@/common/data/investment/types';

export interface ReferenceData {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
}

export interface Opportunity {
  id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  statusRef: string;
  stage: string;
  stageRef: string;
  value: number;
  currency: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  currencyRef: string;
  probability: number;
  expectedCloseDate: string;
  actualCloseDate: string;
  source: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  sourceRef: string;
  priority: {
    id: string;
    type: string;
    value: string;
    code: string;
  };
  priorityRef: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  };
  ownerOrganization: {
    name: string;
  };
  accountId: string;
  account: {
    id: string;
    version: string;
    name: string;
    industryRef: string;
    industry: {
      code: string;
      id: string;
      type: string;
      value: string;
    };
    numberOfEmployees: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    numberOfEmployeesRef: string;
    addressLine: string;
    foundationDate: string;
    annualRevenueRef: string;
    annualRevenue: {
      type: string;
      value: string;
      id: string;
      code: string;
    };
    website: string;
    ownerEmployeeId: string;
    ownerEmployee?: {
      firstName: string;
      lastName: string;
    };
  } | null;
  contact: {
    id: string;
    version: string;
    email: string;
    name: string;
    phone: string;
    pictureUrl: string;
    jobTitle: string;
  };
  leadId: string;
  lead?: {
    id: string;
    name: string;
    status: string;
  };
  activities: any[];
  tasks: any[];
  competitors: any[];
  products: any[];
  aiSummary: {
    text: string;
    insights: string[];
    recommendations: string[];
  };
}

export const useOpportunityData = (opportunityId: string, accessToken: string) => {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [opportunityData, setOpportunityData] = useState<InvestmentOpportunity | null>(null);
  const [stageConditionStatuses, setStageConditionStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunityStatuses, setOpportunityStatuses] = useState<ReferenceData[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<ReferenceData[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);

  const { fetchInvestmentOpportunityById } = useGetInvestmentOpportunityById({ accessToken });
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchOpportunityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchInvestmentOpportunityById(opportunityId);
      
      if (result && result.opportunity) {
        const rawOpportunityData = result.opportunity;
        setOpportunityData(rawOpportunityData);
        
        // Transform InvestmentOpportunity data to legacy Opportunity interface
        const transformedOpportunity: Opportunity = {
          id: rawOpportunityData.id,
          name: rawOpportunityData.name || 'Unknown Investment Opportunity',
          description: rawOpportunityData.notesSummary || '',
          version: rawOpportunityData.version?.toString() || '1',
          status: rawOpportunityData.opportunityStatus?.value || 'Open',
          statusRef: rawOpportunityData.opportunityStatus?.id || '',
          stage: rawOpportunityData.opportunityPipelineStage?.value || 'Discovery',
          stageRef: rawOpportunityData.opportunityPipelineStage?.id || '',
          value: rawOpportunityData.estimatedAmount || 0,
          currency: {
            id: rawOpportunityData.currency?.id || 'EUR',
            type: 'currency',
            value: rawOpportunityData.currency?.value || 'EUR',
            code: rawOpportunityData.currency?.code || 'EUR'
          },
          currencyRef: rawOpportunityData.currency?.id || '',
          probability: 0, // Not available in investment opportunity
          expectedCloseDate: rawOpportunityData.closeDate || '',
          actualCloseDate: rawOpportunityData.closeDate || '',
          source: {
            id: 'unknown',
            type: 'opportunitySource',
            value: 'Unknown',
            code: 'unknown'
          },
          sourceRef: '',
          priority: {
            id: 'medium',
            type: 'priority',
            value: 'Medium',
            code: 'medium'
          },
          priorityRef: '',
          ownerEmployeeId: rawOpportunityData.ownerEmployee?.id || '',
          ownerEmployee: {
            firstName: rawOpportunityData.ownerEmployee?.firstName || '',
            lastName: rawOpportunityData.ownerEmployee?.lastName || ''
          },
          ownerOrganization: {
            name: ''
          },
          accountId: rawOpportunityData.account?.id || '',
          account: rawOpportunityData.account ? {
            id: rawOpportunityData.account.id,
            version: '1',
            name: rawOpportunityData.account.name || '',
            industryRef: '',
            industry: {
              code: '',
              id: '',
              type: 'industry',
              value: ''
            },
            numberOfEmployees: {
              type: 'numberOfEmployees',
              value: '',
              id: '',
              code: ''
            },
            numberOfEmployeesRef: '',
            addressLine: '',
            foundationDate: '',
            annualRevenueRef: '',
            annualRevenue: {
              type: 'annualRevenue',
              value: '',
              id: '',
              code: ''
            },
            website: '',
            ownerEmployeeId: '',
            ownerEmployee: undefined
          } : null,
          contact: {
            id: '',
            version: '1',
            email: '',
            name: 'No Contact Available',
            phone: '',
            pictureUrl: '',
            jobTitle: ''
          },
          leadId: '',
          lead: undefined,
          activities: [],
          tasks: [],
          competitors: [],
          products: [],
          aiSummary: {
            text: "",
            insights: [],
            recommendations: []
          }
        };

        // Pull stage conditions directly from the opportunity payload
        const sc = (rawOpportunityData as any)?.opportunityStageConditions || [];
        setStageConditionStatuses(sc);

        setOpportunity(transformedOpportunity);
      } else {
        setError('Investment Opportunity not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch investment opportunity data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunityStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'InvestmentOpportunityStatus', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      );
      
      if (response && response.data) {
        const statusData = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
        }));
        setOpportunityStatuses(statusData);
      }
    } catch (err) {
      console.error('Error fetching investment opportunity statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const fetchOpportunityStages = async () => {
    try {
      setLoadingStages(true);
      if (opportunityData?.opportunityPipeline?.childEntries?.length) {
        const sorted = [...(opportunityData.opportunityPipeline.childEntries as any[])]
          .sort((a: any, b: any) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0));
        const stageData: ReferenceData[] = sorted.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
        }));
        setOpportunityStages(stageData);
        return;
      }
      setOpportunityStages([]);
    } catch (err) {
      console.error('Error mapping investment opportunity pipeline stages:', err);
      setStagesError(err instanceof Error ? err.message : 'Failed to fetch stages');
      setOpportunityStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  useEffect(() => {
    if (opportunityId && accessToken) {
      fetchOpportunityData();
      fetchOpportunityStatuses();
    }
  }, [opportunityId, accessToken]);

  // Refresh stages once opportunityData is available (contains pipeline childEntries)
  useEffect(() => {
    if (opportunityData) {
      fetchOpportunityStages();
    }
  }, [opportunityData]);

  const refetchOpportunityData = async () => {
    await fetchOpportunityData();
  };

  return {
    opportunity,
    opportunityData,
    stageConditionStatuses,
    loading,
    error,
    opportunityStages,
    opportunityStatuses,
    loadingStages,
    loadingStatuses,
    stagesError,
    refetchOpportunityData
  };
};