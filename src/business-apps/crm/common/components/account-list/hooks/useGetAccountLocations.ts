import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface LocationOption {
  id: string;
  name: string;
  code?: string;
}

export interface UseGetAccountLocationsReturn {
  countryOptions: LocationOption[];
  regionOptions: LocationOption[];
  cityOptions: LocationOption[];
  isLoading: boolean;
  error: Error | null;
}

const GET_ACCOUNT_LOCATIONS_QUERY = `
  query GetAccountLocations($search: String) {
    # Get unique countries from addresses
    countries: CrmAddress(
      where: {
        account: { isDeleted: { _eq: false } }
        country: { 
          value: { _ilike: $search }
          _and: [{ value: { _isNull: false } }, { value: { _neq: "" } }]
        }
      }
              distinctOn: [countryRef]
      limit: 100
    ) {
      country {
        id
        value
        code
      }
    }
    
    # Get unique regions from addresses
    regions: CrmAddress(
      where: {
        account: { isDeleted: { _eq: false } }
        region: { 
          value: { _ilike: $search }
          _and: [{ value: { _isNull: false } }, { value: { _neq: "" } }]
        }
      }
              distinctOn: [regionRef]
      limit: 100
    ) {
      region {
        id
        value
        code
      }
    }
    
    # Get unique cities from addresses
    cities: CrmAddress(
      where: {
        account: { isDeleted: { _eq: false } }
        city: { _ilike: $search }
        _and: [{ city: { _isNull: false } }, { city: { _neq: "" } }]
      }
              distinctOn: [city]
      limit: 100
    ) {
      city
    }
  }
`;

export const useGetAccountLocations = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetAccountLocationsReturn => {
  const [countryOptions, setCountryOptions] = useState<LocationOption[]>([]);
  const [regionOptions, setRegionOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchAccountLocations = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchPattern = search ? `%${search}%` : "%";
      const result = await graphqlClient.request(GET_ACCOUNT_LOCATIONS_QUERY, {
        search: searchPattern,
      });

      // Process countries
      if (result?.countries) {
        const countries = result.countries
          .filter((item: any) => item.country?.value)
          .map((item: any) => ({
            id: item.country.id,
            name: item.country.value,
            code: item.country.code || "",
          }))
          .sort((a: LocationOption, b: LocationOption) => a.name.localeCompare(b.name));
        setCountryOptions(countries);
      } else {
        setCountryOptions([]);
      }

      // Process regions
      if (result?.regions) {
        const regions = result.regions
          .filter((item: any) => item.region?.value)
          .map((item: any) => ({
            id: item.region.id,
            name: item.region.value,
            code: item.region.code || "",
          }))
          .sort((a: LocationOption, b: LocationOption) => a.name.localeCompare(b.name));
        setRegionOptions(regions);
      } else {
        setRegionOptions([]);
      }

      // Process cities
      if (result?.cities) {
        const cities = result.cities
          .filter((item: any) => item.city)
          .map((item: any, index: number) => ({
            id: `city-${item.city}-${index}`, // Create unique ID since cities don't have IDs
            name: item.city,
          }))
          .sort((a: LocationOption, b: LocationOption) => a.name.localeCompare(b.name));
        setCityOptions(cities);
      } else {
        setCityOptions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch account locations"));
      console.error("Error fetching account locations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, graphqlClient]);

  useEffect(() => {
    fetchAccountLocations();
  }, [fetchAccountLocations]);

  return {
    countryOptions,
    regionOptions,
    cityOptions,
    isLoading,
    error,
  };
}; 