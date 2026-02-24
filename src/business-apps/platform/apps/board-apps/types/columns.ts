/**
 * Column type system for Boards.
 *
 * Extends the spreadsheet column types with board-specific types:
 * status (tokenized colors), people, attachment, relation, mirror, rollup,
 * progress, tags, rating, timeline, button.
 */

export type BoardColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'status'
  | 'priority'
  | 'people'
  | 'attachment'
  | 'relation'
  | 'mirror'
  | 'rollup'
  | 'formula'
  | 'progress'
  | 'tags'
  | 'rating'
  | 'timeline'
  | 'link'
  | 'button'

export interface BoardColumn {
  id: string
  name: string
  label: string
  type: BoardColumnType
  width?: number
  isVisible: boolean
  isEditable: boolean
  isRequired: boolean
  isUnique: boolean
  defaultValue?: unknown
  order: number
  isPrimary?: boolean
  selectOptions?: SelectOption[]
  validation?: ColumnValidation
  formula?: string
  referenceTo?: ColumnReference
  statusConfig?: StatusConfig
  peopleConfig?: PeopleConfig
  attachmentConfig?: AttachmentConfig
  relationConfig?: RelationConfig
  mirrorConfig?: MirrorConfig
  rollupConfig?: RollupConfig
  timelineConfig?: TimelineConfig
}

export interface SelectOption {
  value: string
  label: string
  colorToken?: string
  avatarUrl?: string
}

export interface ColumnValidation {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  message?: string
}

export interface ColumnReference {
  appId?: string
  sheetId: string
  columnId: string
  displayColumn?: string
}

export interface StatusConfig {
  doneValues?: string[]
  blockedValues?: string[]
}

export interface PeopleConfig {
  multiple?: boolean
  allowedRoles?: string[]
  /** When true, this column is treated as an assignment field for "Action required" / my-work. */
  isAssignment?: boolean
}

export interface AttachmentConfig {
  allowedMimeTypes?: string[]
  maxSize?: number
}

export interface RelationConfig {
  targetAppId: string
  targetSheetId: string
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-many'
  displayColumn?: string
}

export interface MirrorConfig {
  relationColumnId: string
  targetColumnId: string
}

export interface RollupConfig {
  relationColumnId: string
  targetColumnId: string
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percent_done'
}

export interface TimelineConfig {
  startDateColumnId: string
  endDateColumnId: string
}

/**
 * Returns the primary column for a sheet, with fallbacks for
 * backward compatibility with boards created before isPrimary existed.
 */
export function getPrimaryColumn(columns: BoardColumn[]): BoardColumn | undefined {
  return columns.find(c => c.isPrimary) || columns.find(c => c.type === 'text') || columns[0]
}
