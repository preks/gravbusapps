import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  EmployeeHeaderData,
  useEmployeeHeaderQueries,
} from "../queries/EmployeeHeaderQueries";

export interface UseEmployeeHeaderDataResult {
  headerData: EmployeeHeaderData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useEmployeeHeaderData = (
  context: BusinessAppContextProps,
  employeeId: string
): UseEmployeeHeaderDataResult => {
  const [headerData, setHeaderData] = useState<EmployeeHeaderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchEmployeeHeaderData } = useEmployeeHeaderQueries(context);

  const loadData = useCallback(async () => {
    if (!context.accessToken || !employeeId) {
      setError("Missing access token or employee ID");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // fetchEmployeeHeaderData now returns already transformed data
      const headerData = await fetchEmployeeHeaderData(employeeId);

      if (!headerData) {
        setError("Employee not found");
        setHeaderData(null);
        return;
      }

      // Use the data directly (it's already transformed)
      setHeaderData(headerData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load employee header data";
      setError(errorMessage);
      console.error("Employee header data integration error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, employeeId, fetchEmployeeHeaderData]);

  const refetch = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (context.accessToken && employeeId) {
      loadData();
    }
  }, [context.accessToken, employeeId, loadData]);

  return {
    headerData,
    isLoading,
    error,
    refetch,
  };
};
