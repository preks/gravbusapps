import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface Region {
  id: string;
  name: string;
  code: string;
  value: string;
}

const GET_LEAD_REGIONS_QUERY = `
  query GetLeadRegions($where: LeadBoolExp, $limit: Int, $offset: Int) {
    Lead(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      id
      region {
        id
        code
        value
      }
    }
  }
`;

export const useGetRegions = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchRegions = useCallback(async () => {
    if (!context.accessToken) {
      console.log("No access token available for regions");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with region search - region is a CatalogEntry
      const whereCondition = {
        isDeleted: { _eq: false },
        region: {
          _and: [
            { id: { _isNull: false } },
            ...(search.trim()
              ? [
                  {
                    _or: [
                      { value: { _ilike: `%${search}%` } },
                      { code: { _ilike: `%${search}%` } },
                    ],
                  },
                ]
              : []),
          ],
        },
      };

      const variables = {
        where: whereCondition,
        limit: 50,
        offset,
      };

      const result = await graphqlClient.request(
        GET_LEAD_REGIONS_QUERY,
        variables
      );

      if (result?.Lead) {
        // Process and deduplicate regions
        const regionMap = new Map<string, any>();
        
        result.Lead.forEach((lead: any) => {
          if (lead.region && lead.region.id) {
            const regionName = lead.region.value || lead.region.code;
            
            // Use region ID as key for deduplication
            if (!regionMap.has(lead.region.id) && regionName) {
              regionMap.set(lead.region.id, {
                id: lead.region.id,
                name: regionName,
                code: lead.region.code,
                value: lead.region.value,
              });
            }
          }
        });

        // Convert map to array and sort alphabetically
        const regionsList = Array.from(regionMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 20); // Reasonable limit for dropdown performance

        setRegions(regionsList);
      } else {
        setRegions([]);
      }
    } catch (err) {
      console.error("Error fetching regions:", err);
      setError(err);
      setRegions([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    isLoading,
    error,
    refetch: fetchRegions,
  };
}; 