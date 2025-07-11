interface NavigationMapping {
  [key: string]: string;
}

// Mapping of platform URLs to app names for development mode
const PLATFORM_URL_TO_APP_MAPPING: NavigationMapping = {
  '/platform/crm/leads-overview': 'LeadsOverview',
  '/platform/crm/lead-record': 'LeadRecord',
  '/platform/crm/contact-record': 'ContactRecord',
  '/platform/fin/expenses/expense-plan-record': 'ExpensePlanRecord',
  '/platform/fin/expenses/expense-request-record': 'ExpenseRequestRecord',
  '/platform/employee-record': 'EmployeeRecord',
};

/**
 * Checks if a URL is a platform URL that should be mapped to app query parameters
 */
const isPlatformUrl = (url: string): boolean => {
  const urlPath = url.split('?')[0]; // Remove query parameters to check the base path
  return Object.keys(PLATFORM_URL_TO_APP_MAPPING).some(platformPath => 
    urlPath === platformPath
  );
};

/**
 * Extracts query parameters from a URL
 */
const extractQueryParams = (url: string): Record<string, string> => {
  const queryString = url.split('?')[1];
  if (!queryString) return {};
  
  const params: Record<string, string> = {};
  const urlParams = new URLSearchParams(queryString);
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
};

/**
 * Converts a platform URL to development query parameters
 */
const convertToDevQueryParams = (url: string): string => {
  const [basePath, queryString] = url.split('?');
  const appName = PLATFORM_URL_TO_APP_MAPPING[basePath];
  
  if (!appName) {
    console.warn(`No app mapping found for platform URL: ${basePath}`);
    return url;
  }
  
  const existingParams = queryString ? `&${queryString}` : '';
  return `?app=${appName}${existingParams}`;
};

/**
 * Handles navigation based on the environment
 * In production: uses the original URL
 * In development: converts platform URLs to app query parameters, keeps others unchanged
 */
export const navigateTo = (url: string): void => {
  if (typeof window === 'undefined') {
    console.warn('Navigation called in non-browser environment');
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: use original URL behavior
    window.location.href = url;
  } else {
    // Development: check if it's a platform URL
    if (isPlatformUrl(url)) {
      // Convert to app query parameter and stay on localhost:3000
      const queryParams = convertToDevQueryParams(url);
      const currentOrigin = window.location.origin;
      window.location.href = `${currentOrigin}${queryParams}`;
    } else {
      // Non-platform URLs (like orgchart) use original behavior
      window.location.href = url;
    }
  }
};

/**
 * Helper function to build platform URLs with parameters
 */
export const buildPlatformUrl = (basePath: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return basePath;
  }
  
  const queryString = new URLSearchParams(params).toString();
  return `${basePath}?${queryString}`;
}; 