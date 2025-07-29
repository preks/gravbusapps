"use client";

import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface JobTitleOption {
  id: string;
  name: string;
}

export interface UseGetJobTitlesReturn {
  jobTitleOptions: JobTitleOption[];
  isLoading: boolean;
  error: string | null;
}

const GET_DISTINCT_JOB_TITLES = `
  query GetDistinctJobTitles($limit: Int, $where: ContactBoolExp) {
    Contact(distinctOn: jobTitle, limit: $limit, where: $where) {
      jobTitle
    }
  }
`;

export const useGetJobTitles = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetJobTitlesReturn => {
  const [jobTitleOptions, setJobTitleOptions] = useState<JobTitleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const loadJobTitles = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Build GraphQL variables
      const variables: any = {
        limit: 5,
        where: {
          jobTitle: { _isNull: false },
        },
      };
      // Add search condition if search term exists
      if (search && search.trim()) {
        variables.where.jobTitle._ilike = `%${search.trim()}%`;
      }

      const response = await graphqlClient.request<any>(
        GET_DISTINCT_JOB_TITLES,
        variables
      );

      const contacts = response?.Contact || [];
      const titles = contacts
        .map((c: any) => c.jobTitle)
        .filter((t: string | null | undefined) => t && t.trim() !== "");

      setJobTitleOptions(
        titles.map((title: string) => ({ id: title, name: title }))
      );
    } catch (err) {
      console.error("❌ useGetJobTitles: Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load job titles"
      );
      setJobTitleOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient, context.accessToken, search]);

  useEffect(() => {
    loadJobTitles();
  }, [loadJobTitles]);

  return {
    jobTitleOptions,
    isLoading,
    error,
  };
};
