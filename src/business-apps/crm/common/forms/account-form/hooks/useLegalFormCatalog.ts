import { useState, useEffect, useCallback } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { getCurrentActiveUserLocale } from "@/common/utils/windowUtils";

export interface LegalFormOption {
  id: string;
  value: string;
  label: string;
  name: string;
}

export interface UseLegalFormCatalogReturn {
  legalFormOptions: LegalFormOption[];
  isLoadingLegalForms: boolean;
  legalFormError: string | null;
  refetchLegalForms: () => void;
}

export const useLegalFormCatalog = (
  context: BusinessAppContextProps
): UseLegalFormCatalogReturn => {
  const [legalFormOptions, setLegalFormOptions] = useState<LegalFormOption[]>(
    []
  );
  const [isLoadingLegalForms, setIsLoadingLegalForms] = useState(true);
  const [legalFormError, setLegalFormError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? "en-US";

  const loadLegalForms = useCallback(async () => {
    if (!context.accessToken) {
      console.log("❌ No access token available for legal forms");
      setIsLoadingLegalForms(false);
      return;
    }

    setIsLoadingLegalForms(true);
    setLegalFormError(null);

    try {
      console.log("Loading legal forms from catalog...");
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: "LegalForm",
          version: "v1",
        },
        {
          limit: 50,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
        }
      );

      console.log("✅ Legal forms loaded:", response);

      if (response?.data) {
        const mappedLegalForms: LegalFormOption[] = response.data.map(
          (entry: any) => ({
            id: entry.id, // Catalog ID (e.g., "LegalForm:v1:LLC")
            value: entry.value, // Human-readable display text (e.g., "Limited Liability Company LLC")
            label: entry.value, // Same as value for consistency
            name: entry.value, // Same as value for consistency
          })
        );
        setLegalFormOptions(mappedLegalForms);
        console.log("✅ Legal forms mapped:", mappedLegalForms);
      } else {
        console.error("❌ Failed to load legal forms:", response);
        setLegalFormError("Failed to load legal forms");
      }
    } catch (error) {
      console.error("❌ Error loading legal forms:", error);
      setLegalFormError(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsLoadingLegalForms(false);
    }
  }, [context.accessToken, catalogClient]);

  useEffect(() => {
    loadLegalForms();
  }, [loadLegalForms]);

  return {
    legalFormOptions,
    isLoadingLegalForms,
    legalFormError,
    refetchLegalForms: loadLegalForms,
  };
};
