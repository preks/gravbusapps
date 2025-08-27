import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface City {
  id: string;
  name: string;
}

const GET_LEAD_CITIES_QUERY = `
  query GetLeadCities($where: LeadBoolExp, $limit: Int, $offset: Int) {
    Lead(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      id
      city
    }
  }
`;

export const useGetCities = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCities = useCallback(async () => {
    if (!context.accessToken) {
      console.log("No access token available for cities");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with city search
      const whereCondition = {
        isDeleted: { _eq: false },
        _and: [
          { city: { _isNull: false } },
          { city: { _neq: "" } },
          ...(search.trim()
            ? [
                {
                  city: { _ilike: `%${search}%` },
                },
              ]
            : []),
        ],
      };

      const variables = {
        where: whereCondition,
        limit: 50,
        offset,
      };

      const result = await graphqlClient.request(
        GET_LEAD_CITIES_QUERY,
        variables
      );

      if (result?.Lead) {
        // Process and deduplicate cities
        const cityMap = new Map<string, any>();
        
        result.Lead.forEach((lead: any) => {
          if (lead.city && lead.city.trim()) {
            const cityName = lead.city.trim();
            
            // Use city name as both key and ID for filtering
            if (!cityMap.has(cityName)) {
              cityMap.set(cityName, {
                id: cityName,
                name: cityName,
              });
            }
          }
        });

        // Convert map to array and sort alphabetically
        const citiesList = Array.from(cityMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 20); // Reasonable limit for dropdown performance

        setCities(citiesList);
      } else {
        setCities([]);
      }
    } catch (err) {
      console.error("Error fetching cities:", err);
      setError(err);
      setCities([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  return {
    cities,
    isLoading,
    error,
    refetch: fetchCities,
  };
}; 