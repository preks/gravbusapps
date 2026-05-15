export type SessionAttachmentStatus = 'pending' | 'ready' | 'failed'
export type EnterprisePresentationMode = 'default' | 'enterprise_agents'

export interface SessionAttachment {
  id: string
  name: string
  mime_type: string
  size: number
  content_type: 'drive_file'
  content_id: string
  indexing_status: SessionAttachmentStatus
  origin?: string
  created_at?: string | null
  source_app?: string | null
  source_session_id?: string | null
  /** Client-only blob URL for image preview thumbnails. Not sent to or received from the server. */
  preview_url?: string
}

/** Local-only state used by the composer while uploads are in flight. */
export interface PendingComposerAttachment {
  /** Stable client id for keying / removal before the server assigns one. */
  client_id: string
  name: string
  mime_type: string
  size: number
  /** 'uploading' = bytes still in flight; once the server returns we promote
   * to 'pending' (server indexing) or 'failed'. */
  state: 'uploading' | 'pending' | 'ready' | 'failed'
  error?: string
  attachment?: SessionAttachment
  /** Blob URL for image preview thumbnails, created via URL.createObjectURL(). */
  preview_url?: string
}

// Session
export interface DeepAgentSession {
  session_id: string
  input: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  presentation_mode?: EnterprisePresentationMode
  output?: string
  todos?: TodoItem[]
  trace?: AgentStreamEvent[]
  artifacts?: SessionArtifactMeta[]
  /** Full rows from the API and/or client bootstrap refs (see `MessageAttachmentRef`). */
  session_attachments?: Array<SessionAttachment | MessageAttachmentRef>
  workspace_documents?: WorkspaceDocument[]
  reflection?: ReflectionResult
  quality_score?: number
  cost_summary?: CostSummary
  duration_ms?: number // Turn duration (most recent request)
  total_duration_ms?: number // Total session duration from creation
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  config?: SessionConfig
  human_question?: string | null
  structured_input_request?: StructuredInputRequestEvent | null
  active_external_connection_ids?: string[]
  recovery?: {
    last_recovered_at?: string | null
    recovery_attempt?: number | null
    recovery_reason?: string | null
    used_fallback_checkpointer?: boolean
  }
}

export interface StartSessionResponse {
  session_id: string
  status?: DeepAgentSession['status']
  user_id?: string
  workspace_id?: string
  presentation_mode?: EnterprisePresentationMode
  session: DeepAgentSession
}

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped'
  tool_used?: string
  duration_ms?: number
}

export type AgentStreamChunkKind = 'thinking' | 'final' | 'tool' | 'status' | 'response_stream' | 'agent_reasoning'

export interface AgentChunkEvent {
  type: 'agent_chunk'
  seq: number
  event_id: string
  role: 'ai' | 'tool' | 'human' | 'system' | 'unknown'
  presentation_mode?: EnterprisePresentationMode
  content: string
  timestamp: string
  chunk_kind?: AgentStreamChunkKind
  tool_name?: string
  tool_input?: Record<string, unknown>
  step_id?: string
  metadata?: Record<string, unknown>
}

export interface AgentTerminalEvent {
  type: 'terminal'
  seq: number
  event_id: string
  timestamp?: string
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_for_human'
  presentation_mode?: EnterprisePresentationMode
  output?: string | null
  todos?: TodoItem[]
  reflection?: ReflectionResult | null
  human_question?: string | null
  structured_input_request?: StructuredInputRequestEvent | null
  duration_ms?: number
  cost_summary?: CostSummary | null
  artifacts?: SessionArtifactMeta[]
  workspace_documents?: WorkspaceDocument[]
}

export interface AgentErrorEvent {
  type: 'error'
  message: string
}

export interface AgentStepStartedEvent {
  type: 'step_started'
  seq: number
  event_id: string
  step_id: string
  step_type?: 'tool' | 'thinking' | 'subagent'
  name?: string
  input?: Record<string, unknown>
  timestamp: string
}

export interface AgentStepCompletedEvent {
  type: 'step_completed'
  seq: number
  event_id: string
  step_id: string
  status?: 'done' | 'failed'
  output?: string
  /** Normalized snapshot from prompt-manager for write_todos / update_todos */
  todos?: TodoItem[]
  duration_ms?: number
  name?: string
  timestamp: string
}

export interface AgentSubagentSpawnedEvent {
  type: 'subagent_spawned'
  seq: number
  event_id: string
  step_id: string
  name?: string
  agent_name?: string
  subagent_id?: string
  parent_step_id?: string
  task_summary?: string
  timestamp: string
}

export interface AgentSubagentCompletedEvent {
  type: 'subagent_completed'
  seq: number
  event_id: string
  step_id: string
  status?: 'done' | 'failed'
  output?: string
  duration_ms?: number
  subagent_id?: string
  name?: string
  agent_name?: string
  task_summary?: string
  parent_step_id?: string
  timestamp: string
}

export interface AgentExpertCalledEvent {
  type: 'expert_called'
  seq: number
  event_id: string
  step_id: string
  expert_name?: string
  subagent_id?: string
  task_summary?: string
  timestamp: string
}

export interface AgentExpertCompletedEvent {
  type: 'expert_completed'
  seq: number
  event_id: string
  step_id: string
  expert_name?: string
  subagent_id?: string
  output?: string
  duration_ms?: number
  status?: 'done' | 'failed'
  timestamp: string
}

export interface AgentArtifactCreatedEvent {
  type: 'artifact_created'
  seq: number
  event_id: string
  timestamp: string
  name: string
  path: string
  mime_type: string
  size: number
}

export interface StructuredInputRequestEvent {
  type: 'structured_input_request'
  seq: number
  event_id: string
  timestamp: string
  presentation_mode?: EnterprisePresentationMode
  form_id: string
  title: string
  description: string
  fields: InputFieldSchema[]
  allow_partial_submit: boolean
  action_requests?: ToolPermissionActionRequest[]
  review_configs?: ToolPermissionReviewConfig[]
  tool_ref?: string
  request_status?: 'pending' | 'approved' | 'rejected' | 'edited' | 'expired' | 'cancelled' | 'resumed'
  /**
   * Present when `form_id === 'compose_email'` — carries the agent-drafted
   * email payload so the frontend can hydrate the EmailComposerBubble.
   */
  email_draft?: ComposeEmailDraft
}

export interface ToolPermissionActionRequest {
  name?: string
  args?: Record<string, unknown>
  arguments?: Record<string, unknown>
  description?: string
  canonical_function_name?: string
  input_schema?: Record<string, unknown>
  field_options?: Record<string, Array<{ label: string; value: string }>>
  policy?: Record<string, unknown>
}

export interface ToolPermissionReviewConfig {
  action_name: string
  actionName?: string
  allowed_decisions: Array<'approve' | 'edit' | 'reject'>
}

export interface HitlRequestedEvent {
  type: 'hitl_requested'
  seq: number
  event_id: string
  timestamp: string
  presentation_mode?: EnterprisePresentationMode
  request: {
    request_id: string
    type: 'approval' | 'form' | 'email_draft' | 'tool_permission' | 'draft_review' | 'human_question'
    title: string
    description?: string | null
    payload?: Record<string, unknown>
    status: 'pending' | 'approved' | 'rejected' | 'edited' | 'expired' | 'cancelled'
  }
}

export interface ComposeEmailRecipient {
  name?: string
  address: string
}

export interface ComposeEmailDraft {
  to: ComposeEmailRecipient[]
  cc?: ComposeEmailRecipient[]
  bcc?: ComposeEmailRecipient[]
  subject: string
  html_body: string
  text_body?: string | null
  signature?: string | null
  account_id?: string | null
  crm_entity_type?: string | null
  crm_entity_id?: string | null
}

export type ComposeEmailAction = 'send' | 'draft' | 'cancel'

export interface ComposeEmailSubmission {
  form_id: 'compose_email'
  action: ComposeEmailAction
  to: ComposeEmailRecipient[]
  cc?: ComposeEmailRecipient[]
  bcc?: ComposeEmailRecipient[]
  subject: string
  htmlBody: string
  textBody?: string
  signature?: string
  accountId?: string
  crmEntityType?: string
  crmEntityId?: string
}

export interface InputFieldSchema {
  field_id: string
  label: string
  field_type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'employee_search'
  description?: string
  required: boolean
  default_value?: any
  options?: string[]
  placeholder?: string
  ai_generated?: boolean
  validation_pattern?: string
  metadata?: Record<string, any>
}

export interface SkillLoadedEvent {
  type: 'skill_loaded'
  seq: number
  event_id: string
  timestamp: string
  skill: {
    skill_id: string
    name: string
    category: string
    description: string
    icon?: string
  }
  was_auto_detected: boolean
}

export interface SkillDetectionSkippedEvent {
  type: 'skill_detection_skipped'
  seq: number
  event_id: string
  timestamp: string
  reason: string
}

export interface ArtifactPreviewEvent {
  type: 'artifact_preview'
  seq: number
  event_id: string
  timestamp: string
  subtype: 'start' | 'progress' | 'draft_ready' | 'complete' | 'error'
  artifact_id: string
  artifact_type: 'slides' | 'document' | 'note' | 'chart'
  title: string
  content?: Record<string, unknown>
  /**
   * Human-readable error summary. Kept for backwards compatibility with
   * older traces; new consumers should prefer ``user_message`` and the
   * structured fields below to render a friendly state.
   */
  error?: string
  /** Machine-readable tag, e.g. ``model_response_invalid``, ``rate_limited``. */
  error_code?: string
  /** Whether a retry is likely to succeed on a fresh attempt. */
  retryable?: boolean
  /** One-sentence, UI-safe copy. Never includes HTTP codes or raw JSON. */
  user_message?: string
  /** Compact dev-facing detail string (status + trimmed body preview). */
  technical_detail?: string
}

/**
 * Category of a discrete agent decision surfaced in the Decisions side panel.
 * Kept loose (string union) to let the backend introduce new categories
 * without breaking older clients; the UI falls back to a generic icon.
 */
export type DecisionCategory = 'skill' | 'tool_routing' | 'reflection' | 'hitl' | 'plan'

export interface AgentDecisionEvent {
  type: 'decision'
  seq: number
  event_id: string
  timestamp: string
  category: DecisionCategory
  /** Short headline for the decision (e.g. "Loaded skill CRM"). */
  title: string
  /** Machine-readable id/label of the chosen option. */
  chosen: string
  /** One- to three-sentence explanation shown as secondary text. */
  rationale: string
  /** Optional list of other options the agent considered. */
  alternatives?: string[]
  /** Optional confidence score in [0, 1]. */
  confidence?: number
  /** Category-specific free-form metadata (e.g. `{ form_id }` for hitl). */
  metadata?: Record<string, unknown>
}

export interface EnterpriseRuntimeTraceEvent {
  type: 'expert_selected' | 'tool_available'
  seq: number
  event_id: string
  timestamp: string
  expert_id?: string
  skill_id?: string
  tool_ref?: string
  payload?: Record<string, unknown>
}

export interface CapabilityMissingEvent {
  type: 'capability_missing'
  seq: number
  event_id: string
  timestamp: string
  code?: string
  title?: string
  message: string
  suggested_action?: string
  provider?: string
  tool_ref?: string
}

export type AgentStreamEvent =
  | AgentChunkEvent
  | AgentTerminalEvent
  | AgentErrorEvent
  | AgentStepStartedEvent
  | AgentStepCompletedEvent
  | AgentExpertCalledEvent
  | AgentExpertCompletedEvent
  | AgentSubagentSpawnedEvent
  | AgentSubagentCompletedEvent
  | AgentArtifactCreatedEvent
  | HitlRequestedEvent
  | StructuredInputRequestEvent
  | SkillLoadedEvent
  | SkillDetectionSkippedEvent
  | ArtifactPreviewEvent
  | AgentDecisionEvent
  | EnterpriseRuntimeTraceEvent
  | CapabilityMissingEvent

export interface ReflectionResult {
  complete: boolean
  missing_steps: string[]
  quality_issues: string[]
  recommendation: 'return' | 'continue'
}

export interface CostSummary {
  tokens_used: number
  estimated_cost_usd: number
  budget_pct: number
}

export interface SpecialistAgent {
  id: string
  name: string
  display_name: string
  description: string
  domain: string
  tags: string[]
  is_active?: boolean
}

export interface SessionArtifactMeta {
  name: string
  path: string
  mime_type: string
  size: number
  created_at?: string
  modified_at?: string
}

export interface WorkspaceDocument {
  type: 'document' | 'slides' | 'note'
  id: string
  title: string
  url: string
}

export interface SessionConfig {
  mode: 'deep' | 'autonomous'
  model?: string
  enable_memory: boolean
  enable_reflection: boolean | undefined
  max_iterations?: number
  selectedAgent?: SpecialistAgent
  selectedEnterpriseSkill?: EnterpriseSkill
}

export interface EnterpriseSkill {
  id: string
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  color?: string
  version: string
  is_active: boolean
  publisher: string
  install_count: number
  rating?: number
  onboarding_steps: string[]
  estimated_setup_time?: string
  tool_refs?: string[]
}

// ── Admin Skill Studio types ─────────────────────────────────────────

export interface AdminSkill {
  skill_id: string
  name: string
  description: string
  status: 'draft' | 'pending_review' | 'approved' | 'archived'
  version: number
  tags: string[]
  category: string | null
  is_active: boolean
  created_by: string
  updated_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  content: string
  files: SkillFile[]
  tools: SkillTool[]
  available_tools: SkillTool[]
  tool_refs?: string[]
  tool_policies?: Record<string, Record<string, unknown>>
  approval_policy?: {
    require_approval: boolean
    approver_roles?: string[]
    approver_user_ids?: string[]
    reason?: string
    expires_after_seconds?: number
  }
  safety_level?: string
  output_contract?: Record<string, unknown>
}

export interface AdminSkillSummary {
  skill_id: string
  name: string
  description: string
  status: string
  version: number
  tags: string[]
  category: string | null
  is_active: boolean
}

export interface CreateSkillPayload {
  name: string
  description: string
  body?: string
  tags?: string[]
  category?: string
  compatibility?: string
  tool_refs?: string[]
  tool_policies?: Record<string, Record<string, unknown>>
  approval_policy?: AdminSkill['approval_policy']
  safety_level?: string
  output_contract?: Record<string, unknown>
}

export interface UpdateSkillPayload {
  name: string
  description: string
  body?: string
  tags?: string[]
  category?: string
  compatibility?: string
  tool_refs?: string[]
  tool_policies?: Record<string, Record<string, unknown>>
  approval_policy?: AdminSkill['approval_policy']
  safety_level?: string
  output_contract?: Record<string, unknown>
}

export interface SkillFile {
  path: string
  mime_type: string | null
  size: number
  is_text: boolean
  updated_at: string | null
  url?: string | null
}

export interface ListAdminSkillsResponse {
  skills: AdminSkillSummary[]
  total: number
}

export interface SearchAdminSkillsResponse {
  skills: AdminSkillSummary[]
  total: number
}

export interface SkillTool {
  id: string
  name: string
  description: string
  function_name: string
  is_active: boolean
}

export type ChatMessageType =
  | 'user_input'
  | 'agent_thinking'
  | 'agent_status'
  | 'plan'
  | 'tool_call'
  | 'tool_result'
  | 'expert_call'
  | 'reflection'
  | 'human_interrupt'
  | 'structured_input_request'
  | 'final_answer'
  | 'error'

/**
 * Lightweight reference to a session attachment captured at the moment a
 * `user_input` ChatMessage is emitted. We keep it minimal (id, name, mime,
 * size, indexing_status) so the renderer doesn't need to re-resolve
 * anything off the live attachment store — which would lose the chip on
 * remove. Shaped to be a strict subset of `SessionAttachment` so a future
 * Option-B backend echo (per-turn `attachment_ids` on the human chunk)
 * can populate it without a refactor.
 */
export interface MessageAttachmentRef {
  id: string
  name: string
  mime_type: string
  size: number
  indexing_status?: SessionAttachmentStatus
  /** Client-only blob URL for image preview thumbnails. Not persisted or sent to server. */
  preview_url?: string
}

export interface ChatMessage {
  id: string
  type: ChatMessageType
  timestamp: string
  content: unknown
  presentationMode?: EnterprisePresentationMode
  isStreaming?: boolean
  isCollapsed?: boolean
  /** Populated for `user_input` only — the attachments that were already on
   * the composer when the user pressed Send. Snapshotted client-side; not
   * persisted in the trace yet. */
  attachments?: MessageAttachmentRef[]
}

/** Present on `subagent_spawn` rows: lifecycle of the delegated expert/sub-agent. */
export type ActivityDelegationStatus = 'running' | 'done' | 'failed'

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'tool_call' | 'tool_result' | 'reflection' | 'subagent_spawn' | 'memory_access'
  agent?: string
  toolName?: string
  summary: string
  durationMs?: number
  /** When `type === 'subagent_spawn'`, whether the delegated step has finished (from SSE completions). */
  delegationStatus?: ActivityDelegationStatus
  /** When `type === 'tool_result'`, whether the tool succeeded or failed. */
  resultStatus?: 'done' | 'failed'
  /** When `type === 'tool_result'`, the originating `step_started` id so the card can pair rows. */
  parentStepId?: string
  /** Present on `skill_load` tool rows: backend skill id (e.g. `"create-hook"`). */
  skillId?: string
  /** Present on `skill_load` tool rows: humanised display name. */
  skillName?: string
}

export interface ActionSummary {
  step: string
  tool?: string
  outcome: string
}
