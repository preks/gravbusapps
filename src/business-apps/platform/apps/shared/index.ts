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
export {
  useOrganizationalDimensions,
  type UseOrganizationalDimensionsResult
} from './hooks/useOrganizationalDimensions'
export { useHubPagination } from './hooks/useHubPagination'

// Components
export { PresenceIndicator, type PresenceIndicatorProps } from './components/PresenceIndicator'
export { HubPaginationFooter, type HubPaginationFooterProps } from './components/HubPaginationFooter'
export { CollaboratorCursor, type CollaboratorCursorProps } from './components/CollaboratorCursor'
export { CellCollaboratorIndicator, type CellCollaboratorIndicatorProps } from './components/CellCollaboratorIndicator'
export { DimensionPicker, type DimensionPickerProps } from './components/DimensionPicker'

// Types
export {
  type DimensionType,
  type DimensionOption,
  type DimensionWithMembers,
  type SelectedDimension,
  type DimensionPickerTranslations,
  DEFAULT_DIMENSION_TRANSLATIONS
} from './types/dimensions'

/**
 * Default export exists to satisfy the auto-generated wrapped entry at
 * `src/wrapped-entries/platform/apps/shared.ts`.
 *
 * This module is a shared utilities barrel, not an end-user screen.
 */
export default function SharedModuleEntry(): null {
  return null
}
