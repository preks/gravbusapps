import { useState, useCallback, useEffect, useRef } from "react";
import { SelectOption } from "../types";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";

interface InvestmentLiquidFundTypeCatalogState {
  options: SelectOption[];
  loading: boolean;
  error: string | null;
}

export const INVESTMENT_LIQUID_FUND_TYPE_CATALOG = "InvestmentLiquidFundType";
export const CATALOG_VERSION = "v1";

export const useInvestmentLiquidFundTypeCatalog = (accessToken: string, investmentTypeRef?: string) => {
  const [state, setState] = useState<InvestmentLiquidFundTypeCatalogState>({
    options: [],
    loading: false,
    error: null,
  });

  const catalogClient = useCatalogManagerClient(accessToken);
  
  // Monotonically increasing fetch ID to prevent stale responses
  const fetchIdRef = useRef<number>(0);

  const fetchInvestmentLiquidFundTypes = useCallback(
    async (parentTypeRef?: string): Promise<void> => {
      // Increment fetch ID to track this request
      const currentFetchId = ++fetchIdRef.current;
      
      if (!parentTypeRef) {
        // Only update state if this is still the latest request
        if (currentFetchId === fetchIdRef.current) {
          setState({
            options: [],
            loading: false,
            error: null,
          });
        }
        return;
      }

      // Only update state if this is still the latest request
      if (currentFetchId === fetchIdRef.current) {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));
      }

      try {
        // Extract the parent type code from the investment type reference (e.g., "InvestmentType:v1:BANK" -> "BANK")
        const parts = parentTypeRef.split(':');
        const parentTypeCode = parts.length > 0 ? parts[parts.length - 1] : '';
        if (!parentTypeCode) {
          console.warn(`Invalid parent type reference format: ${parentTypeRef}`);
          // Only update state if this is still the latest request
          if (currentFetchId === fetchIdRef.current) {
            setState({
              options: [],
              loading: false,
              error: null,
            });
          }
          return;
        }
        
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: INVESTMENT_LIQUID_FUND_TYPE_CATALOG,
            version: CATALOG_VERSION,
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
          }
        );

        // Filter entries by parent investment type code in the response data
        const filteredEntries = response.data.filter((entry: any) => {
          // Check if the entry has the expected parent structure
          // The parent should be the investment type with the matching code
          const expectedParentRef = `InvestmentType:${CATALOG_VERSION}:${parentTypeCode}`;
          
          // Check various possible parent reference formats
          return entry.parentEntryId === expectedParentRef ||
                 entry.parentId === expectedParentRef ||
                 entry.parent === expectedParentRef ||
                 (entry.parent && entry.parent.code === parentTypeCode);
        });

        const mappedOptions: SelectOption[] = filteredEntries.map((entry: any) => {
          // Create the reference format: InvestmentLiquidFundType:v1:CODE
          const referenceValue = `${INVESTMENT_LIQUID_FUND_TYPE_CATALOG}:${CATALOG_VERSION}:${entry.code || entry.id}`;

          return {
            id: entry.id,
            name: entry.value || entry.label || entry.name || "Unknown",
            label: entry.value || entry.label || entry.name || "Unknown",
            value: referenceValue,
          };
        });

        // Only update state if this is still the latest request
        if (currentFetchId === fetchIdRef.current) {
          setState((prev) => ({
            ...prev,
            loading: false,
            options: mappedOptions,
          }));
        }
      } catch (err) {
        console.error(`Error fetching ${INVESTMENT_LIQUID_FUND_TYPE_CATALOG} catalog for type ${parentTypeRef}:`, err);
        // Only update state if this is still the latest request
        if (currentFetchId === fetchIdRef.current) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error occurred",
          }));
        }
      }
    },
    [catalogClient]
  );

  // Auto-fetch when investment type changes
  useEffect(() => {
    if (accessToken) {
      fetchInvestmentLiquidFundTypes(investmentTypeRef);
    }
  }, [accessToken, investmentTypeRef, fetchInvestmentLiquidFundTypes]);

  const refetch = useCallback(() => {
    fetchInvestmentLiquidFundTypes(investmentTypeRef);
  }, [fetchInvestmentLiquidFundTypes, investmentTypeRef]);

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    refetch,
  };
};
