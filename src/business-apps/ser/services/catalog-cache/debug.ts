/**
 * Debug utilities for ServiceDeskCatalogCache
 * Provides console functions for monitoring cache performance
 */

import { getServiceDeskCatalogCache } from './ServiceDeskCatalogCache';
import { CatalogCacheConfig } from './types';

/**
 * Get cache statistics
 */
export function getCatalogCacheStats() {
  try {
    const cache = getServiceDeskCatalogCache();
    return cache.getStats();
  } catch (error) {
    console.error('[CatalogCacheDebug] Error getting cache stats:', error);
    return null;
  }
}

/**
 * Clear the catalog cache
 */
export function clearCatalogCache() {
  try {
    const cache = getServiceDeskCatalogCache();
    cache.clear();
    console.log('[CatalogCacheDebug] ✅ Cache cleared successfully');
  } catch (error) {
    console.error('[CatalogCacheDebug] Error clearing cache:', error);
  }
}

/**
 * Log current cache statistics to console
 */
export function logCatalogCacheStats() {
  const stats = getCatalogCacheStats();
  if (stats) {
    console.log('[CatalogCacheDebug] 📊 Cache Statistics:', {
      hasData: stats.hasData,
      lastFetchTime: stats.lastFetchTime ? new Date(stats.lastFetchTime).toLocaleString() : 'Never',
      ageMs: stats.ageMs,
      ageMinutes: stats.ageMs ? Math.round(stats.ageMs / 60000 * 100) / 100 : null,
      isExpired: stats.isExpired,
    });
  }
}

/**
 * Enable debug console functions for ServiceDeskCatalogCache
 * Adds global functions to window object for easy debugging
 */
export function enableCatalogCacheDebugConsole() {
  if (typeof window !== 'undefined') {
    // Add debug functions to window object
    (window as any).catalogCacheDebug = {
      getStats: getCatalogCacheStats,
      clearCache: clearCatalogCache,
      logStats: logCatalogCacheStats,
    };

    console.log('[CatalogCacheDebug] 🛠️  Debug functions enabled:');
    console.log('[CatalogCacheDebug] • window.catalogCacheDebug.getStats() - Get cache statistics');
    console.log('[CatalogCacheDebug] • window.catalogCacheDebug.clearCache() - Clear cache');
    console.log('[CatalogCacheDebug] • window.catalogCacheDebug.logStats() - Log cache statistics');
  }
}
