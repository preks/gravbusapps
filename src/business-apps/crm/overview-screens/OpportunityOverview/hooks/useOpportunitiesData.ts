import { useState, useEffect } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getOpportunitiesQuery } from '../queries';

export interface OpportunityData {
  name: string;
  account: {
    name: string;
    website: string | null;
  };
  currencyRef: string;
  currency: {
    value: string;
  };
  estimatedAmount: number;
  winningChance: number;
  salesPipeline: {
    value: string;
  };
  salesPipelineStage: {
    value: string;
  };
  ownerEmployee: {
    displayName: string;
  };
}

export interface OpportunitiesQueryResponse {
  Opportunity: OpportunityData[];
  OpportunityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const useOpportunitiesData = (accessToken: string) => {
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // Default limit of 20 per project guidelines
  const [searchTerm, setSearchTerm] = useState('');

  const graphQLClient = useGraphqlClient(accessToken);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const variables = {
        offset,
        limit: pageSize,
      };
      
      // Optional: Add filter variables for search
      // if (searchTerm) {
      //   variables.filter = { name: { contains: searchTerm } };
      // }

      const response = await graphQLClient.request<OpportunitiesQueryResponse>(
        getOpportunitiesQuery,
        variables
      );

      if (response?.Opportunity) {
        setOpportunities(response.Opportunity);
        
        // Use the actual total count from the aggregate query
        if (response.OpportunityAggregate?.aggregate?.count !== undefined) {
          setTotalCount(response.OpportunityAggregate.aggregate.count);
        } else {
          // Fallback in case aggregate count is not available
          setTotalCount(response.Opportunity.length + offset);
        }
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Fetch opportunities when dependencies change
  useEffect(() => {
    fetchOpportunities();
  }, [accessToken, currentPage, pageSize, searchTerm]);

  return {
    opportunities,
    loading,
    totalCount,
    currentPage,
    pageSize,
    searchTerm,
    handlePageChange,
    handleSearch,
    refetch: fetchOpportunities
  };
};

export default useOpportunitiesData;
