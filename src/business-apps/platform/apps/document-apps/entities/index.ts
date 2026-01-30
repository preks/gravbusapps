/**
 * Document template entities – registry and helpers
 */

export {
  TEMPLATE_ENTITY_REGISTRY,
  formatTemplatePlaceholder,
  getTemplateEntities,
  getTemplateEntity
} from './templateEntityRegistry'
export type { TemplateEntityContext, TemplateEntityDomain, TemplateEntityDefinition } from './templateEntityRegistry'

export {
  TEMPLATE_CONTEXTS,
  ENTITY_KEYS_BY_CONTEXT,
  getTemplateContextDisplayName,
  getContextForCategory
} from './templateContextConfig'
export type { TemplateContextOption } from './templateContextConfig'
