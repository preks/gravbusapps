/**
 * Types for the Expression Pill Editor.
 * Expression pills represent dynamic data references like {{$steps.step_0.formData.amount}}.
 */

export type ExpressionSourceType = 'trigger' | 'workflow' | 'steps' | 'catalog' | 'entity' | 'orgchart'

export type ExpressionValueType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'unknown'

export interface ExpressionSuggestionItem {
  /** Unique ID for this suggestion */
  id: string
  /** Display label in the dropdown */
  label: string
  /** Full expression path, e.g. '$steps.step_0.formData.amount' */
  expression: string
  /** Source category for grouping and coloring */
  source: ExpressionSourceType
  /** Optional type hint used for operator selection (logic decisions) */
  dataType?: ExpressionValueType
  /** Optional description shown in dropdown */
  description?: string
  /** Optional icon name */
  icon?: string
}

export interface ExpressionSuggestionCategory {
  source: ExpressionSourceType
  label: string
  items: ExpressionSuggestionItem[]
}

export interface ExpressionPillData {
  /** The expression string without {{ }} delimiters */
  expression: string
  /** Display label for the pill */
  label: string
  /** Source type for coloring */
  source: ExpressionSourceType
}

export interface ExpressionEditorProps {
  /** Current value as expression string (may contain {{expressions}} mixed with text) */
  value: string
  /** Called when value changes */
  onChange: (value: string) => void
  /** Available suggestion items */
  suggestions?: ExpressionSuggestionItem[]
  /** Placeholder text */
  placeholder?: string
  /** Whether to allow free-text mixed with expressions (Advanced mode) */
  allowFreeText?: boolean
  /** Render editor as a multi-line text area (taller min-height) */
  multiline?: boolean
  /** Constrain the editor to a single line (input-like) */
  singleLine?: boolean
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Additional CSS class */
  className?: string
  /** Test ID */
  'data-testid'?: string
}

/**
 * Map of source types to design system color tokens.
 */
export const SOURCE_COLOR_MAP: Record<
  ExpressionSourceType,
  {
    bg: string
    text: string
    border: string
  }
> = {
  trigger: {
    bg: 'gba:bg-secondary/60',
    text: 'gba:text-secondary-foreground',
    border: 'gba:border-secondary'
  },
  workflow: {
    bg: 'gba:bg-primary/10',
    text: 'gba:text-primary',
    border: 'gba:border-primary/20'
  },
  steps: {
    bg: 'gba:bg-accent/50',
    text: 'gba:text-accent-foreground',
    border: 'gba:border-accent'
  },
  catalog: {
    bg: 'gba:bg-info-secondary',
    text: 'gba:text-info-secondary-foreground',
    border: 'gba:border-info/20'
  },
  entity: {
    bg: 'gba:bg-success-secondary',
    text: 'gba:text-success-secondary-foreground',
    border: 'gba:border-success/20'
  },
  orgchart: {
    bg: 'gba:bg-warning-secondary',
    text: 'gba:text-warning-secondary-foreground',
    border: 'gba:border-warning/20'
  }
}
