import { useEffect, useState } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ServiceCategory } from '../types';

/**
 * GraphQL query to fetch Service Portal categories from the catalog with hierarchy
 */
const GET_SERVICE_PORTAL_CATEGORIES_QUERY = `
  query GetServicePortalCategories {
    Catalog(where: {
      identifier: { _eq: "ServicePortalCategory" }
      isDeleted: { _eq: false }
    }) {
      id
      name
      identifier
      catalogEntries(
        where: { isDeleted: { _eq: false } }
      ) {
        id
        code
        description
        displayOrder
        value
        objectValue
        parentEntryId
        parentEntry {
          id
          code
          description
          displayOrder
          value
          objectValue
        }
        childEntries {
          id
          code
          description
          displayOrder
          value
          objectValue
        }
      }
    }
  }
`;

interface CatalogEntry {
  id: string;
  code: string;
  description?: string;
  displayOrder?: number;
  value?: string;
  objectValue?: {
    description?: string;
    icon?: string;
    name?: string;
  };
  parentEntryId?: string;
  parentEntry?: {
    id: string;
    code: string;
    description?: string;
    displayOrder?: number;
    value?: string;
    objectValue?: {
      description?: string;
      icon?: string;
      name?: string;
    };
  };
  childEntries?: Array<{
    id: string;
    code: string;
    description?: string;
    displayOrder?: number;
    value?: string;
    objectValue?: {
      description?: string;
      icon?: string;
      name?: string;
    };
  }>;
}

interface CatalogResponse {
  Catalog: Array<{
    id: string;
    name: string;
    identifier: string;
    catalogEntries: CatalogEntry[];
  }>;
}


/**
 * Transform catalog entries to ServiceCategory format
 * Only returns child categories (not parent groups)
 */
const transformCatalogEntriesToCategories = (entries: CatalogEntry[]): ServiceCategory[] => {
  // Filter to only child entries (entries that have a parentEntryId)
  const childEntries = entries.filter(entry => entry.parentEntryId !== null);
  
  return childEntries
    .map((entry): ServiceCategory => {
      return {
        id: entry.code.toLowerCase(), // Use lowercase for consistency with existing system
        name: entry.value || entry.code, // Use code as fallback
        icon: entry.objectValue?.icon || entry.code.toLowerCase(),
        description: entry.objectValue?.description || entry.description || '',
        order: entry.displayOrder || 999 // Default high order for entries without displayOrder
      };
    })
    .sort((a, b) => a.order - b.order); // Sort by display order
};

/**
 * Transform catalog entries to CategoryGroup format with hierarchical structure
 */
const transformCatalogEntriesToGroups = (entries: CatalogEntry[]): CategoryGroup[] => {
  // Find parent entries (entries with no parentEntryId)
  const parentEntries = entries.filter(entry => entry.parentEntryId === null);
  
  return parentEntries
    .map((parentEntry): CategoryGroup => {
      // Get child categories for this parent
      const childCategories = parentEntry.childEntries || [];
      const transformedChildren = childCategories
        .map((childEntry): ServiceCategory => {
          return {
            id: childEntry.code.toLowerCase(),
            name: childEntry.value || childEntry.code, // Use code as fallback
            icon: childEntry.objectValue?.icon || childEntry.code.toLowerCase(),
            description: childEntry.objectValue?.description || childEntry.description || '',
            order: childEntry.displayOrder || 999,
            catalogEntryId: childEntry.id // Store the original catalog entry ID for template filtering
          };
        })
        .sort((a, b) => a.order - b.order);
      
      return {
        id: parentEntry.code.toLowerCase(),
        name: parentEntry.value || parentEntry.code, // Use code as fallback
        description: parentEntry.objectValue?.description || parentEntry.description || '',
        displayOrder: parentEntry.displayOrder || 999,
        categories: transformedChildren
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

export interface CategoryGroup {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  categories: ServiceCategory[];
}

export interface UseServicePortalCategoriesResult {
  categories: ServiceCategory[];
  categoryGroups: CategoryGroup[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch Service Portal categories from the catalog system
 * Falls back to hardcoded categories if catalog is not available
 */
export const useServicePortalCategories = ({ 
  accessToken 
}: Pick<BusinessAppContextProps, 'accessToken'>): UseServicePortalCategoriesResult => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const graphqlClient = useGraphqlClient(accessToken || '');

  const fetchCategories = async () => {
    if (!accessToken) {
      setError('Access token is required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await graphqlClient.request<CatalogResponse>(
        GET_SERVICE_PORTAL_CATEGORIES_QUERY,
        {}
      );

      if (response.Catalog && response.Catalog.length > 0) {
        const catalogEntries = response.Catalog[0].catalogEntries;
        const transformedCategories = transformCatalogEntriesToCategories(catalogEntries);
        const transformedGroups = transformCatalogEntriesToGroups(catalogEntries);
        setCategories(transformedCategories);
        setCategoryGroups(transformedGroups);
      } else {
        console.warn('Service Portal Category catalog not found in response:', response);
        setCategories([]);
        setCategoryGroups([]);
      }
    } catch (err) {
      console.error('Error fetching Service Portal categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      // Don't set empty categories on error - let the component handle fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [accessToken]);

  return {
    categories,
    categoryGroups,
    isLoading,
    error,
    refetch: fetchCategories
  };
};
