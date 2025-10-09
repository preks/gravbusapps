interface NavigationMapping {
  [key: string]: string
}

// Mapping of platform URLs to app paths for development mode
const PLATFORM_URL_TO_APP_MAPPING: NavigationMapping = {
  '/platform/crm/lead-list': 'crm/common/apps/lead-list',
  '/platform/crm/lead-record': 'crm/common/apps/lead-record',
  '/platform/crm/contact-record': 'crm/common/apps/contact-record',
  '/platform/crm/opportunity-record': 'crm/common/apps/opportunity-record',
  '/platform/crm/account-record': 'crm/common/apps/account-record',
  '/platform/crm/campaign-record': 'crm/common/apps/campaign-record',
  '/platform/crm/customer-relations': 'crm/common/apps/customer-relations',
  '/platform/crm/team-performance': 'crm/common/apps/customer-team-performance',
  '/platform/crm/team-member-record': 'crm/common/apps/customer-member-record',
  '/platform/irm/investment-relations': 'crm/investments/apps/investment-relations',
  '/platform/irm/investment-record': 'crm/investments/apps/investment-record',
  '/platform/irm/liquid-portfolio-record': 'crm/investments/apps/liquid-portfolio-record',
  '/platform/irm/lead-record': 'crm/investments/apps/investment-lead-record',
  '/platform/irm/account-record': 'crm/investments/apps/investment-account-record',
  '/platform/irm/contact-record': 'crm/investments/apps/investment-contact-record',
  '/platform/irm/opportunity-record': 'crm/investments/apps/investment-opportunity-record',
  '/platform/irm/investment-management': 'crm/investments/apps/investment-management',
  '/platform/fin/expenses/expense-plan-record': 'fin/expenses/apps/expense-plan-record',
  '/platform/fin/expenses/expense-request-record': 'fin/expenses/apps/expense-request-record',
  '/platform/fin/expenses/personal-expenses': 'fin/expenses/apps/personal-expenses',
  '/platform/fin/expenses/unallocated-expense-items': 'fin/expenses/apps/unallocated-expense-items',
  '/platform/fin/expenses/manager-expenses': 'fin/expenses/apps/manager-expenses',
  '/platform/fin/expenses/backoffice-expenses': 'fin/expenses/apps/backoffice-expenses',
  '/platform/employee-record': 'hr/core/apps/employee-record',
  '/platform/mdm/pipeline-data': 'mdm/apps/pipeline-data',
  '/platform/mdm/lead-data': 'mdm/apps/lead-data',
  '/platform/mdm/operation-data': 'mdm/apps/operation-data',
  '/platform/mdm/engagement-data': 'mdm/apps/engagement-data'
}

/**
 * Checks if a URL is a platform URL that should be mapped to app query parameters
 */
const isPlatformUrl = (url: string): boolean => {
  const urlPath = url.split('?')[0] // Remove query parameters to check the base path
  return Object.keys(PLATFORM_URL_TO_APP_MAPPING).some(platformPath => urlPath === platformPath)
}

/**
 * Converts a platform URL to development query parameters
 */
const convertToDevQueryParams = (url: string): string => {
  const [basePath, queryString] = url.split('?')
  const appPath = PLATFORM_URL_TO_APP_MAPPING[basePath]

  if (!appPath) {
    console.warn(`No app mapping found for platform URL: ${basePath}`)
    return url
  }

  // Platform URLs always map to app parameters
  const existingParams = queryString ? `&${queryString}` : ''
  return `?app=${appPath}${existingParams}`
}

/**
 * Handles navigation based on the environment
 * In production: uses the original URL
 * In development: converts platform URLs to app query parameters, keeps others unchanged
 */
export const navigateTo = (url: string): void => {
  if (typeof window === 'undefined') {
    console.warn('Navigation called in non-browser environment')
    return
  }

  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // Production: use original URL behavior
    window.location.href = url
  } else {
    // Development: check if it's a platform URL
    if (isPlatformUrl(url)) {
      // Convert to app query parameter and stay on localhost:3000
      const queryParams = convertToDevQueryParams(url)
      const currentOrigin = window.location.origin
      window.location.href = `${currentOrigin}${queryParams}`
    } else {
      // Non-platform URLs (like orgchart) use original behavior
      window.location.href = url
    }
  }
}

/**
 * Helper function to build platform URLs with parameters
 */
export const buildPlatformUrl = (basePath: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return basePath
  }

  const queryString = new URLSearchParams(params).toString()
  return `${basePath}?${queryString}`
}
