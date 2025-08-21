import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface CountryRegionCatalogEntry {
  value: string;
  id: string;
  code: string;
  alternativeCode?: string;
  additionalValue2?: string;
  translations: Array<{
    value: string;
  }>;
}

export interface CountriesAndRegionsResponse {
  countries: CountryRegionCatalogEntry[];
  regions: CountryRegionCatalogEntry[];
}

export interface CountryDetails {
  value: string;
  id: string;
  code: string;
  displayValue: string;
}

export interface RegionDetails {
  value: string;
  id: string;
  code: string;
  alternativeCode?: string;
  additionalValue2?: string;
  displayValue: string;
  type: "state" | "region" | "county";
}

export interface FullCountryDetails {
  country: CountryDetails;
  states?: RegionDetails[];
  regions?: RegionDetails[];
  counties?: RegionDetails[];
}

// Constants for region country codes
export const STATE_COUNTRY_CODE = "US";
export const REGION_COUNTRY_CODE = "DE";
export const COUNTY_COUNTRY_CODE = "RO";

export const GET_COUNTRIES_AND_REGIONS_QUERY = `
  query getCountriesAndRegions($activeUserLocale: String!) {
    countries: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Country"}}}) {
      value
      id
      code
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        value
      }
    }
    regions: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "CountryRegion"}}}) {
      value
      id
      code
      alternativeCode
      additionalValue2
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        value
      }
    }
  }
`;

export const useGetCountriesAndRegions = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCountriesAndRegions = async (): Promise<FullCountryDetails[]> => {
    const locale = getCurrentActiveUserLocale();

    try {
      const result = await graphqlClient.request<CountriesAndRegionsResponse>(
        GET_COUNTRIES_AND_REGIONS_QUERY,
        { activeUserLocale: locale }
      );

      // Transform countries
      const countries = result.countries
        .map(
          (country): CountryDetails => ({
            value: country.value,
            id: country.id,
            code: country.code,
            displayValue:
              country.translations.length > 0
                ? country.translations[0].value
                : country.value,
          })
        )
        .sort((a, b) => a.displayValue.localeCompare(b.displayValue));

      // Transform regions and categorize them
      const allRegions = result.regions.map(
        (region): RegionDetails => ({
          value: region.value,
          id: region.id,
          code: region.code,
          alternativeCode: region.alternativeCode,
          additionalValue2: region.additionalValue2,
          displayValue:
            region.translations.length > 0
              ? region.translations[0].value
              : region.value,
          type: getRegionType(region),
        })
      );

      // Categorize regions by type
      const states = allRegions
        .filter((region) => region.type === "state")
        .sort((a, b) => a.displayValue.localeCompare(b.displayValue));

      const regions = allRegions
        .filter((region) => region.type === "region")
        .sort((a, b) => a.displayValue.localeCompare(b.displayValue));

      const counties = allRegions
        .filter((region) => region.type === "county")
        .sort((a, b) => a.displayValue.localeCompare(b.displayValue));

      // Build full country details with associated regions
      const fullCountryDetailsList: FullCountryDetails[] = countries.map(
        (country) => {
          const fullCountryDetails: FullCountryDetails = { country };

          // Match regions by comparing country ID with region's additionalValue2
          const countryStates = states.filter(
            (state) => state.additionalValue2 === country.id
          );
          const countryRegions = regions.filter(
            (region) => region.additionalValue2 === country.id
          );
          const countryCounties = counties.filter(
            (county) => county.additionalValue2 === country.id
          );

          // Assign regions based on what was found for this specific country
          if (countryStates.length > 0) {
            fullCountryDetails.states = countryStates;
          }
          if (countryRegions.length > 0) {
            fullCountryDetails.regions = countryRegions;
          }
          if (countryCounties.length > 0) {
            fullCountryDetails.counties = countryCounties;
          }

          return fullCountryDetails;
        }
      );

      return fullCountryDetailsList;
    } catch (error) {
      console.error("Error fetching countries and regions:", error);
      throw error;
    }
  };

  return { fetchCountriesAndRegions };
};

// Helper function to determine region type based on data
function getRegionType(
  region: CountryRegionCatalogEntry
): "state" | "region" | "county" {
  // Check by additionalValue2 which contains the country reference
  if (region.additionalValue2) {
    if (region.additionalValue2.includes("Country:v1:RO")) {
      return "county";
    }
    if (region.additionalValue2.includes("Country:v1:US")) {
      return "state";
    }
    if (region.additionalValue2.includes("Country:v1:DE")) {
      return "region";
    }
  }

  // Fallback: Check by region code or ID pattern
  if (region.id && region.id.includes("RO")) {
    return "county";
  }
  if (region.id && region.id.includes("US")) {
    return "state";
  }
  if (region.id && region.id.includes("DE")) {
    return "region";
  }

  // Fallback: Check by code patterns
  if (region.code) {
    const codeUpper = region.code.toUpperCase();
    if (codeUpper.includes("RO")) {
      return "county";
    }
    if (codeUpper.includes("US")) {
      return "state";
    }
    if (codeUpper.includes("DE")) {
      return "region";
    }
  }

  // Default to region
  return "region";
}
