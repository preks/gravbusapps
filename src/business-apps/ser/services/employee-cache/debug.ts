/**
 * Employee Name Cache Debug Utilities
 * Helper functions for debugging and monitoring cache performance
 */

import { getEmployeeNameCache } from './EmployeeNameCache';
import type { CacheStats } from './types';

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): CacheStats {
  const cache = getEmployeeNameCache();
  return cache.getStats();
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  const cache = getEmployeeNameCache();
  cache.clear();
  console.log('[EmployeeNameCache] Cache cleared manually');
}

/**
 * Log cache statistics to console
 */
export function logCacheStats(): void {
  const stats = getCacheStats();
  console.log('[EmployeeNameCache] Cache Statistics:', {
    totalEntries: stats.totalEntries,
    hitCount: stats.hitCount,
    missCount: stats.missCount,
    hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
    oldestEntry: stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'None',
    newestEntry: stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'None',
  });
}

/**
 * Add cache debug functions to window object for browser console access
 * Only available in development mode
 */
export function enableCacheDebugConsole(): void {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as any).employeeCacheDebug = {
      getStats: getCacheStats,
      clearCache,
      logStats: logCacheStats,
    };
    
    console.log('[EmployeeNameCache] Debug functions available at window.employeeCacheDebug');
    console.log('Available functions: getStats(), clearCache(), logStats()');
  }
}
