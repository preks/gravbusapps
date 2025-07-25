"use client";

import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface ActivityTypeOption {
  id: string;
  name: string;
}

export interface UseGetActivityTypesReturn {
  activityTypeOptions: ActivityTypeOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetActivityTypes = (
  context: BusinessAppContextProps,
  searchRegex: string = "",
  offset: number = 0
): UseGetActivityTypesReturn => {
  const [activityTypeOptions, setActivityTypeOptions] = useState<
    ActivityTypeOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadActivityTypes = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "SalesActivityType",
          version: "v1",
        },
        {
          limit: 5,
          offset,
          returnTotalRecords: true,
          localeCode: userLocale,
          value: searchRegex,
        }
      );

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id,
        }));

        setActivityTypeOptions(processedOptions);
      } else {
        setActivityTypeOptions([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load activity types";
      setError(errorMessage);
      console.error("Error loading activity types:", err);
      setActivityTypeOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale]);

  useEffect(() => {
    loadActivityTypes();
  }, [loadActivityTypes]);

  return {
    activityTypeOptions,
    isLoading,
    error,
  };
};
