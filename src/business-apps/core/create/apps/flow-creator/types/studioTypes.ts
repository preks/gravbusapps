/**
 * Flow Studio - Studio-specific types.
 * Extends the base flow template types with studio-only concerns.
 */

import type { FlowGraphDefinition, FlowGraphEdge, FlowNodeType } from '@/common/components/flow/flow-viewer'
import type {
  FlowStepType,
  TaskAssignment,
  InputBlock,
  SummaryField,
  EventSubscription,
  TaskPriority,
  Link
} from '@/common/data/flow/types/flowTemplate'
import type { FlowTags } from '@/business-apps/flow/types'

export type DesignerMode = 'simple' | 'advanced'

export type TriggerType = 'MANUAL_FORM' | 'WEBHOOK' | 'EVENT' | 'SCHEDULE'

export type DecisionMode = 'USER' | 'AI' | 'LOGIC'
export type UserDecisionType = 'APPROVAL' | 'CUSTOM'
export type PermissionContextType = 'USER' | 'ORGANIZATIONAL_UNIT'
export type StepPermission = 'read' | 'write' | 'execute'

/** Studio node: the editable representation of a flow node with all config */
export interface StudioNode {
  id: string
  type: FlowNodeType
  label: string
  config: StudioNodeConfig
}

export type StudioNodeConfig =
  | StartNodeConfig
  | TaskNodeConfig
  | DecisionNodeConfig
  | ForkNodeConfig
  | JoinNodeConfig
  | EndNodeConfig

export interface StartNodeConfig {
  nodeType: 'start'
  triggerType: TriggerType
  form?: InputBlock[]
  webhookConfig?: { url?: string; secret?: string }
  eventConfig?: { eventType?: string; filter?: string }
  scheduleConfig?: { cron?: string; timezone?: string }
}

export interface TaskNodeConfig {
  nodeType: 'task'
  stepType: FlowStepType
  kind: 'USER' | 'SYSTEM'
  title: string
  message?: string
  form?: InputBlock[]
  links?: Link[]
  assignment: TaskAssignment
  dueInMinutes?: number
  defaultPriority?: TaskPriority
  customStates?: string[]
  functionConfig?: {
    functionId: string
    functionName?: string
    version?: number
    inputExpressionMap?: Record<string, string>
    outputExpressionMap?: Record<string, string>
    /**
     * Derived from the selected function version so downstream steps can map structured resultData.
     * This is studio-only state and is intentionally not persisted to the saved flow template.
     */
    outputSchema?: unknown
    /**
     * UI-only intent: whether the user authored this step as a "Connector" step
     * or a "Function" step. Under the hood both are FlowStepType.FUNCTION — this
     * is purely a studio hint to drive the tile highlight, the FunctionSelector's
     * default filter and the task header badge. Not persisted to the saved
     * flow template.
     */
    categoryHint?: 'connectors' | 'functions'
  }
  agentConfig?: {
    promptId: string
    promptName?: string
    version?: number
    systemParamsMap?: Record<string, string>
    userParamsMap?: Record<string, string>
    outputExpressionMap?: Record<string, string>
    /**
     * JSON schema for the step output (used to expose structured outputs to downstream expressions).
     * Primarily configured for EveryAI Agent steps in advanced mode.
     */
    outputSchema?: unknown
  }
  eventSubscriptions?: EventSubscription[]
  reworkConfig?: ReworkConfig
  simpleAIConfig?: {
    instruction: string
  }
  permissionContext?: {
    contextType: PermissionContextType
    organizationalUnitId?: string
    permissions: StepPermission[]
  }
}

export interface DecisionNodeConfig {
  nodeType: 'decision'
  decisionMode: DecisionMode
  links?: Link[]
  branches: DecisionBranch[]
  defaultBranch?: string
  /**
   * Approval "Reject behavior" (send-back / rework loop).
   * Stored on the decision so it can be used by USER/AI/LOGIC decisions.
   */
  rejectRework?: {
    targetNodeId?: string
    requireReason: boolean
    preserveData: boolean
    maxIterations?: number
  }
  userConfig?: {
    userDecisionType?: UserDecisionType
    /** Optional title shown on the user task created by this decision */
    title?: string
    /** Optional message shown on the user task created by this decision */
    message?: string
    assignment: TaskAssignment
    options: Array<{ id: string; label: string }>
    timeoutMinutes?: number
    escalation?: EscalationConfig
    /**
     * Approval rework: when enabled, the "Reject" outcome sends the flow back to a previous step.
     * Stored on the decision so rework is modeled as a branch/outcome (not a task property).
     */
    rejectRework?: {
      targetNodeId?: string
      requireReason: boolean
      preserveData: boolean
      maxIterations?: number
    }
  }
  aiConfig?: {
    /** Executor used to compute the decision outcome. */
    executor?: 'EVERYAI' | 'TASK_EXPERT'
    /**
     * Task Expert prompt id (Prompt Manager) used when executor is TASK_EXPERT.
     */
    promptId?: string
    /**
     * Snapshot of the selected Task Expert prompt metadata and user instructions (without system content).
     * Used to show the "original decision instructions" in the human fallback task message at runtime.
     */
    promptName?: string
    promptVersion?: number
    promptUserContent?: string
    policyDocumentId?: string
    policyDocumentTitle?: string
    policyDocumentVersion?: string
    /**
     * Decision instruction used for EveryAI decisions.
     * Supports expressions (type {{ ... }}).
     */
    instructions?: string
    /**
     * Required message shown to the human when the decision falls back to a user pick.
     * Supports expressions (type {{ ... }}).
     */
    humanInstructions: string
    /**
     * Task Expert mapping rules (advanced mode only): map expert output to a branch.
     */
    mapping?: {
      conditions: Array<{ expression: string; branchId: string }>
    }
    /**
     * Explicit Prompt Manager system parameter mappings for TASK_EXPERT decisions.
     * Keys come from the selected prompt definition and values are studio expressions.
     */
    systemParamsMap?: Record<string, string>
    /**
     * Explicit Prompt Manager user parameter mappings for TASK_EXPERT decisions.
     * Keys come from the selected prompt definition and values are studio expressions.
     */
    userParamsMap?: Record<string, string>
    /**
     * Optional path used to extract a reasoning string from the task expert output (resultData).
     * Example: \"reasoning\" or \"result.reasoning\"
     */
    reasoningPath?: string
    escalation: EscalationConfig
  }
  logicConfig?: {
    conditions: Array<{ expression: string; branchId: string }>
  }
}

export interface ForkNodeConfig {
  nodeType: 'fork'
  branches: ParallelBranch[]
}

export interface JoinNodeConfig {
  nodeType: 'join'
  joinCondition: 'ALL' | 'ANY'
  forkReference: string
}

export interface EndNodeConfig {
  nodeType: 'end'
  summaryFields?: SummaryField[]
}

export interface DecisionBranch {
  id: string
  label: string
  targetNodeId?: string
  condition?: string
}

export interface ParallelBranch {
  id: string
  label: string
  steps: string[]
}

export interface EscalationConfig {
  mode: 'USER'
  assignment: TaskAssignment
  timeoutMinutes?: number
  /** Optional instructions shown to the human when escalation happens */
  instructions?: string
}

export interface ReworkConfig {
  enabled: boolean
  targets: ReworkTarget[]
  maxIterations?: number
}

export interface ReworkTarget {
  triggerAction: 'REJECT' | 'SEND_BACK' | string
  targetStepReference: string
  requireReason: boolean
  preserveData: boolean
}

/** The full studio state */
/** Chat message in the flow studio (session-persistent when panel is collapsed) */
export interface FlowStudioChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    tool: string
    args?: string
    result?: string
    status: 'running' | 'complete'
    id: string
    order?: number
    displayTitle?: string
    displayDetail?: string
    displayStep?: 'call' | 'progress' | 'result'
  }>
  blocks?: Array<{ type: 'thinking' | 'response'; content: string; collapsed?: boolean; order?: number }>
  thinkingLog?: string
  messageId?: string
}

export interface FlowStudioState {
  /** Current designer mode */
  mode: DesignerMode
  /** Chat messages (persist for session when chat panel is collapsed) */
  chatMessages: FlowStudioChatMessage[]
  /** All nodes in the flow */
  nodes: StudioNode[]
  /** All edges (connections) */
  edges: FlowGraphEdge[]
  /** Currently selected node ID */
  selectedNodeId: string | null
  /** Currently selected edge ID */
  selectedEdgeId: string | null
  /** Which edge panel should be shown when an edge is selected */
  selectedEdgePanel: 'details' | 'insert'
  /**
   * Short-lived lock to prevent a plus-click "Add step" action from being
   * immediately overwritten by a subsequent edge click selection event.
   */
  edgePanelLock: null | { edgeId: string; until: number }
  /** Template metadata */
  templateId?: string
  templateName: string
  templateDescription?: string
  templateTags: FlowTags
  templateVersion: number
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Whether the store is loading */
  isLoading: boolean
  /** Pending destructive action confirmation */
  pendingDelete: PendingDeleteAction | null
  /** Undo/redo stacks */
  undoStack: FlowStudioSnapshot[]
  redoStack: FlowStudioSnapshot[]
}

export interface PendingDeleteAction {
  kind: 'node' | 'edge'
  id: string
  label: string
  /** For branch removals (decision/fork): delete multiple edges at once */
  edgeIds?: string[]
  /** Nodes that become unreachable and will be removed together with the edge(s) */
  affectedNodeIds?: string[]
}

export interface FlowStudioSnapshot {
  nodes: StudioNode[]
  edges: FlowGraphEdge[]
}

/** Actions for the studio store */
export interface FlowStudioActions {
  // Mode
  setMode: (mode: DesignerMode) => void

  // Node CRUD
  addNode: (type: FlowNodeType, position?: { x: number; y: number }) => string
  removeNode: (nodeId: string) => void
  requestDeleteNode: (nodeId: string) => void
  updateNode: (nodeId: string, updates: Partial<StudioNode>) => void
  updateNodeConfig: (nodeId: string, config: Partial<StudioNodeConfig>) => void
  duplicateNode: (nodeId: string) => string | null
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  openEdgeDetails: (edgeId: string) => void
  openEdgeInsert: (edgeId: string) => void

  // Edge CRUD
  addEdge: (source: string, target: string, label?: string, direction?: 'forward' | 'backward') => string
  removeEdge: (edgeId: string) => void
  requestDeleteEdge: (edgeId: string) => void
  requestDeleteEdges: (edgeIds: string[], label?: string) => void
  updateEdge: (edgeId: string, updates: Partial<FlowGraphEdge>) => void
  insertNodeOnEdge: (
    edgeId: string,
    type: FlowNodeType,
    taskStepType?: FlowStepType | { stepType: FlowStepType; preset?: 'HYBRID' }
  ) => string | null
  addNodeAfter: (sourceNodeId: string, type: FlowNodeType) => string | null

  // Template
  setTemplateMetadata: (metadata: { name?: string; description?: string }) => void
  setTemplateTags: (tags: FlowTags) => void
  loadTemplate: (
    templateId: string | undefined,
    nodes: StudioNode[],
    edges: FlowGraphEdge[],
    metadata: { name: string; description?: string; version: number; tags?: FlowTags }
  ) => void
  resetStore: () => void

  // Undo/Redo
  undo: () => void
  redo: () => void
  pushSnapshot: () => void

  // Dirty state
  markClean: () => void

  /**
   * When a form field key changes, rewrite any expressions that reference it.
   * This keeps flow-context references stable when we auto-generate "speakable" keys.
   */
  rewriteExpressionsForStartFieldRename: (oldKey: string, newKey: string) => void
  rewriteExpressionsForTaskFieldRename: (taskNodeId: string, oldKey: string, newKey: string) => void

  // Confirmations
  confirmPendingDelete: () => void
  cancelPendingDelete: () => void

  // Convert to FlowGraphDefinition for the viewer
  toGraphDefinition: () => FlowGraphDefinition

  // Chat (session-persistent)
  setChatMessages: (
    messages: FlowStudioChatMessage[] | ((prev: FlowStudioChatMessage[]) => FlowStudioChatMessage[])
  ) => void
}
