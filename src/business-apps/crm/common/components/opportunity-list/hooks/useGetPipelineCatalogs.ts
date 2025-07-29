import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface PipelineOption {
  id: string;
  name: string;
}

export interface UseGetPipelineCatalogsReturn {
  pipelineOptions: PipelineOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetPipelineCatalogs = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetPipelineCatalogsReturn => {
  const [pipelineOptions, setPipelineOptions] = useState<PipelineOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadPipelines = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "SalesPipeline",
          version: "v1",
        },
        {
          limit: 20,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          ...(search ? { searchCriteria: search } : {}),
        }
      );
      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id,
        }));
        setPipelineOptions(processedOptions);
      } else {
        setPipelineOptions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipelines");
      setPipelineOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, context.accessToken, search, userLocale]);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  return {
    pipelineOptions,
    isLoading,
    error,
  };
};
