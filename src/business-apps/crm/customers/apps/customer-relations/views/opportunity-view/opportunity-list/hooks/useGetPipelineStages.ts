import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface PipelineStageOption {
  id: string;
  name: string;
}

export interface UseGetPipelineStagesReturn {
  pipelineStageOptions: PipelineStageOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetPipelineStages = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetPipelineStagesReturn => {
  const [pipelineStageOptions, setPipelineStageOptions] = useState<
    PipelineStageOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadPipelineStages = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "SalesPipelineStage",
          version: "v1",
        },
        {
          limit: 5,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          value: search,
        }
      );

      if (response?.data) {
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id,
        }));

        setPipelineStageOptions(processedOptions);
      } else {
        setPipelineStageOptions([]);
      }
    } catch (err) {
      console.error("❌ useGetPipelineStages: Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load pipeline stages"
      );
      setPipelineStageOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, context.accessToken, search, userLocale]);

  useEffect(() => {
    loadPipelineStages();
  }, [loadPipelineStages]);

  return {
    pipelineStageOptions,
    isLoading,
    error,
  };
};
