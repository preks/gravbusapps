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
  query GetDistinctJobTitles {
    Contact(distinctOn: jobTitle) {
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
      const response = await graphqlClient.request<any>(
        GET_DISTINCT_JOB_TITLES
      );

      const contacts = response?.Contact || [];
      let titles = contacts
        .map((c: any) => c.jobTitle)
        .filter((t: string | null | undefined) => t && t.trim() !== "");
      // Remove duplicates (should be unique due to distinctOn, but just in case)
      titles = Array.from(new Set(titles));
      // Filter by search
      const filtered = search
        ? titles.filter((t: string) =>
            t.toLowerCase().includes(search.toLowerCase())
          )
        : titles;
      setJobTitleOptions(
        filtered.map((title: string) => ({ id: title, name: title }))
      );
    } catch (err) {
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
