interface NavigationMapping {
  [key: string]: string;
}

// Mapping of platform URLs to app names for development mode
const PLATFORM_URL_TO_APP_MAPPING: NavigationMapping = {
  '/platform/crm/lead-list': 'LeadList',
  '/platform/crm/lead-record': 'LeadRecord',
  '/platform/crm/contact-record': 'ContactRecord',
  '/platform/crm/opportunity-record': 'OpportunityRecord',
  '/platform/crm/account-record': 'AccountRecord',
  '/platform/crm/campaign-record': 'CampaignRecord',
  '/platform/crm/customer-relations': 'CustomerRelations',
  '/platform/irm/investment-relations': 'InvestmentRelations',
  '/platform/fin/expenses/expense-plan-record': 'ExpensePlanRecord',
  '/platform/fin/expenses/expense-request-record': 'ExpenseRequestRecord',
  '/platform/fin/expenses/personal-expenses': 'PersonalExpenses',
  '/platform/fin/expenses/manager-expenses': 'ManagerExpenses',
  '/platform/fin/expenses/backoffice-expenses': 'BackofficeExpenses',
  '/platform/employee-record': 'EmployeeRecord',
  '/platform/mdm/pipeline-data': 'PipelineData',
  '/platform/mdm/lead-data': 'LeadData',
  '/platform/mdm/operation-data': 'OperationData',
  '/platform/mdm/engagement-data': 'EngagementData',
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
 * Handles navigation based on the environment using pushState for smoother navigation
 * In production: uses pushState for internal URLs, full navigation for external URLs
 * In development: converts platform URLs to app query parameters, uses pushState for smoother experience
 */
export const navigateTo = (url: string): void => {
  if (typeof window === 'undefined') {
    console.warn('Navigation called in non-browser environment');
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if URL is external (different origin) or absolute URL
  const isExternal = url.startsWith('http') && !url.startsWith(window.location.origin);
  
  if (isExternal) {
    // External URLs should use full page navigation
    window.location.href = url;
    return;
  }
  
  if (isProduction) {
    // Production: use pushState for smoother internal navigation
    window.history.pushState(null, '', url);
    
    // Dispatch a custom event to notify the application of the navigation
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  } else {
    // Development: check if it's a platform URL
    if (isPlatformUrl(url)) {
      // Convert to app query parameter and stay on localhost
      const queryParams = convertToDevQueryParams(url);
      const currentOrigin = window.location.origin;
      const fullUrl = `${currentOrigin}${queryParams}`;
      window.history.pushState(null, '', fullUrl);
      
      // Dispatch a custom event to notify the application of the navigation
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    } else {
      // Non-platform URLs use pushState for internal navigation
      window.history.pushState(null, '', url);
      
      // Dispatch a custom event to notify the application of the navigation
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
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