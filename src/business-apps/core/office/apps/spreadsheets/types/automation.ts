/**
 * Spreadsheet Automation Types
 *
 * Type definitions for the Spreadsheet Process Automation Platform.
 * Enables row-level workflows, bulk data collection, and spreadsheet approvals.
 */

import type { EntityFilterGroup, EntitySortConfig } from './entityDataSource'

/**
 * Entity-backed dropdown options for bulk collection form fields (runtime-resolved via flow-engine datasource API).
 */
export interface BulkCollectionEntitySelectConfig {
  entityType: string
  entityKind?: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'
  namespace?: string
  entityDisplayName: string
  valueField: string
  labelField: string
  filters: EntityFilterGroup
  orderBy: EntitySortConfig[]
  /** Max records to load for dropdown labels (capped client-side) */
  limit: number
}

// ============================================================================
// Core Automation Types
// ============================================================================

/**
 * Workflow status values aligned with custom-flow-engine
 */
export type WorkflowStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'TIMED_OUT'

/**
 * How the automation is triggered
 */
export type AutomationTrigger =
  | 'manual' // User clicks "Run Workflow"
  | 'onRowAdd' // When new row is added
  | 'onFieldChange' // When specific field changes
  | 'scheduled' // Cron-based execution
  | 'onApprovalRequest' // When sheet submitted for approval

/**
 * Type of automation pattern
 */
export type AutomationType =
  | 'row_workflow' // One workflow per row
  | 'bulk_collection' // Collect data into spreadsheet
  | 'excel_collection' // Send template copy to team, collect via in-app submit
  | 'sheet_approval' // Approve entire sheet
  | 'line_approval' // Approve individual rows

/**
 * Direction of data flow for column mappings
 */
export type MappingDirection = 'toWorkflow' | 'fromWorkflow' | 'bidirectional'

/**
 * Aggregation methods for result mappings
 */
export type AggregationMethod = 'latest' | 'append' | 'sum' | 'avg' | 'count'

/**
 * Deduplication strategies for bulk collection
 */
export type DeduplicationStrategy = 'replace' | 'append' | 'merge'

/**
 * Actions to take after approval
 */
export type OnApproveAction = 'promote_to_entity' | 'trigger_action' | 'notify' | 'none'

/**
 * Actions to take after rejection
 */
export type OnRejectAction = 'return_to_submitter' | 'archive' | 'escalate' | 'none'

// ============================================================================
// Column Mapping Types
// ============================================================================

/**
 * Maps a spreadsheet column to a workflow parameter
 */
export interface ColumnWorkflowMapping {
  /** Spreadsheet column ID */
  columnId: string
  /** Column name for display */
  columnName: string
  /** Expression path in workflow (e.g., "step_0.formData.amount") */
  workflowParameter: string
  /** Direction of data flow */
  direction: MappingDirection
  /** Transform function name (optional) */
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'date' | 'boolean'
}

/**
 * Maps workflow output back to spreadsheet column
 */
export interface ResultMapping {
  /** Expression path in workflow output (e.g., "step_0.formData.approvalStatus") */
  workflowOutputPath: string
  /** Target spreadsheet column ID */
  targetColumnId: string
  /** How to aggregate multiple values */
  aggregation?: AggregationMethod
  /** Transform before writing */
  transform?: string
}

// ============================================================================
// Workflow Configuration Types
// ============================================================================

/**
 * Assignment target configuration (aligned with flow engine)
 */
export interface AutomationAssignmentTarget {
  users?: string[]
  capabilities?: string[]
  organizationalUnits?: string[]
  companies?: string[]
  siteLocations?: string[]
  costCenters?: string[]
  matrixTeams?: string[]
}

/**
 * Assignment mode for workflow steps
 */
export type AutomationAssignmentMode = 'CLAIM' | 'ASSIGN'

/**
 * Task assignment configuration
 */
export interface AutomationTaskAssignment {
  targets: AutomationAssignmentTarget | null
  assignmentMode: AutomationAssignmentMode
  allowReassignment?: boolean
}

/**
 * Input field types for dynamic forms
 */
export type AutomationInputType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTISELECT'
  | 'CHECKBOX'
  | 'FILE'

/**
 * Input option for select fields
 */
export interface AutomationInputOption {
  value: string
  label: string
}

/**
 * Form input definition
 */
export interface AutomationFormInput {
  type: AutomationInputType
  name: string
  label: string
  required?: boolean
  options?: AutomationInputOption[]
  defaultValue?: string
  placeholder?: string
  /** Expression for dynamic value from spreadsheet */
  valueExpression?: string
  readOnly?: boolean
}

/**
 * Step type aligned with flow engine
 */
export type AutomationStepType = 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE'

/**
 * Link attached to a workflow step
 */
export interface AutomationLink {
  name: string
  url: string
  type?: string
}

/**
 * Workflow step definition for automations
 */
export interface AutomationFlowStep {
  type: AutomationStepType
  title: string
  message?: string
  form?: AutomationFormInput[]
  links?: AutomationLink[]
  assignment: AutomationTaskAssignment
  dueInMinutes?: number
}

/**
 * Dynamic workflow template for automations
 */
export interface AutomationFlowTemplate {
  type: 'TEMPLATE'
  name: string
  description?: string
  version: number
  steps: AutomationFlowStep[]
  tags?: Record<string, string>
}

/**
 * Workflow configuration within an automation
 */
export interface AutomationWorkflowConfig {
  /** ID of a saved template (if using existing template) */
  templateId?: string
  /** Inline template definition (if creating dynamic workflow) */
  dynamicTemplate?: AutomationFlowTemplate
  /** Column to workflow parameter mappings */
  columnMappings: ColumnWorkflowMapping[]
  /** Column to display/sync workflow status */
  statusColumn?: string
  /** Mappings for writing workflow results back to spreadsheet */
  resultMappings?: ResultMapping[]
}

/**
 * Trigger configuration for automations
 */
export interface AutomationTriggerConfig {
  /** Columns to watch for changes (for onFieldChange trigger) */
  watchColumns?: string[]
  /** Cron expression (for scheduled trigger) */
  cronExpression?: string
  /** Filter to select which rows to process */
  rowFilter?: EntityFilterGroup
  /** Delay in seconds after trigger before execution */
  delaySeconds?: number
}

// ============================================================================
// Sheet Approval Types
// ============================================================================

/**
 * Approval mode for sheet approval automations
 */
export type SheetApprovalMode = 'full_sheet' | 'line_item'

/**
 * Individual approval step configuration
 */
export interface ApprovalStepConfig {
  /** Step title */
  title: string
  /** Message/instructions for approvers */
  message?: string
  /** Who can approve */
  approvers: AutomationTaskAssignment
  /** Can approver edit values during review? */
  canEdit: boolean
  /** Can approver reject individual rows? (for line_item mode) */
  canRejectRows: boolean
  /** Columns that must be reviewed */
  requiredColumns?: string[]
  /** Due time in minutes */
  dueInMinutes?: number
}

/**
 * Sheet approval configuration
 */
export interface SheetApprovalConfig {
  /** Approval mode */
  mode: SheetApprovalMode
  /** Sequential approval steps */
  approvalSteps: ApprovalStepConfig[]
  /** Action when approved */
  onApprove: OnApproveAction
  /** Action when rejected */
  onReject: OnRejectAction
  /** Entity type for promotion (if onApprove = 'promote_to_entity') */
  promotionEntityType?: string
}

// ============================================================================
// Bulk Collection Types
// ============================================================================

/**
 * Row identifier strategy for bulk collection
 */
export type RowIdentifierStrategy = 'assignee' | 'initiator' | 'workflowId' | 'custom'

/**
 * Bulk collection configuration
 */
export interface BulkCollectionConfig {
  /** Template ID for the collection workflow */
  workflowTemplateId?: string
  /** Dynamic template for collection */
  dynamicTemplate?: AutomationFlowTemplate
  /** Target sheet for collected data */
  targetSheetId?: string
  /** How to identify rows (for deduplication) */
  rowIdentifier: RowIdentifierStrategy
  /** Custom field for row identification (when rowIdentifier = 'custom') */
  customIdentifierField?: string
  /** Field mappings from workflow to columns */
  fieldMappings: ResultMapping[]
  /** Deduplication strategy */
  deduplication: DeduplicationStrategy
  /** Whether to anonymize responses */
  anonymize?: boolean
  /** Type of recipient selection: team (direct reports), department (all dept members), or specific (chosen users) */
  recipientType?: 'team' | 'department' | 'specific'
  /** Recipients for bulk collection (user IDs) - used when recipientType is 'specific' or resolved from team/department */
  recipients?: string[]
  /** Tracking columns to include (e.g., 'recipient_name', 'sent_at', 'responded_at') */
  trackingColumns?: string[]
  /** Form fields to collect (column IDs or custom field definitions) */
  formFields?: Array<{
    id: string
    label: string
    type: 'existing_column' | 'custom'
    columnId?: string
    inputType?: 'TEXT' | 'NUMBER' | 'DATE' | 'TEXTAREA' | 'SELECT'
    required?: boolean
    /** Static SELECT options (labels; stored value equals label unless extended later) */
    options?: string[]
    /** For SELECT: custom list vs load options from an entity */
    selectOptionsSource?: 'static' | 'entity'
    entitySelect?: BulkCollectionEntitySelectConfig
  }>
  /** Template spreadsheet app ID (for excel_collection: the app to duplicate for each recipient) */
  templateSpreadsheetId?: string
  /** Optional message from the manager to include in the task/notification sent to recipients */
  message?: string
}

// ============================================================================
// Main Automation Types
// ============================================================================

/**
 * Complete automation definition
 */
/** UUID v4 regex for validation */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

export interface SpreadsheetAutomation {
  /** Unique automation ID (client-side: auto_xxx, or backend UUID) */
  id: string
  /** Document-service automation UUID (for excel_collection API calls when id is client-side) */
  backendId?: string
  /** Human-readable name */
  name: string
  /** Description of the automation */
  description?: string
  /** Type of automation pattern */
  type: AutomationType
  /** How the automation is triggered */
  trigger: AutomationTrigger
  /** Whether the automation is active */
  isEnabled: boolean

  /** Workflow configuration */
  workflowConfig: AutomationWorkflowConfig

  /** Trigger-specific configuration */
  triggerConfig: AutomationTriggerConfig

  /** Sheet approval specific config (when type = 'sheet_approval' | 'line_approval') */
  approvalConfig?: SheetApprovalConfig

  /** Bulk collection / Excel collection config (when type = 'bulk_collection' | 'excel_collection') */
  collectionConfig?: BulkCollectionConfig

  /** Last execution timestamp */
  lastRunAt?: string
  /** Total number of executions */
  runCount: number
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** User who created the automation */
  createdBy?: string
}

// ============================================================================
// Workflow-Row Link Types
// ============================================================================

/**
 * Step detail for workflow progress tracking
 */
export interface WorkflowStepDetail {
  /** Step index (0-based) */
  index: number
  /** Step title */
  title: string
  /** Step type */
  type: AutomationStepType
  /** Step status */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'SKIPPED'
  /** Assigned user ID */
  assignedTo?: string
  /** Completed by user ID */
  completedBy?: string
  /** Completion timestamp */
  completedAt?: string
  /** Form data from this step */
  formData?: Record<string, unknown>
}

/**
 * Link between a spreadsheet row and its workflow instance
 */
export interface WorkflowRowLink {
  /** Spreadsheet row ID */
  rowId: string
  /** Workflow instance ID */
  workflowId: string
  /** Current workflow status */
  workflowStatus: WorkflowStatus
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Total number of steps */
  totalSteps: number
  /** Workflow start timestamp */
  startedAt: string
  /** Workflow completion timestamp */
  completedAt?: string
  /** Last status update timestamp */
  lastUpdatedAt: string
  /** Automation ID that created this workflow */
  automationId: string
  /** Detailed step information (optional, for expanded view) */
  stepDetails?: WorkflowStepDetail[]
  /** Error message if failed */
  errorMessage?: string
  /** Output data from completed workflow */
  outputData?: Record<string, unknown>
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Request to execute an automation for specific rows
 */
export interface AutomationExecutionRequest {
  /** Automation ID to execute */
  automationId: string
  /** Row IDs to process */
  rowIds: string[]
  /** User initiating the execution */
  initiatorId: string
  /** Override parameters */
  overrideParams?: Record<string, unknown>
}

/**
 * Result of automation execution
 */
export interface AutomationExecutionResult {
  /** Whether execution started successfully */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Document-service automation UUID (when automation was created on first run) */
  backendId?: string
  /** Created workflow instances */
  workflows: Array<{
    rowId: string
    workflowId: string
    status: WorkflowStatus
  }>
  /** Execution timestamp */
  executedAt: string
  /** Total rows processed */
  totalRows: number
  /** Rows that failed to process */
  failedRows?: string[]
}

/**
 * Execution history entry
 */
export interface AutomationExecutionHistory {
  /** Execution ID */
  id: string
  /** Automation ID */
  automationId: string
  /** Execution timestamp */
  executedAt: string
  /** User who triggered execution */
  executedBy: string
  /** Trigger type that caused execution */
  triggerType: AutomationTrigger
  /** Number of rows processed */
  rowCount: number
  /** Number of successful workflows */
  successCount: number
  /** Number of failed workflows */
  failedCount: number
  /** Execution duration in milliseconds */
  durationMs: number
  /** Error message if execution failed */
  errorMessage?: string
}

// ============================================================================
// Workflow Status Column Types
// ============================================================================

/**
 * Configuration for workflow status column display
 */
export interface WorkflowStatusColumnConfig {
  /** Linked automation ID */
  automationId: string
  /** Show step progress (e.g., "Step 2/4") */
  showProgress: boolean
  /** Show inline action buttons (Claim, Complete) */
  allowActions: boolean
  /** Show step details on hover */
  showStepDetails: boolean
  /** Enable click to view full workflow detail */
  clickToViewDetail: boolean
}

// ============================================================================
// Automation Template Types (for Templates Gallery)
// ============================================================================

/**
 * Category for automation templates
 */
export type AutomationTemplateCategory =
  | 'approval'
  | 'collection'
  | 'review'
  | 'compliance'
  | 'hr'
  | 'finance'
  | 'operations'

/**
 * Pre-built automation template
 */
export interface AutomationTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description: string
  /** Category for organization */
  category: AutomationTemplateCategory
  /** Icon name */
  icon?: string
  /** Preview image URL */
  previewImage?: string
  /** Base automation configuration */
  automationConfig: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>
  /** Required column names that must exist */
  requiredColumns?: string[]
  /** Example use cases */
  useCases?: string[]
  /** Is this template featured/popular */
  isFeatured?: boolean
}

// ============================================================================
// Webhook/Callback Types
// ============================================================================

/**
 * Payload sent to spreadsheet service when workflow completes
 */
export interface WorkflowCallbackPayload {
  /** Workflow instance ID */
  workflowId: string
  /** Final workflow status */
  status: 'COMPLETED' | 'FAILED' | 'CANCELED'
  /** Output data from workflow steps */
  outputData: Record<string, unknown>
  /** Tags from workflow (contains spreadsheet context) */
  tags: {
    app: 'spreadsheet-automation'
    spreadsheetId: string
    sheetId: string
    rowId: string
    automationId: string
    automationType: AutomationType
  }
  /** Completion timestamp */
  completedAt: string
}

/**
 * Tags structure for workflow-spreadsheet linking
 */
export interface SpreadsheetWorkflowTags {
  /** Application identifier */
  app: 'spreadsheet-automation'
  /** Spreadsheet ID */
  spreadsheetId: string
  /** Sheet ID */
  sheetId: string
  /** Row ID */
  rowId: string
  /** Automation ID */
  automationId: string
  /** Automation type */
  automationType: AutomationType
  /** Optional: Bulk group ID for bulk executions */
  bulkGroupId?: string
  /** Optional: Recipient ID for bulk collection */
  recipientId?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new automation with default values
 */
export function createDefaultAutomation(
  type: AutomationType,
  name: string
): Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name,
    type,
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [],
      resultMappings: []
    },
    triggerConfig: {},
    runCount: 0
  }
}

/**
 * Create default workflow tags for spreadsheet automation
 */
export function createWorkflowTags(params: {
  spreadsheetId: string
  sheetId: string
  rowId: string
  automationId: string
  automationType: AutomationType
  bulkGroupId?: string
}): SpreadsheetWorkflowTags {
  return {
    app: 'spreadsheet-automation',
    spreadsheetId: params.spreadsheetId,
    sheetId: params.sheetId,
    rowId: params.rowId,
    automationId: params.automationId,
    automationType: params.automationType,
    ...(params.bulkGroupId ? { bulkGroupId: params.bulkGroupId } : {})
  }
}

/**
 * Get display label for workflow status
 */
export function getWorkflowStatusLabel(status: WorkflowStatus): string {
  const labels: Record<WorkflowStatus, string> = {
    PENDING: 'Pending',
    RUNNING: 'In Progress',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    CANCELED: 'Canceled',
    TIMED_OUT: 'Timed Out'
  }
  return labels[status] || status
}

/**
 * Get display color for workflow status (design system tokens)
 */
export function getWorkflowStatusColor(
  status: WorkflowStatus
): 'info' | 'warning' | 'success' | 'destructive' | 'offline' {
  const colors: Record<WorkflowStatus, 'info' | 'warning' | 'success' | 'destructive' | 'offline'> = {
    PENDING: 'offline',
    RUNNING: 'info',
    COMPLETED: 'success',
    FAILED: 'destructive',
    CANCELED: 'offline',
    TIMED_OUT: 'warning'
  }
  return colors[status] || 'offline'
}

/**
 * Check if a workflow status is terminal (no more actions possible)
 */
export function isTerminalStatus(status: WorkflowStatus): boolean {
  return ['COMPLETED', 'FAILED', 'CANCELED', 'TIMED_OUT'].includes(status)
}
