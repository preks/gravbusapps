import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface StatusOption {
  id: string;
  name: string;
  code: string;
}

export interface UseGetOpportunityStatusesReturn {
  statusOptions: StatusOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetOpportunityStatuses = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetOpportunityStatusesReturn => {
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadStatuses = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "SalesOpportunityStatus",
          version: "v1",
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          ...(search ? { searchCriteria: search } : {}),
        }
      );
      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || "Unknown Status",
          code: entry.code || "",
        }));
        setStatusOptions(processedOptions);
      } else {
        setStatusOptions([]);
      }
    } catch (error) {
      console.error("Error loading opportunity statuses:", error);
      setError("Failed to load opportunity statuses");
      setStatusOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, catalogClient, userLocale]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  return {
    statusOptions,
    isLoading,
    error,
  };
}; 