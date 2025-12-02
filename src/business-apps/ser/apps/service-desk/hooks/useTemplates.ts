import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { createConductorWorkflowEngine } from '../../../services';

export interface Template {
  id: string;
  name: string;
  description: string;
  version: number;
  type: 'TEMPLATE' | 'SELF_SERVICE';
  steps: any[];
  createdAt?: string;
  updatedAt?: string;
  isDraft?: boolean;
  isLatestVersion?: boolean;
  usageCount?: number;
}

export interface TemplatesResponse {
  status: string;
  count: number;
  totalCount: number;
  hasMore: boolean;
  data: Template[];
}

export interface UseTemplatesOptions {
  limit?: number;
  offset?: number;
  onlyLatest?: boolean;
  includeDrafts?: boolean;
  search?: string;
  autoFetch?: boolean;
}

export interface UseTemplatesResult {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  setSearch: (search: string) => void;
  pagination: {
    limit: number;
    offset: number;
    totalCount: number;
  };
}

/**
 * Hook for fetching templates from custom-flow-engine
 * Provides template data for development and debugging purposes
 */
export const useTemplates = (
  context: BusinessAppContextProps,
  options: UseTemplatesOptions = {}
): UseTemplatesResult => {
  const {
    limit = 50,
    offset = 0,
    onlyLatest = true,
    includeDrafts = true,
    search,
    autoFetch = true
  } = options;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentSearch, setCurrentSearch] = useState(search || '');

  const fetchTemplates = async () => {
    if (!context.accessToken) {
      setError('Access token is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎭 useTemplates: Fetching templates with options:', {
        limit,
        offset,
        onlyLatest,
        includeDrafts,
        search: currentSearch
      });

      if (!context.accessToken || !context.userInfo) {
        throw new Error('Authentication required - no access token or user info provided');
      }
      
      const workflowEngine = createConductorWorkflowEngine({ 
        accessToken: context.accessToken, 
        userInfo: context.userInfo 
      });
      
      // Check if templates functionality is available (optional method)
      if (!workflowEngine.getTemplates || typeof workflowEngine.getTemplates !== 'function') {
        throw new Error('Templates functionality not available in current workflow engine');
      }

      const result = await workflowEngine.getTemplates({
        limit,
        offset,
        onlyLatest,
        includeDrafts,
        search: currentSearch || undefined
      });

      console.log('🎭 useTemplates: Templates fetched successfully:', {
        count: result.count,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

      setTemplates(result.data);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      console.error('🎭 useTemplates: Error fetching templates:', err);
      setError(errorMessage);
      setTemplates([]);
      setTotalCount(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchTemplates();
    }
  }, [limit, offset, onlyLatest, includeDrafts, currentSearch, context.accessToken, autoFetch]);

  const setSearch = (newSearch: string) => {
    setCurrentSearch(newSearch);
  };

  const refetch = async () => {
    await fetchTemplates();
  };

  return {
    templates,
    isLoading,
    error,
    totalCount,
    hasMore,
    refetch,
    setSearch,
    pagination: {
      limit,
      offset,
      totalCount
    }
  };
};
