import { useState, useCallback, useRef, useEffect } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { CatalogOption } from '../types';
import { GET_TRAVEL_REGIONS_WITH_COUNT, GET_TRAVEL_REGIONS_BY_PARENT } from '../queries/TravelRegionFormQueries';

const TRAVEL_REGIONS_FALLBACK = [
  { id: 'western-europe', name: 'Western Europe' },
  { id: 'eastern-europe', name: 'Eastern Europe' },
  { id: 'north-america', name: 'North America' },
  { id: 'south-america', name: 'South America' },
  { id: 'asia-pacific', name: 'Asia Pacific' },
  { id: 'middle-east', name: 'Middle East' },
  { id: 'africa', name: 'Africa' },
  { id: 'oceania', name: 'Oceania' },
  { id: 'domestic', name: 'Domestic' },
  { id: 'international', name: 'International' }
];

const REGION_LIMIT = 50;

interface UseCatalogDataProps {
  accessToken: string;
  travelRegionSetId?: string;
}

export const useCatalogData = ({ accessToken, travelRegionSetId }: UseCatalogDataProps) => {
  const [countries, setCountries] = useState<CatalogOption[]>([]);
  const [currencies, setCurrencies] = useState<CatalogOption[]>([]);
  const [travelRegions, setTravelRegions] = useState<CatalogOption[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state for travel regions
  const [isLoadingMoreRegions, setIsLoadingMoreRegions] = useState(false);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const totalRegionsRef = useRef(0);
  const isLoadingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const catalogClient = useCatalogManagerClient(accessToken);
  const graphqlClient = useGraphQLClient(accessToken);

  // Load catalog data
  const loadCatalogData = useCallback(async () => {
    setCatalogsLoading(true);
    try {
      // Load countries and currencies
      const [countriesRes, currenciesRes] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Currency', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ]);

      setCountries(countriesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      setCurrencies(currenciesRes.data.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      })));

      // Load travel regions using GraphQL
      if (travelRegionSetId) {
        const result = await graphqlClient.request<{ 
          parent: Array<{ id: string; childEntriesAggregate: { aggregate: { count: number } } }>;
          regions: any[];
        }>(
          GET_TRAVEL_REGIONS_WITH_COUNT,
          { parentEntryId: travelRegionSetId, limit: REGION_LIMIT, offset: 0 }
        );
        
        totalRegionsRef.current = result.parent[0]?.childEntriesAggregate.aggregate.count || 0;
        
        const regions = result.regions.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }));
        
        setTravelRegions(regions);
        offsetRef.current = regions.length;
        hasMoreRef.current = offsetRef.current < totalRegionsRef.current;
        isLoadingRef.current = false;
        
        console.log(`📊 Loaded first ${regions.length} regions of ${totalRegionsRef.current}`, {
          offset: offsetRef.current,
          hasMore: hasMoreRef.current
        });
      } else {
        const travelRegionsRes = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'TravelRegion', version: 'v1' },
          { limit: REGION_LIMIT, offset: 0, returnTotalRecords: true }
        );
        
        const regions = travelRegionsRes.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }));
        
        setTravelRegions(regions);
        offsetRef.current = regions.length;
        totalRegionsRef.current = regions.length;
        hasMoreRef.current = false;
      }
    } catch (err) {
      console.error('Error loading catalog data:', err);
      setError('Failed to load catalog data');
      setTravelRegions(TRAVEL_REGIONS_FALLBACK.map(region => ({
        id: region.id,
        value: region.name,
        code: region.id
      })));
    } finally {
      setCatalogsLoading(false);
    }
  }, [catalogClient, graphqlClient, travelRegionSetId]);

  // Load more travel regions
  const loadMoreTravelRegions = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current || !travelRegionSetId) {
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoadingMoreRegions(true);
    
    try {
      const result = await graphqlClient.request<{ CatalogEntry: any[] }>(
        GET_TRAVEL_REGIONS_BY_PARENT,
        { parentEntryId: travelRegionSetId, limit: REGION_LIMIT, offset: offsetRef.current }
      );
      
      const newRegions = result.CatalogEntry.map((item: any) => ({
        id: item.id,
        value: item.value,
        code: item.code
      }));
      
      setTravelRegions(prev => [...prev, ...newRegions]);
      offsetRef.current += newRegions.length;
      hasMoreRef.current = offsetRef.current < totalRegionsRef.current;
      
      console.log(`✅ Loaded ${newRegions.length} more regions. Total: ${offsetRef.current}/${totalRegionsRef.current}`);
    } catch (err) {
      console.error('❌ Error loading more travel regions:', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMoreRegions(false);
    }
  }, [travelRegionSetId, graphqlClient]);

  // Reset pagination when travelRegionSetId changes
  useEffect(() => {
    initialLoadDoneRef.current = false;
    offsetRef.current = 0;
    hasMoreRef.current = true;
    totalRegionsRef.current = 0;
  }, [travelRegionSetId]);

  // Initial load
  useEffect(() => {
    if (accessToken && !initialLoadDoneRef.current) {
      console.log('🔄 Initial catalog load triggered');
      initialLoadDoneRef.current = true;
      loadCatalogData();
    }
  }, [accessToken, loadCatalogData]);

  return {
    countries,
    currencies,
    travelRegions,
    catalogsLoading,
    error,
    isLoadingMoreRegions,
    hasMoreRef,
    offsetRef,
    totalRegionsRef,
    loadMoreTravelRegions,
  };
};


