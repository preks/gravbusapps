import {
  ANNUAL_REVENUE,
  COMPANY_SIZE,
  LEAD_RATING,
  LEAD_SOURCE,
  LEAD_STATUS
} from '@/common/data/customer/constants/customerCatalogs'
import { COUNTRY, COUNTRY_REGION, INDUSTRY_CLASS, LEGAL_FORM } from '@/common/constants/commonCatalogs'

export type LeadCriterionValueKind = 'catalog' | 'text'

export interface LeadCriterionDefinition {
  /** Stable snake_case key stored as top-level `objectValue` property (matches lead field semantics). */
  id: string
  /** Fluent message id suffix: `icp-criterion-field-{id}` in customer-settings `_i18n`. */
  labelKeySuffix: string
  valueKind: LeadCriterionValueKind
  /** `identifier:version` catalog ref when `valueKind === 'catalog'`. */
  catalogRef?: string
}

/**
 * Allowed ICP criteria aligned with CRM Lead / company fields (see `Lead` / GetLeadById GraphQL).
 * Users pick one of these dimensions instead of free-text attribute keys.
 */
export const LEAD_CRITERION_DEFINITIONS: readonly LeadCriterionDefinition[] = [
  { id: 'lead_status', labelKeySuffix: 'lead_status', valueKind: 'catalog', catalogRef: LEAD_STATUS },
  { id: 'lead_source', labelKeySuffix: 'lead_source', valueKind: 'catalog', catalogRef: LEAD_SOURCE },
  { id: 'lead_rating', labelKeySuffix: 'lead_rating', valueKind: 'catalog', catalogRef: LEAD_RATING },
  { id: 'company_size', labelKeySuffix: 'company_size', valueKind: 'catalog', catalogRef: COMPANY_SIZE },
  { id: 'annual_revenue', labelKeySuffix: 'annual_revenue', valueKind: 'catalog', catalogRef: ANNUAL_REVENUE },
  { id: 'industry', labelKeySuffix: 'industry', valueKind: 'catalog', catalogRef: INDUSTRY_CLASS },
  { id: 'country', labelKeySuffix: 'country', valueKind: 'catalog', catalogRef: COUNTRY },
  { id: 'legal_form', labelKeySuffix: 'legal_form', valueKind: 'catalog', catalogRef: LEGAL_FORM },
  { id: 'region', labelKeySuffix: 'region', valueKind: 'catalog', catalogRef: COUNTRY_REGION },
  { id: 'company_name', labelKeySuffix: 'company_name', valueKind: 'text' },
  { id: 'first_name', labelKeySuffix: 'first_name', valueKind: 'text' },
  { id: 'last_name', labelKeySuffix: 'last_name', valueKind: 'text' },
  { id: 'email', labelKeySuffix: 'email', valueKind: 'text' },
  { id: 'company_email', labelKeySuffix: 'company_email', valueKind: 'text' },
  { id: 'phone_number', labelKeySuffix: 'phone_number', valueKind: 'text' },
  { id: 'position', labelKeySuffix: 'position', valueKind: 'text' },
  { id: 'postal_code', labelKeySuffix: 'postal_code', valueKind: 'text' },
  { id: 'locality', labelKeySuffix: 'locality', valueKind: 'text' },
  { id: 'company_website', labelKeySuffix: 'company_website', valueKind: 'text' }
] as const

const DEFINITION_BY_ID = new Map<string, LeadCriterionDefinition>(LEAD_CRITERION_DEFINITIONS.map(d => [d.id, d]))

export function getLeadCriterionDefinition(id: string): LeadCriterionDefinition | undefined {
  return DEFINITION_BY_ID.get(id)
}

export function isKnownLeadCriterionKey(id: string): boolean {
  return DEFINITION_BY_ID.has(id)
}

/** Split `SalesLeadStatus:v1` → identifier + version for catalog queries. */
export function splitCatalogRef(ref: string): { catalogIdentifier: string; version: string } {
  const idx = ref.indexOf(':')
  if (idx === -1) {
    return { catalogIdentifier: ref, version: 'v1' }
  }
  return { catalogIdentifier: ref.slice(0, idx), version: ref.slice(idx + 1) || 'v1' }
}
