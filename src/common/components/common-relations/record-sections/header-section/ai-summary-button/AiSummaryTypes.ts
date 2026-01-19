import { UseInformationExtractionReturn } from '@/common/hooks/useInformationExtraction'

/**
 * Standard schema for AI summary responses across all CRM entities
 */
export interface AiSummaryContent {
  summary: string
  keyInsights: string[]
}

/**
 * Configuration for AI summary button behavior and display
 */
export interface AiSummaryConfig {
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
 * Props for the shared AiSummaryButton component
 */
export interface AiSummaryButtonProps {
  /** Configuration for entity-specific behavior */
  config: AiSummaryConfig
  /** Hook that provides AI summary functionality for the specific entity */
  summaryHook: AiSummaryHook
  /** Custom test ID prefix for the button */
  dataTestId?: string
  /** Custom button text (defaults to "AI Summary") */
  buttonText?: string
  /** Additional CSS classes for the button */
  className?: string
}
