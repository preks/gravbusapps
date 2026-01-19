import { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'

/**
 * Standard schema for AI summary responses across all CRM entities
 */
export interface AiSummaryContent {
  summary: string
  keyInsights: string[]
}

/**
 * Configuration for AI actions behavior and display
 */
export interface AiActionConfig {
  /** Display name for the entity type (e.g., "investment", "lead", "account") */
  entityType: string
  /** Custom loading message for the specific entity type */
  loadingMessage?: string
  /** Custom loading subtitle for the specific entity type */
  loadingSubtitle?: string
  /** Custom empty state message */
  emptyStateMessage?: string
}

/**
 * Hook interface that must be implemented for each entity type
 */
export type AiSummaryHook = UseInformationExtractionReturn<AiSummaryContent>

/**
 * Individual AI action definition
 */
export interface AiAction {
  /** Unique key for the action */
  key: string
  /** Display label for the action */
  label: string
  /** Icon to display with the action */
  icon: React.ReactNode
  /** Hook that provides AI functionality for this action */
  hook: AiSummaryHook
  /** Configuration for this specific action */
  config: AiActionConfig
  /** Whether this action is currently disabled */
  disabled?: boolean
}

/**
 * Props for the shared AiActions component
 */
export interface AiActionsProps {
  /** Array of AI actions to display */
  actions: AiAction[]
  /** Custom test ID prefix for the button */
  dataTestId?: string
  /** Custom button text (defaults to "AI Actions") */
  buttonText?: string
  /** Additional CSS classes for the button */
  className?: string
  /** Button variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm' | 'iconLg'
}
