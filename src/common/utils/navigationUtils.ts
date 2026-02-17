interface NavigationMapping {
  [key: string]: string
}

// Mapping of platform URLs to app paths for development mode
const PLATFORM_URL_TO_APP_MAPPING: NavigationMapping = {
  // CRM

  /// Core: Apps
  '/platform/crm/customer-launcher': 'crm/core/apps/customer-launcher',
  '/platform/crm/customer-relations': 'crm/core/apps/customer-relations',
  '/platform/crm/customer-settings': 'crm/core/apps/customer-settings',
  '/platform/crm/data-import': 'crm/core/apps/data-import',

  ///  Core: Records
  '/platform/crm/account-record': 'crm/core/records/account-record',
  '/platform/crm/contact-record': 'crm/core/records/contact-record',
  '/platform/crm/lead-record': 'crm/core/records/lead-record',
  '/platform/crm/opportunity-record': 'crm/core/records/opportunity-record',

  /// Campaigns: Apps
  '/platform/crm/campaign-management': 'crm/campaigns/apps/campaign-management', // Standalone Campaigns Module

  /// Campaigns: Records
  '/platform/crm/campaign-record': 'crm/campaigns/records/campaign-record', // Standalone Campaigns Module

  /// Performance: Apps
  '/platform/crm/team-performance': 'crm/performance/apps/sales-team-performance', // TODO: Naming

  /// Performance: Records
  '/platform/crm/team-member-record': 'crm/common/apps/customer-member-record', // TODO: Create and extract from team-performance

  // IRM
  /// Core: Apps
  '/platform/irm/investment-launcher': 'irm/core/apps/investment-launcher',
  '/platform/irm/investment-relations': 'irm/core/apps/investment-relations',
  '/platform/irm/investment-settings': 'irm/core/apps/investment-settings',
  '/platform/irm/data-import': 'irm/core/apps/data-import',

  /// Core: Records
  '/platform/irm/account-record': 'irm/core/records/account-record',
  '/platform/irm/contact-record': 'irm/core/records/contact-record',
  '/platform/irm/lead-record': 'irm/core/records/lead-record',
  '/platform/irm/opportunity-record': 'irm/core/records/opportunity-record',

  /// Investments: Apps
  '/platform/irm/investment-management': 'irm/investments/apps/investment-management',
  '/platform/irm/investment-portal': 'irm/investments/apps/investment-portal',

  /// Investments: Records
  '/platform/irm/investment-record': 'irm/investments/records/investment-record',

  // FIN
  '/platform/fin/expenses/expense-plan-record': 'fin/expenses/apps/expense-plan-record',
  '/platform/fin/expenses/expense-request-record': 'fin/expenses/apps/expense-request-record',
  '/platform/fin/expenses/personal-expenses': 'fin/expenses/apps/personal-expenses',
  '/platform/fin/expenses/unallocated-expense-items': 'fin/expenses/apps/unallocated-expense-items',
  '/platform/fin/expenses/manager-expenses': 'fin/expenses/apps/manager-expenses',
  '/platform/fin/expenses/backoffice-expenses': 'fin/expenses/apps/backoffice-expenses',

  // HR
  '/platform/employee-record': 'hr/core/apps/employee-record',
  '/platform/hr/absences/manager-absences': 'hr/absences/apps/manager-absences',
  '/platform/onboarding-employee': 'hr/core/apps/onboarding-employee',

  /// Recruiting: Apps
  '/platform/hr/recruiting/recruiting-manager': 'hr/recruiting/apps/recruiting-manager',
  '/platform/hr/recruiting/recruiting-portal': 'hr/recruiting/apps/recruiting-portal',

  /// Recruiting: Records
  '/platform/hr/recruiting/job-posting-record': 'hr/recruiting/records/job-posting-record',
  '/platform/hr/recruiting/job-candidate-record': 'hr/recruiting/records/job-candidate-record',
  '/platform/hr/recruiting/job-application-record': 'hr/recruiting/records/job-application-record',

  '/platform/sales-demo/service-desk': 'ser/apps/service-desk',
  '/platform/sales-demo/service-launcher': 'ser/apps/service-portal',
  '/platform/mdm/pipeline-data': 'mdm/apps/pipeline-data',
  '/platform/mdm/lead-data': 'mdm/apps/lead-data',
  '/platform/mdm/operation-data': 'mdm/apps/operation-data',
  '/platform/mdm/engagement-data': 'mdm/apps/engagement-data',

  /// MDM: Records
  '/platform/mdm/company-record': 'mdm/records/company-record',

  // Platform
  '/platform/every-box': 'core/every/apps/every-box',
  '/platform/task-manager': 'core/every/apps/every-box',

  // Core
  '/platform/content/intranet': 'core/content/apps/content-portal',
  '/platform/content/intranet/content-record': 'core/content/records/content-record',

  // Platform
  '/platform/chat': 'platform/apps/chat', // Chat application
  '/platform/every-ai': 'platform/apps/every-ai',
  '/platform/debugger': 'platform/apps/debugger',
  '/platform/every-office': 'platform/apps/every-office',
  '/platform/spaces': 'platform/apps/spaces',
  '/platform/apps/desk': 'platform/apps/desk',
  '/platform/apps/document-apps': 'platform/apps/document-apps',
  '/platform/apps/note-apps': 'platform/apps/note-apps',
  '/platform/apps/spreadsheet-apps': 'platform/apps/spreadsheet-apps',
  '/platform/slides': 'platform/apps/slide-apps',
  '/platform/nexus': 'platform/apps/nexus',

  // Email
  '/platform/apps/email-apps': 'platform/apps/email-apps',
  '/platform/mail': 'platform/apps/email-apps',
  '/platform/mail/oauth/callback': 'platform/apps/email-apps',
  '/platform/mail/settings': 'platform/apps/email-provider-settings',

  // Canonical URLs for content apps (production-ready)
  '/platform/documents': 'platform/apps/document-apps',
  '/platform/notes': 'platform/apps/note-apps',
  '/platform/spreadsheets': 'platform/apps/spreadsheet-apps',

  // Create
  '/platform/create': 'core/create/apps/create-workspace',
  '/platform/create/function-manager': 'core/create/apps/function-manager',
  '/platform/create/prompt-manager': 'core/create/apps/prompt-manager',
  '/platform/create/ai-builder': 'core/create/apps/ai-builder',

  // Flow
  '/platform/apps/flow/apps/creator': 'flow/apps/creator',

  // Obsolete
  // TODO: Clean Up
  '/platform/crm/lead-list': 'crm/common/apps/lead-list',
  '/platform/irm/liquid-portfolio-record': 'crm/investments/apps/liquid-portfolio-record'
}

/** Canonical platform path for Every Office (Desk hub). Use with navigateTo(). */
export const EVERY_OFFICE_PLATFORM_PATH = '/platform/every-office'

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
 * Navigation options
 */
export interface NavigateOptions {
  /**
   * Force a window refresh via SPA navigation (not full page reload)
   * Adds a cache-busting parameter to ensure content refreshes when it has changed
   */
  forceReload?: boolean
}

/**
 * Handles navigation based on the environment
 * In production: uses the original URL
 * In development: converts platform URLs to app query parameters, keeps others unchanged
 */
export const navigateTo = (url: string, options?: NavigateOptions): void => {
  if (typeof window === 'undefined') {
    console.warn('Navigation called in non-browser environment')
    return
  }

  const { forceReload = false } = options || {}
  const isProduction = process.env.NODE_ENV === 'production'

  // Helper to get the target URL (converted in dev mode if needed)
  const getTargetUrl = (): string => {
    if (isProduction) {
      return url
    }
    // Development: convert platform URLs to query parameters
    if (isPlatformUrl(url)) {
      const queryParams = convertToDevQueryParams(url)
      return `${window.location.origin}${queryParams}`
    }
    return url
  }

  // If force reload is requested, add cache-busting parameter to ensure content refresh
  if (forceReload) {
    const baseTargetUrl = getTargetUrl()

    // Parse URL and add cache-busting parameter
    try {
      const urlObj = new URL(baseTargetUrl, window.location.origin)
      // Add cache-busting parameter to force content refresh via SPA navigation
      urlObj.searchParams.set('_refresh', Date.now().toString())
      const urlToNavigate = urlObj.pathname + urlObj.search + (urlObj.hash || '')

      if (isProduction) {
        const nwNavigate = (window as any).nwNavigate as
          | undefined
          | ((path: string, options?: { replace?: boolean; scroll?: boolean }) => void)
        if (typeof nwNavigate === 'function') {
          // Use SPA navigation to refresh window content without full page reload
          nwNavigate(urlToNavigate)
        } else {
          window.location.href = urlToNavigate
        }
      } else {
        // Development: navigate to URL with refresh param
        window.location.href = urlObj.toString()
      }
    } catch {
      // Fallback if URL parsing fails
      const separator = baseTargetUrl.includes('?') ? '&' : '?'
      const urlWithRefresh = `${baseTargetUrl}${separator}_refresh=${Date.now()}`
      window.location.href = urlWithRefresh
    }
    return
  }

  if (isProduction) {
    // Production: use host-provided SPA navigation if available, otherwise fallback
    const nwNavigate = (window as any).nwNavigate as
      | undefined
      | ((path: string, options?: { replace?: boolean; scroll?: boolean }) => void)
    if (typeof nwNavigate === 'function') {
      // Check if we're already on the same URL - if so, force reload
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (currentUrl === url) {
        // Same URL - force reload to refresh content
        window.location.reload()
      } else {
        nwNavigate(url)
      }
    } else {
      window.location.href = url
    }
  } else {
    // Development: check if it's a platform URL
    if (isPlatformUrl(url)) {
      // Convert to app query parameter and stay on localhost:3000
      const queryParams = convertToDevQueryParams(url)
      const currentOrigin = window.location.origin
      const targetUrl = `${currentOrigin}${queryParams}`

      // Check if we're already on the same URL - if so, force reload
      const currentUrl = window.location.href
      if (currentUrl === targetUrl) {
        window.location.reload()
      } else {
        window.location.href = targetUrl
      }
    } else {
      // Non-platform URLs (like orgchart) use original behavior
      const currentUrl = window.location.href
      if (currentUrl === url) {
        window.location.reload()
      } else {
        window.location.href = url
      }
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

/**
 * Get canonical URL for content apps (for sharing notifications, etc.)
 * Always returns production-style URLs regardless of environment
 */
export const getCanonicalContentUrl = (
  type: 'document' | 'spreadsheet' | 'note' | 'slide' | 'email',
  params?: Record<string, string>
): string => {
  const baseUrls = {
    document: '/platform/documents',
    spreadsheet: '/platform/spreadsheets',
    note: '/platform/notes',
    slide: '/platform/slides',
    email: '/platform/mail'
  }

  const basePath = baseUrls[type]
  return buildPlatformUrl(basePath, params)
}
