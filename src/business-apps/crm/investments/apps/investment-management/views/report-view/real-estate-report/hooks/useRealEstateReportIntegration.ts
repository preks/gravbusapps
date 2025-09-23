import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import type { 
  RealEstateReportFilters, 
  EnhancedRealEstateInvestment,
  RealEstateInvestmentResponse
} from '../types/realEstateReportTypes';
import { 
  GET_REAL_ESTATE_INVESTMENTS_BY_TYPE 
} from '../queries/realEstateReportQueries';
import { 
  toEnhancedRealEstateInvestmentList 
} from '../mappers/realEstateReportMappers';

interface UseRealEstateReportIntegrationProps {
  accessToken: string;
  userInfo: any;
  filters: RealEstateReportFilters;
}

interface UseRealEstateReportIntegrationReturn {
  data: EnhancedRealEstateInvestment[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

export const useRealEstateReportIntegration = ({
  accessToken,
  userInfo,
  filters
}: UseRealEstateReportIntegrationProps): UseRealEstateReportIntegrationReturn => {
  const graphqlClient = useGraphQLClient(accessToken);
  
  const [data, setData] = useState<EnhancedRealEstateInvestment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Load real estate investment data using enhanced GraphQL query
  const loadRealEstateData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Build the GraphQL query based on filters
      const query = filters.investmentType 
        ? GET_REAL_ESTATE_INVESTMENTS_BY_TYPE(filters.investmentType, filters)
        : GET_REAL_ESTATE_INVESTMENTS_BY_TYPE('', filters); // Get all types if no specific type

      const response = await graphqlClient.request<RealEstateInvestmentResponse>(query);

      const investments = response.Investment || [];
      
      // Transform raw GraphQL data to enhanced UI-ready format
      const enhancedInvestments = toEnhancedRealEstateInvestmentList(investments);

      // Filter by investment type at JavaScript level if needed (for more flexible filtering)
      let filteredInvestments = enhancedInvestments;
      if (filters.investmentType) {
        filteredInvestments = enhancedInvestments.filter(investment => 
          investment.investmentType?.value === filters.investmentType
        );
      }

      setData(filteredInvestments);
      setTotalCount(response.InvestmentAggregate?.aggregate?.count || filteredInvestments.length);

    } catch (err) {
      console.error('Error loading real estate report data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error Loading Real Estate Data: ${errorMessage}`);
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, filters]);

  // Load data when dependencies change
  useEffect(() => {
    if (accessToken && userInfo) {
      loadRealEstateData();
    }
  }, [accessToken, userInfo, loadRealEstateData]);

  // Refetch function
  const refetch = useCallback(() => {
    loadRealEstateData();
  }, [loadRealEstateData]);

  return {
    data,
    loading,
    error,
    totalCount,
    refetch,
  };
};

// Specific hooks for each investment type

export const useExistingPropertiesData = (props: UseRealEstateReportIntegrationProps) => {
  const enhancedFilters = { 
    ...props.filters, 
    investmentType: 'Existing Properties' 
  };
  return useRealEstateReportIntegration({ ...props, filters: enhancedFilters });
};

export const useProjectDevelopmentData = (props: UseRealEstateReportIntegrationProps) => {
  const enhancedFilters = { 
    ...props.filters, 
    investmentType: 'Project Development' 
  };
  return useRealEstateReportIntegration({ ...props, filters: enhancedFilters });
};

export const useMezzanineLoansData = (props: UseRealEstateReportIntegrationProps) => {
  const enhancedFilters = { 
    ...props.filters, 
    investmentType: 'Mezzanine Loans' 
  };
  return useRealEstateReportIntegration({ ...props, filters: enhancedFilters });
};

export const useOthersData = (props: UseRealEstateReportIntegrationProps) => {
  const enhancedFilters = { 
    ...props.filters, 
    investmentType: 'Others' 
  };
  return useRealEstateReportIntegration({ ...props, filters: enhancedFilters });
};
