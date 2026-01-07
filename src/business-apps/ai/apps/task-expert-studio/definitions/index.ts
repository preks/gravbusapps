/**
 * Task Expert Studio - Tool Definitions
 *
 * Export all internal tool definitions for use in Task Experts
 */

// Internal Tools - Create and Update Leads, Opportunities, Contacts, Accounts
import INTERNAL_TOOLS from './internal-tools'
export * from './internal-tools'
export { INTERNAL_TOOLS }

// Runtime test tool (for development/testing)
export * from './runtime-capabilities-test'

// Default export for wrapper compatibility
export default {
  INTERNAL_TOOLS
}
