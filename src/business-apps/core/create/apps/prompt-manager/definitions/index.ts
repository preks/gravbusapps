/**
 * Task Expert Studio - Tool Definitions
 *
 * Export all internal tool definitions for use in Task Experts
 */

// Internal Tools - Create and Update Leads, Opportunities, Contacts, Accounts
import INTERNAL_TOOLS from './internal-tools'
export * from './internal-tools'
export { INTERNAL_TOOLS }

// Customer 360 provider tool - read the normalized aggregated snapshot
export * from './customer-360-tool'

// Customer 360 portfolio provider tool - ranked book-of-business for Home
export * from './customer-portfolio-tool'

// Customer 360 inbound triage provider tool - resolve sender email to customer
export * from './resolve-customer-tool'

// Runtime test tool (for development/testing)
export * from './runtime-capabilities-test'

// Default export for wrapper compatibility
export default {
  INTERNAL_TOOLS
}
