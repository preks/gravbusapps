/**
 * Personal AI Agents
 *
 * Autonomous agents that monitor events, run on schedules, and send notifications.
 * Users create agents naturally through chat by messaging @Every.
 */

import type { FC } from 'react'

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

// Default export (required by build / remote wrapper chain). This barrel is hooks + services, not a routable screen;
// must be a valid component — `export default {}` breaks `wrapWithBlinkProvider` (React: element type is invalid … got: object).
const PersonalAgentsModuleStub: FC = () => null
export default PersonalAgentsModuleStub
