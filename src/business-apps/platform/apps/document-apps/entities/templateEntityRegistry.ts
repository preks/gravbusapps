/**
 * Template Entity Registry
 *
 * Link layer only: which entities exist and how the backend (BE) maps them to
 * GraphQL / data. No hardcoded fields – the BE uses these mappings to know how
 * to resolve placeholders (e.g. job_candidate → JobCandidate GraphQL type).
 *
 * Domains:
 * - nw_orgchart: employee_position, company, company_address
 * - nw_employee: employee, employee_address
 * - nw_employee_expense: expense_plan, adv_payment, expense_request_trip
 * - nw_recruiting: job_candidate, job_application, job_request, job_position, job_posting
 * - nw_catalog: contract_type, employment_type only
 *
 * Contexts: which entities appear per context is defined in templateContextConfig
 * (ENTITY_KEYS_BY_CONTEXT). When the backend is ready, replace that config with an API.
 *
 * Field lists for the "Insert field" UI come from GraphQL introspection
 * using graphqlTypeName. The BE owns the schema and mapping at generation time.
 */

import { ENTITY_KEYS_BY_CONTEXT } from './templateContextConfig'

export type TemplateEntityDomain =
  | 'nw_orgchart'
  | 'nw_employee'
  | 'nw_employee_expense'
  | 'nw_recruiting'
  | 'nw_catalog'

/** Display names for grouping entities in the Insert field panel by origin/schema */
export const DOMAIN_DISPLAY_NAMES: Record<TemplateEntityDomain, string> = {
  nw_orgchart: 'Org Chart',
  nw_employee: 'Employee',
  nw_employee_expense: 'Expenses',
  nw_recruiting: 'Recruiting',
  nw_catalog: 'Catalog'
}

/** Order of domains for consistent grouping in the UI */
export const DOMAIN_ORDER: TemplateEntityDomain[] = [
  'nw_orgchart',
  'nw_employee',
  'nw_recruiting',
  'nw_employee_expense',
  'nw_catalog'
]

/**
 * Known context tags for scoping which entities appear in the Insert Field panel.
 * Add new contexts here and assign them to entities in the registry.
 */
export type TemplateEntityContext = 'candidate' | 'onboarding' | 'employee' | 'expenses'

/**
 * Entity definition – link only. No fields; BE knows the schema from GraphQL / model.
 */
export interface TemplateEntityDefinition {
  /** Entity key used in placeholders (e.g. job_candidate, company) */
  entityKey: string
  /** Human-readable name for UI */
  displayName: string
  /** Domain this entity belongs to */
  domain: TemplateEntityDomain
  /**
   * GraphQL type name (or BE mapping key) so the backend knows how to map
   * this entity to data when resolving placeholders.
   */
  graphqlTypeName: string
  /**
   * Optional: context tags (e.g. 'candidate', 'onboarding'). When a context
   * is set, only entities that include that context are shown. Omit = shown in all contexts.
   */
  contexts?: TemplateEntityContext[]
}

function entity(
  entityKey: string,
  displayName: string,
  domain: TemplateEntityDomain,
  graphqlTypeName: string,
  contexts: TemplateEntityContext[] = ['candidate']
): TemplateEntityDefinition {
  return { entityKey, displayName, domain, graphqlTypeName, contexts }
}

/**
 * Registry: entities and their backend link. No field list – BE provides mapping.
 */
export const TEMPLATE_ENTITY_REGISTRY: TemplateEntityDefinition[] = [
  // ----- nw_orgchart -----
  entity('employee_position', 'Employee position', 'nw_orgchart', 'EmployeePosition', ['candidate', 'expenses']),
  entity('company', 'Company', 'nw_orgchart', 'Company', ['candidate', 'onboarding']),
  entity('company_address', 'Company address', 'nw_orgchart', 'CompanyAddress', ['candidate', 'onboarding']),
  // ----- nw_employee -----
  entity('employee', 'Employee', 'nw_employee', 'Employee'),
  entity('employee_address', 'Employee address', 'nw_employee', 'EmployeeAddress'),
  // ----- nw_recruiting -----
  entity('job_candidate', 'Job candidate', 'nw_recruiting', 'JobCandidate'),
  entity('job_application', 'Job application', 'nw_recruiting', 'JobApplication'),
  entity('job_request', 'Job request', 'nw_recruiting', 'JobRequest'),
  entity('job_position', 'Job position', 'nw_recruiting', 'JobPosition'),
  entity('job_posting', 'Job posting', 'nw_recruiting', 'JobPosting'),
  // ----- nw_catalog (contract type, employment type, currency) -----
  entity('contract_type', 'Contract type', 'nw_catalog', 'ContractType'),
  entity('employment_type', 'Employment type', 'nw_catalog', 'EmploymentType'),
  entity('currency', 'Currency', 'nw_catalog', 'Currency', ['expenses']),
  // ----- nw_employee_expense -----
  entity('expense_plan', 'Expense plan', 'nw_employee_expense', 'ExpensePlan', ['expenses']),
  entity('adv_payment', 'Advance payment', 'nw_employee_expense', 'AdvancePayment', ['expenses']),
  entity('expense_request_trip', 'Expense request trip', 'nw_employee_expense', 'ExpenseRequestTrip', ['expenses'])
]

/** Placeholder format: {{entityKey.fieldKey}} */
export function formatTemplatePlaceholder(entityKey: string, fieldKey: string): string {
  return `{{${entityKey}.${fieldKey}}}`
}

/**
 * Get entities, optionally filtered by domain and/or context.
 * - No context: returns all entities (or all in domain).
 * - With context: uses templateContextConfig (ENTITY_KEYS_BY_CONTEXT) when defined
 *   for that context; otherwise falls back to entity.contexts.
 */
export function getTemplateEntities(
  domain?: TemplateEntityDomain,
  context?: TemplateEntityContext
): TemplateEntityDefinition[] {
  let list: TemplateEntityDefinition[]

  if (context != null) {
    const keys = ENTITY_KEYS_BY_CONTEXT[context]
    if (keys?.length) {
      list = keys
        .map(k => TEMPLATE_ENTITY_REGISTRY.find(e => e.entityKey === k))
        .filter((e): e is TemplateEntityDefinition => e != null)
    } else {
      list = TEMPLATE_ENTITY_REGISTRY.filter(
        e => !e.contexts || e.contexts.length === 0 || e.contexts.includes(context)
      )
    }
  } else {
    list = [...TEMPLATE_ENTITY_REGISTRY]
  }

  if (domain) {
    list = list.filter(e => e.domain === domain)
  }
  return list
}

/** Get one entity by key */
export function getTemplateEntity(entityKey: string): TemplateEntityDefinition | undefined {
  return TEMPLATE_ENTITY_REGISTRY.find(e => e.entityKey === entityKey)
}
