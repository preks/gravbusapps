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
  stage:string;
  ownerEmployee: {
    displayName:string;
  };
  createdAt: string;
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
  // Track the current orderBy condition
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);

  const graphQLClient = useGraphqlClient(accessToken);

  // Modified to accept optional orderBy parameter
  const fetchOpportunities = async (orderByValue?: string) => {
    // Update the orderBy state if a value is provided
    if (orderByValue !== undefined) {
      setOrderBy(orderByValue);
    }

    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const variables: any = {
        offset,
        limit: pageSize,
        orderBy: [{ createdAt: "DESC_NULLS_LAST" }]
      };
      
      if (orderByValue || orderBy) {
        try {
          const orderByString = orderByValue || orderBy;
          const orderByObject = JSON.parse(orderByString || '{}');
          
          variables.orderBy = [orderByObject];
          
        } catch (error) {
          console.error('Error parsing orderBy JSON:', error);
        }
      }
      
      if (searchTerm) {
        // Check if searchTerm is a number
        const isNumber = !isNaN(Number(searchTerm));
        
        const searchConditions = [
          { name: { _iregex: searchTerm } },
          { "account": { "name": { _iregex: searchTerm } } },
          { "ownerEmployee": { "displayName": { _iregex: searchTerm } } }
        ];
        
        // Add number-specific conditions if the search term can be parsed as a number
        if (isNumber) {
          const numericValue = Number(searchTerm);
          searchConditions.push({ "estimatedAmount": { _eq: numericValue } });
          searchConditions.push({ "winningChance": { _eq: numericValue } });
        }
        
        variables.where = { 
          _or: searchConditions
        };
      }

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
      // Execute the GraphQL mutation
      const response = await graphQLClient.request(
        deleteOpportunityMutation,
        variables
      );
      
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
