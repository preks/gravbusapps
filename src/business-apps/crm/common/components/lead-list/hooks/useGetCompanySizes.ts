"use client";

import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface CompanySizeOption {
  id: string;
  name: string;
}

export interface UseGetCompanySizesReturn {
  companySizeOptions: CompanySizeOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetCompanySizes = (
  context: BusinessAppContextProps
): UseGetCompanySizesReturn => {
  const [companySizeOptions, setCompanySizeOptions] = useState<
    CompanySizeOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Predefined user-friendly company size options
  const allSizes: CompanySizeOption[] = [
    { id: "startup", name: "Startup (1-10 employees)" },
    { id: "small", name: "Small (11-50 employees)" },
    { id: "medium", name: "Medium (51-200 employees)" },
    { id: "large", name: "Large (201-1000 employees)" },
    { id: "enterprise", name: "Enterprise (1000+ employees)" },
  ];

  const loadCompanySizes = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      setCompanySizeOptions(allSizes);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load company sizes";
      setError(errorMessage);
      console.error("Error loading company sizes:", err);
      setCompanySizeOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanySizes();
  }, [loadCompanySizes]);

  return {
    companySizeOptions,
    isLoading,
    error,
  };
};
