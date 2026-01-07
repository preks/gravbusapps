/**
 * ServiceDeskCatalog Cache Module
 * Exports all public components and types
 */

export { 
  ServiceDeskCatalogCache, 
  getServiceDeskCatalogCache, 
  resetServiceDeskCatalogCache 
} from './ServiceDeskCatalogCache';

export { 
  ServiceDeskCatalogCacheProvider, 
  useServiceDeskCatalogCache, 
  useServiceDeskCatalogCacheOptional 
} from './ServiceDeskCatalogCacheProvider';

export { 
  getCatalogCacheStats, 
  clearCatalogCache, 
  logCatalogCacheStats, 
  enableCatalogCacheDebugConsole 
} from './debug';

export type * from './types';
