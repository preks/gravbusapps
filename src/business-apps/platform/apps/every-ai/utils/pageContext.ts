/**
 * Page context utilities for providing contextual information to the AI agent
 */
import type { CurrentPageContext } from '../types/models'

/**
 * URL patterns for entity pages with their corresponding entity names
 */
const ENTITY_URL_PATTERNS = [
  // IRM entities (check source=investments first for specificity)
  {
    pattern: /\/platform\/crm\/opportunity-record\?opportunityId=([^&]+).*source=investments/,
    entity_name: 'investment_opportunity'
  },

  // IRM entities (investment-specific)

  { pattern: /\/platform\/irm\/investment-record\?[^#]*investmentId=([^&]+)/, entity_name: 'investment' },
  { pattern: /\/platform\/irm\/lead-record\?leadId=([^&]+)/, entity_name: 'investment_lead' },
  { pattern: /\/platform\/irm\/contact-record\?contactId=([^&]+)/, entity_name: 'investment_contact' },
  { pattern: /\/platform\/irm\/company-record\?companyId=([^&]+)/, entity_name: 'investment_company' },
  { pattern: /\/platform\/irm\/account-record\?accountId=([^&]+)/, entity_name: 'investment_account' },

  // CRM entities (general patterns)
  { pattern: /\/platform\/crm\/opportunity-record\?opportunityId=([^&]+)/, entity_name: 'opportunity' },
  { pattern: /\/platform\/crm\/contact-record\?contactId=([^&]+)/, entity_name: 'contact' },
  { pattern: /\/platform\/crm\/company-record\?companyId=([^&]+)/, entity_name: 'company' },
  { pattern: /\/platform\/crm\/lead-record\?leadId=([^&]+)/, entity_name: 'lead' },
  { pattern: /\/platform\/crm\/account-record\?accountId=([^&]+)/, entity_name: 'account' },

  // Employee/HR entities
  { pattern: /\/platform\/employee-record\?employeeId=([^&]+)/, entity_name: 'employee' },
  { pattern: /\/platform\/employee\/([^/?]+)/, entity_name: 'employee' },
  { pattern: /\/platform\/orgchart\/([^/?]+)/, entity_name: 'employee' },

  // Content entities (Knowledge Articles, Documents)
  { pattern: /\/platform\/content\/intranet\/content-record\?[^#]*contentId=([^&]+)/, entity_name: 'content_entry' },
  { pattern: /\/platform\/content\/knowledge\/content-record\?[^#]*contentId=([^&]+)/, entity_name: 'content_entry' },
  { pattern: /content-record\?[^#]*contentId=([^&]+)/, entity_name: 'content_entry' },

  // Content editor (creating/editing articles)
  { pattern: /content-entry-window/, entity_name: 'content_editor' },

  // Document creator (creating contracts, agreements)
  { pattern: /document-creator/, entity_name: 'document_creator' },
  { pattern: /content-portal.*view=documents/, entity_name: 'document_creator' },

  // Flow/Workflow entities
  { pattern: /\/platform\/apps\/flow\/apps\/creator\?[^#]*templateId=([^&#]+)/, entity_name: 'workflow_template' },

  // Other entities
  { pattern: /\/platform\/documents\?docId=([^&]+)/, entity_name: 'document' },
  { pattern: /\/platform\/spreadsheets\?appId=([^&]+)/, entity_name: 'spreadsheet' },
  { pattern: /\/platform\/notes\?noteId=([^&]+)/, entity_name: 'note' },
  { pattern: /\/platform\/slides\?slideId=([^&]+)/, entity_name: 'slide' }
] as const

/**
 * URL patterns for overview pages
 */
const OVERVIEW_URL_PATTERNS = [
  // CRM customer-relations overviews
  { pattern: /\/platform\/crm\/customer-relations\?view=opportunities/, entity_name: 'opportunity' },
  { pattern: /\/platform\/crm\/customer-relations\?view=leads/, entity_name: 'lead' },
  { pattern: /\/platform\/crm\/customer-relations\?view=contacts/, entity_name: 'contact' },
  { pattern: /\/platform\/crm\/customer-relations\?view=companies/, entity_name: 'company' },
  { pattern: /\/platform\/crm\/customer-relations\?view=accounts/, entity_name: 'account' },

  // IRM investment-relations overviews
  { pattern: /\/platform\/irm\/investment-relations\?view=opportunities/, entity_name: 'investment_opportunity' },
  { pattern: /\/platform\/irm\/investment-relations\?view=leads/, entity_name: 'investment_lead' },
  { pattern: /\/platform\/irm\/investment-relations\?view=contacts/, entity_name: 'investment_contact' },
  { pattern: /\/platform\/irm\/investment-relations\?view=companies/, entity_name: 'investment_company' },
  { pattern: /\/platform\/irm\/investment-relations\?view=accounts/, entity_name: 'investment_account' },

  // IRM investment-management overviews
  { pattern: /\/platform\/irm\/investment-management\?view=investments/, entity_name: 'investment' },

  // Asset management overviews
  { pattern: /\/platform\/assets/, entity_name: 'asset' },

  // Other overviews
  { pattern: /\/platform\/documents/, entity_name: 'document' },
  { pattern: /\/platform\/spreadsheets/, entity_name: 'spreadsheet' },
  { pattern: /\/platform\/notes/, entity_name: 'note' },
  { pattern: /\/platform\/slides/, entity_name: 'slide' }
] as const

/**
 * Local dev (dynamic screen loader) app routes and matching entity configuration
 */
const APP_ENTITY_PATTERNS = [
  {
    pattern: /investments\/records\/investment-record$/,
    entity_name: 'investment',
    idParams: ['investmentId']
  },
  {
    pattern: /investments\/records\/lead-record$/,
    entity_name: 'investment_lead',
    idParams: ['leadId']
  },
  {
    pattern: /investments\/records\/contact-record$/,
    entity_name: 'investment_contact',
    idParams: ['contactId']
  },
  {
    pattern: /investments\/records\/company-record$/,
    entity_name: 'investment_company',
    idParams: ['companyId']
  },
  {
    pattern: /investments\/records\/account-record$/,
    entity_name: 'investment_account',
    idParams: ['accountId']
  },
  {
    pattern: /crm\/opportunity-record$/,
    entity_name: 'opportunity',
    idParams: ['opportunityId']
  },
  {
    pattern: /crm\/core\/records\/opportunity-record$/,
    entity_name: 'opportunity',
    idParams: ['opportunityId', 'id']
  },
  {
    pattern: /crm\/lead-record$/,
    entity_name: 'lead',
    idParams: ['leadId']
  },
  {
    pattern: /crm\/core\/records\/lead-record$/,
    entity_name: 'lead',
    idParams: ['leadId']
  },
  {
    pattern: /crm\/contact-record$/,
    entity_name: 'contact',
    idParams: ['contactId']
  },
  {
    pattern: /crm\/core\/records\/contact-record$/,
    entity_name: 'contact',
    idParams: ['contactId']
  },
  {
    pattern: /crm\/account-record$/,
    entity_name: 'account',
    idParams: ['accountId']
  },
  {
    pattern: /crm\/core\/records\/account-record$/,
    entity_name: 'account',
    idParams: ['accountId']
  }
] as const

/**
 * Parses the current page URL and returns appropriate context for the AI agent
 */
export function parsePageContext(url: string): CurrentPageContext {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const search = urlObj.search
    const fullPath = `${pathname}${search}`

    // Check for entity pages first (more specific)
    for (const { pattern, entity_name } of ENTITY_URL_PATTERNS) {
      const match = pattern.exec(fullPath)
      if (match?.[1]) {
        return {
          type: 'entity',
          entity_name,
          id: match[1]
        }
      }
    }

    // Check for overview pages
    for (const { pattern, entity_name } of OVERVIEW_URL_PATTERNS) {
      if (pattern.test(fullPath)) {
        return {
          type: 'overview',
          entity_name
        }
      }
    }

    // Support local dev URLs loaded via dynamic screen loader (?app=...)
    const appParam = urlObj.searchParams.get('app')
    if (appParam) {
      const normalizedApp = decodeURIComponent(appParam).replace(/^\//, '').split('?')[0]

      for (const { pattern, entity_name, idParams } of APP_ENTITY_PATTERNS) {
        if (pattern.test(normalizedApp)) {
          for (const idParam of idParams) {
            const entityId = urlObj.searchParams.get(idParam)
            if (entityId) {
              return {
                type: 'entity',
                entity_name,
                id: entityId
              }
            }
          }
        }
      }
    }

    // Default to unknown page
    return {
      type: 'unknown',
      url
    }
  } catch (error) {
    console.warn('parsePageContext: failed to parse URL', { url, error })
    return {
      type: 'unknown',
      url
    }
  }
}

/**
 * Gets current page context based on the browser's current URL
 */
export function getCurrentPageContext(): CurrentPageContext {
  if (typeof window === 'undefined') {
    return { type: 'unknown', url: '' }
  }

  return parsePageContext(window.location.href)
}

/**
 * Gets a human-readable description of the current page context
 */
export function getContextDescription(context: CurrentPageContext): string {
  const toFriendly = (name: string): string => name.replace(/_/g, ' ')

  switch (context.type) {
    case 'entity':
      return `${toFriendly(context.entity_name)} details`
    case 'overview':
      return `${toFriendly(context.entity_name)} overview`
    default:
      return ''
  }
}
