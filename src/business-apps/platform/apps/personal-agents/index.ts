/**
 * Personal AI Agents
 *
 * Autonomous agents that monitor events, run on schedules, and send notifications.
 * Users create agents naturally through chat by messaging @Every.
 */

// Types
export * from './types'

// Services
export { AgentParserService } from './services/AgentParserService'
export { AgentRegistryService } from './services/AgentRegistryService'
export { AgentActionsService } from './services/AgentActionsService'

// Hooks
export { usePersonalAgents } from './hooks/usePersonalAgents'

// Components
export { AgentCreationDialog } from './components/AgentCreationDialog'

// Prompts
export { AGENT_PARSER_SYSTEM_PROMPT, AGENT_PARSER_USER_PROMPT } from './prompts/agent-parser-prompt'

// Default export (required by build system)
// Personal agents is a service module, not a standalone app
// Export an empty object as default to satisfy the build requirement
export default {}
