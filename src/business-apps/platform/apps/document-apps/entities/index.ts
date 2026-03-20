/**
 * Document template entities – registry and helpers
 */

export {
  TEMPLATE_ENTITY_REGISTRY,
  DOMAIN_DISPLAY_NAMES,
  DOMAIN_ORDER,
  formatTemplatePlaceholder,
  getTemplateEntities,
  getTemplateEntity
} from './templateEntityRegistry'
export type { TemplateEntityContext, TemplateEntityDomain, TemplateEntityDefinition } from './templateEntityRegistry'

export {
  TEMPLATE_CONTEXTS,
  ENTITY_KEYS_BY_CONTEXT,
  getTemplateContextDisplayName,
  getContextForCategory,
  getContextForEntityKeys
} from './templateContextConfig'
export type { TemplateContextOption } from './templateContextConfig'
