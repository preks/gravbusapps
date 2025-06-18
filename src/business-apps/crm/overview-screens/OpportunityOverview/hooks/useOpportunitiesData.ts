import { useState, useEffect } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { getOpportunitiesQuery, deleteOpportunityMutation } from '../queries';

export interface OpportunityData {
  id: string;
  version?: number;
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

  // Function to delete an opportunity
  const deleteOpportunity = async (id: string) => {
    console.log('Delete function called with ID:', id);
    
    if (!id) {
      console.error('Cannot delete opportunity: ID is missing');
      return { 
        success: false, 
        error: 'Opportunity ID is missing' 
      };
    }
    
    setLoading(true);
    try {
      // Create the variables object for the GraphQL mutation
      const variables = { id };
      console.log('Deleting opportunity with variables:', variables);
      
      // Execute the GraphQL mutation
      const response = await graphQLClient.request(
        deleteOpportunityMutation,
        variables
      );
      
      console.log('Delete response:', response);
      
      // Refresh opportunities list after deletion
      await fetchOpportunities();
      return { success: true };
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      
      // If it's a GraphQL error, try to extract more specific details
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if it contains a GraphQL errors array
        const match = errorMessage.match(/\[.*\]/s);
        if (match) {
          try {
            const parsedErrors = JSON.parse(match[0]);
            if (Array.isArray(parsedErrors) && parsedErrors.length > 0) {
              errorMessage = parsedErrors[0].message || errorMessage;
            }
          } catch (e) {
            console.error('Error parsing GraphQL error message:', e);
          }
        }
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    opportunities,
    loading,
    totalCount,
    currentPage,
    pageSize,
    searchTerm,
    handlePageChange,
    handleSearch,
    deleteOpportunity,
    refetch: fetchOpportunities
  };
};

export default useOpportunitiesData;
