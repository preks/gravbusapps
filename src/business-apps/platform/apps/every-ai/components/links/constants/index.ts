/**
 * Entity link constants module.
 *
 * This module exports all configuration constants used for entity link handling:
 * - SUPPORTED_PROTOCOLS: List of all valid entity protocol schemes
 * - ENTITY_CONFIG: URL templates, icons, and styling for each entity type
 * - PROTOCOL_REDIRECTS: Mappings for relation entities to their parent entities
 */

export { SUPPORTED_PROTOCOLS, type SupportedProtocol } from './supportedProtocols'
export { ENTITY_CONFIG, type EntityChipConfig } from './entityConfig'
export { PROTOCOL_REDIRECTS } from './protocolRedirects'
