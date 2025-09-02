"use client";

import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface LeadRatingOption {
  id: string;
  name: string;
}

export interface UseGetLeadRatingsReturn {
  leadRatingOptions: LeadRatingOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetLeadRatings = (
  context: BusinessAppContextProps,
  searchRegex: string = "",
  offset: number = 0
): UseGetLeadRatingsReturn => {
  const [leadRatingOptions, setLeadRatingOptions] = useState<
    LeadRatingOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadLeadRatings = useCallback(async () => {
    if (!context.accessToken) {
      console.log("No access token available, skipping lead rating fetch");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestParams = {
        limit: 5,
        offset,
        returnTotalRecords: true,
        localeCode: userLocale,
        ...(searchRegex ? { searchCriteria: searchRegex } : {}),
      };

      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "SalesLeadRating",
          version: "v1",
        },
        requestParams
      );

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id,
        }));

        // Enforce frontend limit of 5 items since API doesn't respect limit with search criteria
        const limitedOptions = processedOptions.slice(0, 5);

        setLeadRatingOptions(limitedOptions);
      } else {
        setLeadRatingOptions([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load lead ratings";
      setError(errorMessage);
      console.error("Error loading lead ratings:", err);
      setLeadRatingOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale]);

  useEffect(() => {
    loadLeadRatings();
  }, [loadLeadRatings]);

  return {
    leadRatingOptions,
    isLoading,
    error,
  };
};
