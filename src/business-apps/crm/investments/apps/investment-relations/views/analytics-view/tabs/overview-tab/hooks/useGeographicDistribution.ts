import { useState, useEffect } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface GeographicData {
  country: string;
  accounts: number;
  opportunities: number;
  totalValue: number;
  wonValue: number;
}

export const useGeographicDistribution = (accessToken: string) => {
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchGeographicDistribution = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const query = `
          query GetGeographicDistribution {
            # Get all accounts for geographic analysis
            accounts: InvestmentAccount(
              where: {
                isDeleted: {_eq: false}, investmentAddress: {country: {value: {_isNull: false}}, _or: {countryRef: {_isNull: false}}}
              }
            ) {
              id
              name
              countryRef
              addressLine
              investmentAddress {
                country {
                  id
                  value
                }
                city
                addressLine
              }
            }
          }
        `;

        const result = await graphqlClient.request(query);
        // Process account data by country
        const countryMap = new Map<string, GeographicData>();

        result.accounts.forEach((account: any) => {
          let country = null;

          // First try direct country reference
          if (account.countryRef) {
            country = account.countryRef;
          }
          // Try to get country from addresses
          else {
            const addressWithCountry = account.investmentAddress?.find(
              (addr: any) => addr.country?.value
            );
            if (addressWithCountry) {
              country = addressWithCountry.country.value;
            }
          }

          if (country) {
            if (!countryMap.has(country)) {
              countryMap.set(country, {
                country,
                accounts: 0,
                opportunities: 0, // Will be 0 since we're only counting accounts
                totalValue: 0, // Will be 0 since we're only counting accounts
                wonValue: 0, // Will be 0 since we're only counting accounts
              });
            }
            countryMap.get(country)!.accounts++;
          }
        });

        // Convert to array and sort by account count
        const geographicArray = Array.from(countryMap.values())
          .sort((a, b) => b.accounts - a.accounts)
          .slice(0, 10); // Top 10 countries

        setGeographicData(geographicArray);
      } catch (err) {
        // console.error("Error fetching geographic distribution:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchGeographicDistribution();
    }
  }, [accessToken, graphqlClient]);

  return { geographicData, isLoading, error };
};
