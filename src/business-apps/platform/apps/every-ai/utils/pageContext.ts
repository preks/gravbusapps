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
  { pattern: /\/platform\/orgchart\/([^/?]+)/, entity_name: 'employee' }
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
  { pattern: /\/platform\/irm\/investment-relations\?view=accounts/, entity_name: 'investment_account' }
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
