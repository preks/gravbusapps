/**
 * Shared collaboration utilities
 *
 * This module exports all collaboration-related components, hooks, and services
 * for real-time document and spreadsheet collaboration.
 */

// Services
export {
  CollaborationClient,
  createCollaborationClient,
  type DocumentParticipant,
  type DocumentOperation,
  type CollaborationWebSocketOptions,
  type CollaborationEventHandler
} from './services/CollaborationClient'

// Hooks
export { useCollaboration, type UseCollaborationOptions, type UseCollaborationReturn } from './hooks/useCollaboration'

// Components
export { PresenceIndicator, type PresenceIndicatorProps } from './components/PresenceIndicator'
export { CollaboratorCursor, type CollaboratorCursorProps } from './components/CollaboratorCursor'
export { CellCollaboratorIndicator, type CellCollaboratorIndicatorProps } from './components/CellCollaboratorIndicator'
