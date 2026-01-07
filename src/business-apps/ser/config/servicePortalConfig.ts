/**
 * Service Portal Configuration
 * Centralized configuration for Service Portal behavior
 */

export const SERVICE_PORTAL_CONFIG = {
  /**
   * App Filtering Configuration
   * Set to true to filter templates by Services app (tags.app = "Services" or "AppCatalog:1:SVC")
   * Set to false to show all available templates
   * 
   * TO ENABLE FILTERING: Change this value to `true`
   */
  FILTER_BY_SERVICES_APP: true,
  
  /**
   * Supported app tag values for Services filtering
   */
  SERVICES_APP_TAGS: ['Services', 'AppCatalog:1:SVC'] as const,
  
  /**
   * Default pagination settings
   */
  DEFAULT_TEMPLATE_LIMIT: 100,
  
  /**
   * Debug logging
   */
  ENABLE_DEBUG_LOGGING: true
} as const;

/**
 * Helper function to check if a template belongs to Services app
 */
export const isServicesAppTemplate = (appTag?: string): boolean => {
  if (!appTag) return false;
  return SERVICE_PORTAL_CONFIG.SERVICES_APP_TAGS.includes(appTag as any);
};
