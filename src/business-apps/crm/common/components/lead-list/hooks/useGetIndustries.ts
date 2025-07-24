"use client";

import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface IndustryOption {
  id: string;
  name: string;
}

export interface UseGetIndustriesReturn {
  industryOptions: IndustryOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetIndustries = (
  context: BusinessAppContextProps,
  searchRegex: string = "",
  offset: number = 0
): UseGetIndustriesReturn => {
  const [industryOptions, setIndustryOptions] = useState<IndustryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadIndustries = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "IndustryClass",
          version: "v1",
        },
        {
          limit: 5,
          offset,
          returnTotalRecords: true,
          localeCode: userLocale,
          ...(searchRegex ? { searchCriteria: searchRegex } : {}),
        }
      );

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id,
        }));

        // Enforce frontend limit of 5 items since API doesn't respect limit with search criteria
        const limitedOptions = processedOptions.slice(0, 5);

        setIndustryOptions(limitedOptions);
      } else {
        setIndustryOptions([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load industries";
      setError(errorMessage);
      console.error("Error loading industries:", err);
      setIndustryOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale]);

  useEffect(() => {
    loadIndustries();
  }, [loadIndustries]);

  return {
    industryOptions,
    isLoading,
    error,
  };
};
