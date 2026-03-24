interface NavigationMapping {
  [key: string]: string
}

export const NAVIGATION_BASE_PATH = '/platform'

export const Navigation = {
  // CRM
  CRM_CUSTOMER_LAUNCHER: `${NAVIGATION_BASE_PATH}/crm/customer-launcher`,
  CRM_CUSTOMER_RELATIONS: `${NAVIGATION_BASE_PATH}/crm/customer-relations`,
  CRM_CUSTOMER_SETTINGS: `${NAVIGATION_BASE_PATH}/crm/customer-settings`,
  CRM_CUSTOMER_DATA_IMPORT: `${NAVIGATION_BASE_PATH}/crm/data-import`,
  CRM_CUSTOMER_ACCOUNT_RECORD: `${NAVIGATION_BASE_PATH}/crm/account-record`,
  CRM_CUSTOMER_CONTACT_RECORD: `${NAVIGATION_BASE_PATH}/crm/contact-record`,
  CRM_CUSTOMER_LEAD_RECORD: `${NAVIGATION_BASE_PATH}/crm/lead-record`,
  CRM_CUSTOMER_OPPORTUNITY_RECORD: `${NAVIGATION_BASE_PATH}/crm/opportunity-record`,
  CRM_CAMPAIGN_MANAGEMENT: `${NAVIGATION_BASE_PATH}/crm/campaign-management`,
  CRM_CAMPAIGN_RECORD: `${NAVIGATION_BASE_PATH}/crm/campaign-record`,
  CRM_PERFORMANCE_TEAM_PERFORMANCE: `${NAVIGATION_BASE_PATH}/crm/team-performance`,
  CRM_PERFORMANCE_TEAM_MEMBER_RECORD: `${NAVIGATION_BASE_PATH}/crm/team-member-record`,

  // IRM
  IRM_INVESTMENT_LAUNCHER: `${NAVIGATION_BASE_PATH}/irm/investment-launcher`,
  IRM_INVESTMENT_RELATIONS: `${NAVIGATION_BASE_PATH}/irm/investment-relations`,
  IRM_INVESTMENT_SETTINGS: `${NAVIGATION_BASE_PATH}/irm/investment-settings`,
  IRM_INVESTMENT_DATA_IMPORT: `${NAVIGATION_BASE_PATH}/irm/data-import`,
  IRM_INVESTMENT_ACCOUNT_RECORD: `${NAVIGATION_BASE_PATH}/irm/account-record`,
  IRM_INVESTMENT_CONTACT_RECORD: `${NAVIGATION_BASE_PATH}/irm/contact-record`,
  IRM_INVESTMENT_LEAD_RECORD: `${NAVIGATION_BASE_PATH}/irm/lead-record`,
  IRM_INVESTMENT_OPPORTUNITY_RECORD: `${NAVIGATION_BASE_PATH}/irm/opportunity-record`,
  IRM_INVESTMENT_MANAGEMENT: `${NAVIGATION_BASE_PATH}/irm/investment-management`,
  IRM_INVESTMENT_PORTAL: `${NAVIGATION_BASE_PATH}/irm/investment-portal`,
  IRM_INVESTMENT_RECORD: `${NAVIGATION_BASE_PATH}/irm/investment-record`,

  // FIN
  FIN_EXPENSES_EXPENSE_PLAN_RECORD: `${NAVIGATION_BASE_PATH}/fin/expenses/expense-plan-record`,
  FIN_EXPENSES_EXPENSE_REQUEST_RECORD: `${NAVIGATION_BASE_PATH}/fin/expenses/expense-request-record`,
  FIN_EXPENSES_PERSONAL_ROLE: `${NAVIGATION_BASE_PATH}/fin/expenses/personal-expenses`,
  FIN_EXPENSES_UNALLOCATED_EXPENSE_ITEMS: `${NAVIGATION_BASE_PATH}/fin/expenses/unallocated-expense-items`,
  FIN_EXPENSES_MANAGER_ROLE: `${NAVIGATION_BASE_PATH}/fin/expenses/manager-expenses`,
  FIN_EXPENSES_BACKOFFICE_ROLE: `${NAVIGATION_BASE_PATH}/fin/expenses/backoffice-expenses`,

  // HR
  HR_EMPLOYEE_RECORD: `${NAVIGATION_BASE_PATH}/employee-record`,
  HR_ABSENCES_MANAGER_ROLE: `${NAVIGATION_BASE_PATH}/hr/absences/manager-absences`,
  HR_RECRUITING_MANAGER_ROLE: `${NAVIGATION_BASE_PATH}/hr/recruiting/recruiting-manager`,
  HR_RECRUITING_PORTAL: `${NAVIGATION_BASE_PATH}/hr/recruiting/recruiting-portal`,
  HR_RECRUITING_JOB_POSTING_RECORD: `${NAVIGATION_BASE_PATH}/hr/recruiting/job-posting-record`,
  HR_RECRUITING_JOB_CANDIDATE_RECORD: `${NAVIGATION_BASE_PATH}/hr/recruiting/job-candidate-record`,
  HR_RECRUITING_JOB_APPLICATION_RECORD: `${NAVIGATION_BASE_PATH}/hr/recruiting/job-application-record`,

  // Service
  SERVICE_DESK: `${NAVIGATION_BASE_PATH}/sales-demo/service-desk`,
  SERVICE_LAUNCHER: `${NAVIGATION_BASE_PATH}/sales-demo/service-launcher`,

  // MDM
  MDM_PIPELINE_DATA: `${NAVIGATION_BASE_PATH}/mdm/pipeline-data`,
  MDM_LEAD_DATA: `${NAVIGATION_BASE_PATH}/mdm/lead-data`,
  MDM_OPERATION_DATA: `${NAVIGATION_BASE_PATH}/mdm/operation-data`,
  MDM_ENGAGEMENT_DATA: `${NAVIGATION_BASE_PATH}/mdm/engagement-data`,
  MDM_COMPANY_RECORD: `${NAVIGATION_BASE_PATH}/mdm/company-record`,

  // Content
  CONTENT_PORTAL: `${NAVIGATION_BASE_PATH}/content/intranet`,
  CONTENT_ENTRY_RECORD: `${NAVIGATION_BASE_PATH}/content/intranet/content-record`,
  CONTENT_MANAGER: `${NAVIGATION_BASE_PATH}/content/manager`,

  // Manage
  MANAGE_CATALOGS: `${NAVIGATION_BASE_PATH}/catalog-manager`,

  // Platform
  PLATFORM_TASK_MANAGER: `${NAVIGATION_BASE_PATH}/task-manager`,
  PLATFORM_TEAM_CHAT: `${NAVIGATION_BASE_PATH}/chat`,
  PLATFORM_AI_CHAT: `${NAVIGATION_BASE_PATH}/every-ai`,
  PLATFORM_DEBUGGER: `${NAVIGATION_BASE_PATH}/debugger`,
  PLATFORM_BOARDS: `${NAVIGATION_BASE_PATH}/boards`,

  // Office
  OFFICE: `${NAVIGATION_BASE_PATH}/every-office`,
  OFFICE_SETTINGS: `${NAVIGATION_BASE_PATH}/every-office/settings`,
  OFFICE_CANVAS: `${NAVIGATION_BASE_PATH}/every-office/nexus`,
  OFFICE_DOCUMENTS: `${NAVIGATION_BASE_PATH}/every-office/documents`,
  OFFICE_DRIVE: `${NAVIGATION_BASE_PATH}/every-office/drive`,
  OFFICE_EMAILS: `${NAVIGATION_BASE_PATH}/every-office/emails`,
  OFFICE_EMAILS_OAUTH_CALLBACK: `${NAVIGATION_BASE_PATH}/mail/oauth/callback`,
  OFFICE_NOTES: `${NAVIGATION_BASE_PATH}/every-office/notes`,
  OFFICE_SLIDES: `${NAVIGATION_BASE_PATH}/every-office/slides`,
  OFFICE_SPACES: `${NAVIGATION_BASE_PATH}/every-office/spaces`,
  OFFICE_SPREADSHEETS: `${NAVIGATION_BASE_PATH}/every-office/spreadsheets`,

  // Create
  CREATE: `${NAVIGATION_BASE_PATH}/create`,
  CREATE_CONNECT: `${NAVIGATION_BASE_PATH}/create/connect`,
  CREATE_FUNCTION_MANAGER: `${NAVIGATION_BASE_PATH}/create/function-manager`,
  CREATE_PROMPT_MANAGER: `${NAVIGATION_BASE_PATH}/create/prompt-manager`,
  CREATE_SCREEN_BUILDER: `${NAVIGATION_BASE_PATH}/create/screen-builder`,
  CREATE_AI_BUILDER: `${NAVIGATION_BASE_PATH}/create/ai-builder`,
  CREATE_AI_BUILDER_ADMIN: `${NAVIGATION_BASE_PATH}/create/ai-builder-admin`,
  CREATE_AI_ORCHESTRATOR_ADMIN: `${NAVIGATION_BASE_PATH}/create/ai-orchestrator-admin`,
  CREATE_AI_BUILDER_METRICS: `${NAVIGATION_BASE_PATH}/create/ai-builder-metrics`,
  CREATE_AI_BUILDER_METRICS_APPS: `${NAVIGATION_BASE_PATH}/create/apps/ai-builder-metrics`,
  CREATE_RESOURCE_PREVIEW_DEMO: `${NAVIGATION_BASE_PATH}/create/resource-preview-demo`,
  CREATE_DEBUG_GENERATED_RESOURCE_URLS: `${NAVIGATION_BASE_PATH}/create/debug/generated-resource-urls`,
  CREATE_DEBUG_APPS_GENERATED_RESOURCE_URLS: `${NAVIGATION_BASE_PATH}/create/debug/apps/generated-resource-urls`,
  CREATE_PROMPT_MESH: `${NAVIGATION_BASE_PATH}/apps/agent-mesh`,
  CREATE_FLOW_CREATOR: `${NAVIGATION_BASE_PATH}/create/flow-creator`
} as const

// Mapping of platform URLs to app paths (exported for BusinessAppIDE path resolution)
export const PLATFORM_URL_TO_APP_MAPPING: NavigationMapping = {
  // CRM
  [Navigation.CRM_CUSTOMER_LAUNCHER]: 'crm/core/apps/customer-launcher',
  [Navigation.CRM_CUSTOMER_RELATIONS]: 'crm/core/apps/customer-relations',
  [Navigation.CRM_CUSTOMER_SETTINGS]: 'crm/core/apps/customer-settings',
  [Navigation.CRM_CUSTOMER_DATA_IMPORT]: 'crm/core/apps/data-import',
  [Navigation.CRM_CUSTOMER_ACCOUNT_RECORD]: 'crm/core/records/account-record',
  [Navigation.CRM_CUSTOMER_CONTACT_RECORD]: 'crm/core/records/contact-record',
  [Navigation.CRM_CUSTOMER_LEAD_RECORD]: 'crm/core/records/lead-record',
  [Navigation.CRM_CUSTOMER_OPPORTUNITY_RECORD]: 'crm/core/records/opportunity-record',
  [Navigation.CRM_CAMPAIGN_MANAGEMENT]: 'crm/campaigns/apps/campaign-management',
  [Navigation.CRM_CAMPAIGN_RECORD]: 'crm/campaigns/records/campaign-record',
  [Navigation.CRM_PERFORMANCE_TEAM_PERFORMANCE]: 'crm/performance/apps/sales-team-performance',
  [Navigation.CRM_PERFORMANCE_TEAM_MEMBER_RECORD]: 'crm/common/apps/customer-member-record',

  // IRM
  [Navigation.IRM_INVESTMENT_LAUNCHER]: 'irm/core/apps/investment-launcher',
  [Navigation.IRM_INVESTMENT_RELATIONS]: 'irm/core/apps/investment-relations',
  [Navigation.IRM_INVESTMENT_SETTINGS]: 'irm/core/apps/investment-settings',
  [Navigation.IRM_INVESTMENT_DATA_IMPORT]: 'irm/core/apps/data-import',
  [Navigation.IRM_INVESTMENT_ACCOUNT_RECORD]: 'irm/core/records/account-record',
  [Navigation.IRM_INVESTMENT_CONTACT_RECORD]: 'irm/core/records/contact-record',
  [Navigation.IRM_INVESTMENT_LEAD_RECORD]: 'irm/core/records/lead-record',
  [Navigation.IRM_INVESTMENT_OPPORTUNITY_RECORD]: 'irm/core/records/opportunity-record',
  [Navigation.IRM_INVESTMENT_MANAGEMENT]: 'irm/investments/apps/investment-management',
  [Navigation.IRM_INVESTMENT_PORTAL]: 'irm/investments/apps/investment-portal',
  [Navigation.IRM_INVESTMENT_RECORD]: 'irm/investments/records/investment-record',

  // FIN
  [Navigation.FIN_EXPENSES_EXPENSE_PLAN_RECORD]: 'fin/expenses/apps/expense-plan-record',
  [Navigation.FIN_EXPENSES_EXPENSE_REQUEST_RECORD]: 'fin/expenses/apps/expense-request-record',
  [Navigation.FIN_EXPENSES_PERSONAL_ROLE]: 'fin/expenses/apps/personal-expenses',
  [Navigation.FIN_EXPENSES_UNALLOCATED_EXPENSE_ITEMS]: 'fin/expenses/apps/unallocated-expense-items',
  [Navigation.FIN_EXPENSES_MANAGER_ROLE]: 'fin/expenses/apps/manager-expenses',
  [Navigation.FIN_EXPENSES_BACKOFFICE_ROLE]: 'fin/expenses/apps/backoffice-expenses',

  // HR
  [Navigation.HR_EMPLOYEE_RECORD]: 'hr/core/apps/employee-record',
  [Navigation.HR_ABSENCES_MANAGER_ROLE]: 'hr/absences/apps/manager-absences',
  [Navigation.HR_RECRUITING_MANAGER_ROLE]: 'hr/recruiting/apps/recruiting-manager',
  [Navigation.HR_RECRUITING_PORTAL]: 'hr/recruiting/apps/recruiting-portal',
  [Navigation.HR_RECRUITING_JOB_POSTING_RECORD]: 'hr/recruiting/records/job-posting-record',
  [Navigation.HR_RECRUITING_JOB_CANDIDATE_RECORD]: 'hr/recruiting/records/job-candidate-record',
  [Navigation.HR_RECRUITING_JOB_APPLICATION_RECORD]: 'hr/recruiting/records/job-application-record',

  // Service
  [Navigation.SERVICE_DESK]: 'ser/apps/service-desk',
  [Navigation.SERVICE_LAUNCHER]: 'ser/apps/service-portal',

  // MDM
  [Navigation.MDM_PIPELINE_DATA]: 'mdm/apps/pipeline-data',
  [Navigation.MDM_LEAD_DATA]: 'mdm/apps/lead-data',
  [Navigation.MDM_OPERATION_DATA]: 'mdm/apps/operation-data',
  [Navigation.MDM_ENGAGEMENT_DATA]: 'mdm/apps/engagement-data',
  [Navigation.MDM_COMPANY_RECORD]: 'mdm/records/company-record',

  // Content
  [Navigation.CONTENT_PORTAL]: 'core/content/apps/content-portal',
  [Navigation.CONTENT_ENTRY_RECORD]: 'core/content/records/content-record',
  [Navigation.CONTENT_MANAGER]: 'core/content/apps/content-manager',

  // Manage
  [Navigation.MANAGE_CATALOGS]: 'core/manage/apps/catalog-manager',

  // Platform
  [Navigation.PLATFORM_TASK_MANAGER]: 'core/every/apps/every-box',
  [Navigation.PLATFORM_TEAM_CHAT]: 'platform/apps/chat',
  [Navigation.PLATFORM_AI_CHAT]: 'platform/apps/every-ai',
  [Navigation.PLATFORM_DEBUGGER]: 'platform/apps/debugger',
  [Navigation.PLATFORM_BOARDS]: 'platform/apps/board-apps',

  // Office
  [Navigation.OFFICE]: 'core/office/apps/office-launcher',
  [Navigation.OFFICE_SETTINGS]: 'core/office/apps/office-settings',
  [Navigation.OFFICE_CANVAS]: 'core/office/apps/office-canvas',
  [Navigation.OFFICE_DOCUMENTS]: 'core/office/apps/documents',
  [Navigation.OFFICE_DRIVE]: 'core/office/apps/drive',
  [Navigation.OFFICE_EMAILS]: 'core/office/apps/emails',
  [Navigation.OFFICE_EMAILS_OAUTH_CALLBACK]: 'core/office/apps/emails',
  [Navigation.OFFICE_NOTES]: 'core/office/apps/notes',
  [Navigation.OFFICE_SLIDES]: 'core/office/apps/slides',
  [Navigation.OFFICE_SPACES]: 'core/office/apps/spaces',
  [Navigation.OFFICE_SPREADSHEETS]: 'core/office/apps/spreadsheets',

  // Create
  [Navigation.CREATE]: 'core/create/apps/create-workspace',
  [Navigation.CREATE_CONNECT]: 'core/create/apps/newwork-connect',
  [Navigation.CREATE_FUNCTION_MANAGER]: 'core/create/apps/function-manager',
  [Navigation.CREATE_PROMPT_MANAGER]: 'core/create/apps/prompt-manager',
  [Navigation.CREATE_SCREEN_BUILDER]: 'core/create/apps/ai-builder',
  [Navigation.CREATE_AI_BUILDER]: 'core/create/apps/ai-orchestrator',
  [Navigation.CREATE_AI_BUILDER_ADMIN]: 'core/create/apps/ai-builder-admin',
  [Navigation.CREATE_AI_ORCHESTRATOR_ADMIN]: 'core/create/apps/ai-builder-admin',
  [Navigation.CREATE_AI_BUILDER_METRICS]: 'core/create/apps/ai-builder-metrics-dashboard',
  [Navigation.CREATE_AI_BUILDER_METRICS_APPS]: 'core/create/apps/ai-builder-metrics-dashboard',
  [Navigation.CREATE_RESOURCE_PREVIEW_DEMO]: 'core/create/apps/resource-preview-demo',
  [Navigation.CREATE_DEBUG_GENERATED_RESOURCE_URLS]: 'core/create/debug/apps/generated-resource-urls-debug',
  [Navigation.CREATE_DEBUG_APPS_GENERATED_RESOURCE_URLS]: 'core/create/debug/apps/generated-resource-urls-debug',
  [Navigation.CREATE_PROMPT_MESH]: 'platform/apps/agent-mesh',
  [Navigation.CREATE_FLOW_CREATOR]: 'core/create/apps/flow-creator'
}

/**
 * Checks if a URL is a platform URL that should be mapped to app query parameters
 */
const isPlatformUrl = (url: string): boolean => {
  const urlPath = url.split('?')[0] // Remove query parameters to check the base path
  return Object.keys(PLATFORM_URL_TO_APP_MAPPING).some(platformPath => urlPath === platformPath)
}

/**
 * Handles navigation based on the environment
 * In production: uses the original URL
 * In development: converts platform URLs to app query parameters, keeps others unchanged
 */
export const navigateTo = (
  url: string,
  options?: {
    /**
     * Force a window refresh via SPA navigation (not full page reload)
     * Adds a cache-busting parameter to ensure content refreshes when it has changed
     */
    forceReload?: boolean
  }
): void => {
  if (typeof window === 'undefined') {
    console.warn('Navigation called in non-browser environment')
    return
  }

  const { forceReload = false } = options || {}
  const isProduction = process.env.NODE_ENV === 'production'

  // Helper to get the target URL. In dev we use the real platform path so the URL bar shows e.g. /platform/every-office.
  const getTargetUrl = (): string => {
    if (isProduction) {
      return url
    }
    if (isPlatformUrl(url)) {
      return `${window.location.origin}${url}`
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
        // Development: SPA navigation with refresh param so auth is preserved
        const targetPathAndSearch = urlObj.pathname + urlObj.search + (urlObj.hash || '')
        window.history.pushState(null, '', targetPathAndSearch)
        window.dispatchEvent(new PopStateEvent('popstate'))
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
    // Development: SPA navigation (pushState + popstate) so auth state and token are preserved
    const targetUrl = getTargetUrl()
    const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${window.location.origin}${targetUrl}`

    try {
      const urlObj = new URL(fullUrl)
      if (urlObj.origin !== window.location.origin) {
        window.location.href = fullUrl
        return
      }
      const targetPath = urlObj.pathname.replace(/\/$/, '') || '/'
      const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
      const targetPathAndSearch = targetPath + urlObj.search + (urlObj.hash || '')
      const currentPathAndSearchNorm = currentPath + window.location.search + (window.location.hash || '')
      if (currentPathAndSearchNorm === targetPathAndSearch) {
        return
      }
      window.history.pushState(null, '', urlObj.pathname + urlObj.search + (urlObj.hash || ''))
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch {
      window.location.href = fullUrl
    }
  }
}

/**
 * Opens a platform URL in a new browser tab.
 * Handles dev/prod URL conversion the same way navigateTo does.
 */
export const openInNewTab = (url: string): void => {
  if (typeof window === 'undefined') return
  const isProduction = process.env.NODE_ENV === 'production'
  const fullUrl = isProduction || !url.startsWith('/') ? url : `${window.location.origin}${url}`
  window.open(fullUrl, '_blank')
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
 * Returns current pathname + search with the given params applied (set or deleted).
 * Use when already on the target page (e.g. chat) and only search params should change (e.g. view=calendar&meetingId=xxx).
 * Pass null/undefined to remove a param. Preserves all other current search params.
 */
export const getCurrentUrlWithUpdatedSearchParams = (updates: Record<string, string | null | undefined>): string => {
  if (globalThis.window === undefined) return ''
  const params = new URLSearchParams(globalThis.window.location.search)
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) params.delete(key)
    else params.set(key, value)
  }
  const query = params.toString()
  const suffix = query ? '?' + query : ''
  return globalThis.window.location.pathname + suffix
}
