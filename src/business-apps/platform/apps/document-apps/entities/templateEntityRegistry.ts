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

export type TemplateEntityDomain = 'nw_orgchart' | 'nw_employee' | 'nw_recruiting' | 'nw_catalog'

/**
 * Known context tags for scoping which entities appear in the Insert Field panel.
 * Add new contexts here and assign them to entities in the registry.
 */
export type TemplateEntityContext = 'candidate' | 'onboarding' | 'employee'

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

/**
 * Registry: entities and their backend link. No field list – BE provides mapping.
 */
export const TEMPLATE_ENTITY_REGISTRY: TemplateEntityDefinition[] = [
  // ----- nw_orgchart -----
  {
    entityKey: 'employee_position',
    displayName: 'Employee position',
    domain: 'nw_orgchart',
    graphqlTypeName: 'EmployeePosition',
    contexts: ['candidate']
  },
  {
    entityKey: 'company',
    displayName: 'Company',
    domain: 'nw_orgchart',
    graphqlTypeName: 'Company',
    contexts: ['candidate', 'onboarding']
  },
  {
    entityKey: 'company_address',
    displayName: 'Company address',
    domain: 'nw_orgchart',
    graphqlTypeName: 'CompanyAddress',
    contexts: ['candidate', 'onboarding']
  },

  // ----- nw_employee -----
  {
    entityKey: 'employee',
    displayName: 'Employee',
    domain: 'nw_employee',
    graphqlTypeName: 'Employee',
    contexts: ['candidate']
  },
  {
    entityKey: 'employee_address',
    displayName: 'Employee address',
    domain: 'nw_employee',
    graphqlTypeName: 'EmployeeAddress',
    contexts: ['candidate']
  },

  // ----- nw_recruiting -----
  {
    entityKey: 'job_candidate',
    displayName: 'Job candidate',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobCandidate',
    contexts: ['candidate']
  },
  {
    entityKey: 'job_application',
    displayName: 'Job application',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobApplication',
    contexts: ['candidate']
  },
  {
    entityKey: 'job_request',
    displayName: 'Job request',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobRequest',
    contexts: ['candidate']
  },
  {
    entityKey: 'job_position',
    displayName: 'Job position',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobPosition',
    contexts: ['candidate']
  },
  {
    entityKey: 'job_posting',
    displayName: 'Job posting',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobPosting',
    contexts: ['candidate']
  },

  // ----- nw_catalog (contract type and employment type only) -----
  {
    entityKey: 'contract_type',
    displayName: 'Contract type',
    domain: 'nw_catalog',
    graphqlTypeName: 'ContractType',
    contexts: ['candidate']
  },
  {
    entityKey: 'employment_type',
    displayName: 'Employment type',
    domain: 'nw_catalog',
    graphqlTypeName: 'EmploymentType',
    contexts: ['candidate']
  }
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
