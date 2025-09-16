import { useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry } from '@/common/types/CatalogTypes';

export const useCreateCatalogEntry = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken);

  const createCatalogEntry = useCallback(async (
    catalogIdentifier: string,
    version: string,
    entryData: Omit<CatalogEntry, 'id' | 'type'>
  ): Promise<CatalogEntry> => {
    try {
      return await catalogClient.createCatalogEntry(catalogIdentifier, version, entryData);
    } catch (error) {
      throw error;
    }
  }, [catalogClient]);

  return { createCatalogEntry };
};

export default useCreateCatalogEntry;

