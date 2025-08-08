import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface OpportunityOwner {
  id: string;
  name: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

const GET_OPPORTUNITY_OWNERS_QUERY = `
  query GetOpportunityOwners($where: OpportunityBoolExp, $limit: Int, $offset: Int) {
    Opportunity(
      where: $where,
      distinctOn: [ownerEmployeeId],
      limit: $limit,
      offset: $offset
    ) {
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`;

export const useGetOpportunityOwners = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [opportunityOwners, setOpportunityOwners] = useState<OpportunityOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchOpportunityOwners = useCallback(async () => {
    if (!context.accessToken) {
      console.log("No access token available for opportunity owners");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with employee search
      const whereCondition = {
        isDeleted: { _eq: false },
        ownerEmployee: {
          _and: [
            { id: { _isNull: false } },
            ...(search.trim()
              ? [
                  {
                    _or: [
                      { firstName: { _ilike: `%${search}%` } },
                      { lastName: { _ilike: `%${search}%` } },
                      { displayName: { _ilike: `%${search}%` } },
                    ],
                  },
                ]
              : []),
          ],
        },
      };

      const variables = {
        where: whereCondition,
        limit: 5, // Limit to 5 items as per other filters
        offset,
      };

      const result = await graphqlClient.request(
        GET_OPPORTUNITY_OWNERS_QUERY,
        variables
      );

      if (result?.Opportunity) {
        const owners = result.Opportunity.filter((opportunity: any) => opportunity.ownerEmployee) // Ensure ownerEmployee exists
          .map((opportunity: any) => ({
            id: opportunity.ownerEmployee.id,
            name:
              opportunity.ownerEmployee.displayName ||
              `${opportunity.ownerEmployee.firstName || ""} ${
                opportunity.ownerEmployee.lastName || ""
              }`.trim(),
            displayName: opportunity.ownerEmployee.displayName,
            firstName: opportunity.ownerEmployee.firstName,
            lastName: opportunity.ownerEmployee.lastName,
          }))
          .slice(0, 5); // Frontend enforcement of limit

        setOpportunityOwners(owners);
      } else {
        setOpportunityOwners([]);
      }
    } catch (err) {
      console.error("Error fetching opportunity owners:", err);
      setError(err);
      setOpportunityOwners([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset, graphqlClient]);

  useEffect(() => {
    fetchOpportunityOwners();
  }, [fetchOpportunityOwners]);

  return {
    opportunityOwners,
    isLoading,
    error,
    refetch: fetchOpportunityOwners,
  };
}; 