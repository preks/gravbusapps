/**
 * SER Configuration Exports
 */

import { SER_DATETIME_CONFIG } from './dateTimeConfig'
import { SERVICE_PORTAL_CONFIG } from './servicePortalConfig'

// Re-export as named exports
export { SER_DATETIME_CONFIG, SERVICE_PORTAL_CONFIG }

// Default export for wrapper compatibility
export default {
  SER_DATETIME_CONFIG,
  SERVICE_PORTAL_CONFIG
}
