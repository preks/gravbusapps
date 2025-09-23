import { useState, useCallback, useEffect } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export interface DocumentGroup {
  id: string;
  value: string;
  code?: string;
}

export interface DocumentType {
  id: string;
  value: string;
  code?: string;
  parentId?: string;
}

export interface UseDocumentCatalogsReturn {
  documentGroups: DocumentGroup[];
  documentTypes: DocumentType[];
  filteredDocumentTypes: DocumentType[];
  loading: {
    groups: boolean;
    types: boolean;
  };
  error: {
    groups: string | null;
    types: string | null;
  };
  refetch: () => void;
}

export const useDocumentCatalogs = (
  accessToken: string,
  selectedGroupId?: string,
  options?: {
    groupCatalogIdentifier?: string;
    typeCatalogIdentifier?: string;
  }
): UseDocumentCatalogsReturn => {
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState({
    groups: false,
    types: false
  });
  const [error, setError] = useState({
    groups: null as string | null,
    types: null as string | null
  });

  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchDocumentGroups = useCallback(async () => {
    if (!accessToken) return;

    setLoading(prev => ({ ...prev, groups: true }));
    setError(prev => ({ ...prev, groups: null }));

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: options?.groupCatalogIdentifier || 'DocumentGroup',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );

      const groupData = response.data?.map((entry: any) => ({
        id: entry.id,
        value: entry.value || entry.label || 'Unknown',
        code: entry.code
      })) || [];

      console.log('Document Groups fetched:', groupData);
      setDocumentGroups(groupData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document groups';
      setError(prev => ({ ...prev, groups: errorMessage }));
      console.error('Error fetching document groups:', err);
    } finally {
      setLoading(prev => ({ ...prev, groups: false }));
    }
  }, [accessToken, catalogClient]);

  const fetchDocumentTypes = useCallback(async () => {
    if (!accessToken) return;

    setLoading(prev => ({ ...prev, types: true }));
    setError(prev => ({ ...prev, types: null }));

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: options?.typeCatalogIdentifier || 'DocumentType',
          version: 'v1'
        },
        {
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );
      console.log('Document Types fetched:', response.data);

      const typeData = response.data?.map((entry: any) => ({
        id: entry.id,
        value: entry.value || entry.label || 'Unknown',
        code: entry.code,
        parentId: entry.parentEntryId || null, // Use the correct field name
      })) || [];

      console.log('Document Types processed:', typeData);
      setDocumentTypes(typeData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document types';
      setError(prev => ({ ...prev, types: errorMessage }));
      console.error('Error fetching document types:', err);
    } finally {
      setLoading(prev => ({ ...prev, types: false }));
    }
  }, [accessToken, catalogClient]);

  // Filter document types based on selected group
  const filteredDocumentTypes = documentTypes.filter(type => {
    if (!selectedGroupId) return false;
    
    // Strict exact match - Selected: "DocumentGroup:v1:PERSONAL" should match parent: "DocumentGroup:v1:PERSONAL"
    return type.parentId === selectedGroupId;
  });

  // Simple debug logging
  console.log('Filtering - Selected Group:', selectedGroupId);
  console.log('Total Document Types:', documentTypes.length);
  console.log('Filtered Document Types:', filteredDocumentTypes.length);
  if (filteredDocumentTypes.length > 0) {
    console.log('Filtered types:', filteredDocumentTypes.map(t => t.value));
  }

  const refetch = useCallback(() => {
    fetchDocumentGroups();
    fetchDocumentTypes();
  }, [fetchDocumentGroups, fetchDocumentTypes]);

  useEffect(() => {
    if (accessToken) {
      refetch();
    }
  }, [accessToken, refetch]);

  return {
    documentGroups,
    documentTypes,
    filteredDocumentTypes,
    loading,
    error,
    refetch
  };
}; 