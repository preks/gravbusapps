import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface Country {
  id: string;
  name: string;
  code: string;
  value: string;
}

const GET_LEAD_COUNTRIES_QUERY = `
  query GetLeadCountries($where: LeadBoolExp, $limit: Int, $offset: Int) {
    Lead(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      id
      country {
        id
        code
        value
      }
    }
  }
`;

export const useGetCountries = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCountries = useCallback(async () => {
    if (!context.accessToken) {
      console.log("No access token available for countries");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with country search
      const whereCondition = {
        isDeleted: { _eq: false },
        country: {
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
        GET_LEAD_COUNTRIES_QUERY,
        variables
      );

      if (result?.Lead) {
        // Process and deduplicate countries
        const countryMap = new Map<string, any>();
        
        result.Lead.forEach((lead: any) => {
          if (lead.country && lead.country.id) {
            const countryName = lead.country.value || lead.country.code;
            
            // Use country ID as key for deduplication
            if (!countryMap.has(lead.country.id) && countryName) {
              countryMap.set(lead.country.id, {
                id: lead.country.id,
                name: countryName,
                code: lead.country.code,
                value: lead.country.value,
              });
            }
          }
        });

        // Convert map to array and sort alphabetically
        const countriesList = Array.from(countryMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 20); // Reasonable limit for dropdown performance

        setCountries(countriesList);
      } else {
        setCountries([]);
      }
    } catch (err) {
      console.error("Error fetching countries:", err);
      setError(err);
      setCountries([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset]);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return {
    countries,
    isLoading,
    error,
    refetch: fetchCountries,
  };
}; 