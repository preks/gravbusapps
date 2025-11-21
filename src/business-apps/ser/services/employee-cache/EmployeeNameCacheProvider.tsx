/**
 * Employee Name Cache Provider
 * React Context Provider for sharing cache instance across components
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { EmployeeNameCache, getEmployeeNameCache } from './EmployeeNameCache';
import type { EmployeeNameCacheConfig } from './types';

interface EmployeeNameCacheContextValue {
  cache: EmployeeNameCache;
  isInitialized: boolean;
}

const EmployeeNameCacheContext = createContext<EmployeeNameCacheContextValue | null>(null);

export interface EmployeeNameCacheProviderProps {
  children: React.ReactNode;
  accessToken: string;
  config?: Partial<EmployeeNameCacheConfig>;
}

/**
 * Provider component that creates and manages the employee name cache
 */
export const EmployeeNameCacheProvider: React.FC<EmployeeNameCacheProviderProps> = ({
  children,
  accessToken,
  config,
}) => {
  // Create cache instance with config
  const cache = useMemo(() => {
    return getEmployeeNameCache({
      enableDebugLogging: process.env.NODE_ENV === 'development',
      ...config,
    });
  }, [config]);

  // Initialize cache when access token changes
  useEffect(() => {
    if (accessToken) {
      cache.initialize(accessToken);
    }
  }, [cache, accessToken]);

  const contextValue: EmployeeNameCacheContextValue = {
    cache,
    isInitialized: !!accessToken,
  };

  return (
    <EmployeeNameCacheContext.Provider value={contextValue}>
      {children}
    </EmployeeNameCacheContext.Provider>
  );
};

/**
 * Hook to access the employee name cache from context
 */
export const useEmployeeNameCache = (): EmployeeNameCacheContextValue => {
  const context = useContext(EmployeeNameCacheContext);
  
  if (!context) {
    throw new Error('useEmployeeNameCache must be used within an EmployeeNameCacheProvider');
  }
  
  return context;
};

/**
 * Hook to check if cache is available (optional usage)
 */
export const useEmployeeNameCacheOptional = (): EmployeeNameCacheContextValue | null => {
  return useContext(EmployeeNameCacheContext);
};
