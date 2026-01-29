/**
 * Template Entity Registry
 *
 * Link layer only: which entities exist and how the backend (BE) maps them to
 * GraphQL / data. No hardcoded fields – the BE uses these mappings to know how
 * to resolve placeholders (e.g. job_candidate → JobCandidate GraphQL type).
 *
 * Domains:
 * - nw_orgchart: employee_position, company, company_address
 * - nw_recruiting: job_candidate, job_application, job_request, job_position
 * - nw_catalog: contract_type, employment_type only
 *
 * Field lists for the "Insert field" UI come from GraphQL introspection
 * using graphqlTypeName. The BE owns the schema and mapping at generation time.
 */

export type TemplateEntityDomain = 'nw_orgchart' | 'nw_recruiting' | 'nw_catalog'

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
    graphqlTypeName: 'EmployeePosition'
  },
  {
    entityKey: 'company',
    displayName: 'Company',
    domain: 'nw_orgchart',
    graphqlTypeName: 'Company'
  },
  {
    entityKey: 'company_address',
    displayName: 'Company address',
    domain: 'nw_orgchart',
    graphqlTypeName: 'CompanyAddress'
  },

  // ----- nw_recruiting -----
  {
    entityKey: 'job_candidate',
    displayName: 'Job candidate',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobCandidate'
  },
  {
    entityKey: 'job_application',
    displayName: 'Job application',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobApplication'
  },
  {
    entityKey: 'job_request',
    displayName: 'Job request',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobRequest'
  },
  {
    entityKey: 'job_position',
    displayName: 'Job position',
    domain: 'nw_recruiting',
    graphqlTypeName: 'JobPosition'
  },

  // ----- nw_catalog (contract type and employment type only) -----
  {
    entityKey: 'contract_type',
    displayName: 'Contract type',
    domain: 'nw_catalog',
    graphqlTypeName: 'ContractType'
  },
  {
    entityKey: 'employment_type',
    displayName: 'Employment type',
    domain: 'nw_catalog',
    graphqlTypeName: 'EmploymentType'
  }
]

/** Placeholder format: {{entityKey.fieldKey}} */
export function formatTemplatePlaceholder(entityKey: string, fieldKey: string): string {
  return `{{${entityKey}.${fieldKey}}}`
}

/** Get all entities, optionally filtered by domain */
export function getTemplateEntities(domain?: TemplateEntityDomain): TemplateEntityDefinition[] {
  if (!domain) return TEMPLATE_ENTITY_REGISTRY
  return TEMPLATE_ENTITY_REGISTRY.filter(e => e.domain === domain)
}

/** Get one entity by key */
export function getTemplateEntity(entityKey: string): TemplateEntityDefinition | undefined {
  return TEMPLATE_ENTITY_REGISTRY.find(e => e.entityKey === entityKey)
}
