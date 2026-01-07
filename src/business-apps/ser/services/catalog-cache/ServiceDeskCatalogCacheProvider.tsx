/**
 * React Context Provider for ServiceDeskCatalogCache
 * Makes the cache available to all child components
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ServiceDeskCatalogCache, getServiceDeskCatalogCache } from './ServiceDeskCatalogCache';
import { CatalogCacheConfig, ServiceDeskCatalog, ServiceDeskCatalogEntry } from './types';

interface ServiceDeskCatalogCacheContextType {
  cache: ServiceDeskCatalogCache;
  isInitialized: boolean;
}

const ServiceDeskCatalogCacheContext = createContext<ServiceDeskCatalogCacheContextType | undefined>(undefined);

export interface ServiceDeskCatalogCacheProviderProps {
  children: React.ReactNode;
  accessToken: string;
  config?: Partial<CatalogCacheConfig>;
}

export const ServiceDeskCatalogCacheProvider: React.FC<ServiceDeskCatalogCacheProviderProps> = ({
  children,
  accessToken,
  config,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const cacheRef = useRef<ServiceDeskCatalogCache | null>(null);

  // Initialize cache when component mounts or accessToken changes
  useEffect(() => {
    const defaultConfig: CatalogCacheConfig = {
      ttl: 5 * 60 * 1000, // 5 minutes
      enableDebugLogging: process.env.NODE_ENV === 'development',
      ...config,
    };

    cacheRef.current = getServiceDeskCatalogCache(defaultConfig);
    cacheRef.current.initialize(accessToken);
    setIsInitialized(true);

    return () => {
      // Cleanup on unmount
      setIsInitialized(false);
    };
  }, [accessToken, config]);

  if (!cacheRef.current || !isInitialized) {
    return <>{children}</>;
  }

  return (
    <ServiceDeskCatalogCacheContext.Provider 
      value={{ 
        cache: cacheRef.current, 
        isInitialized 
      }}
    >
      {children}
    </ServiceDeskCatalogCacheContext.Provider>
  );
};

/**
 * Hook to access the ServiceDeskCatalogCache
 * Throws error if used outside of provider
 */
export const useServiceDeskCatalogCache = () => {
  const context = useContext(ServiceDeskCatalogCacheContext);
  if (context === undefined) {
    throw new Error('useServiceDeskCatalogCache must be used within a ServiceDeskCatalogCacheProvider');
  }
  return context;
};

/**
 * Hook to optionally access the ServiceDeskCatalogCache
 * Returns undefined if used outside of provider (no error)
 */
export const useServiceDeskCatalogCacheOptional = () => {
  return useContext(ServiceDeskCatalogCacheContext);
};
