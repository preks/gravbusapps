// Type contracts for Workforce Agents (proactive agent employees).
//
// Mirrors the unified backend in prompt-manager:
//   src/workforce/profile.py (embedded WorkforceProfile)
//   src/workforce/models.py  (WorkforceTriggerODM)
//   src/api/routes/workforce_agents.py
//
// A Workforce Agent is an existing AutonomousAgentODM record with
// "workforce" in its surfaces list and a populated workforce_profile.
// Runs are DeepAgentSession records filtered by workforce_agent_id.

export type WorkforceAgentStatus = 'active' | 'paused' | 'archived'

export type WorkforceAutonomyLevel = 'draft_only' | 'approval_required' | 'auto_low_risk' | 'full_auto'

export type WorkforceTriggerType = 'manual' | 'schedule' | 'webhook' | 'inbound_email'

// Run status mirrors DeepAgentSession.status. Extra workforce-only states
// (escalated, budget_paused) land in Phase 7 - keep them in the union now
// so UI components are forward-compatible.
export type WorkforceRunStatus =
  | 'pending'
  | 'running'
  | 'waiting_for_human'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'escalated'
  | 'budget_paused'

export interface WorkforceEscalationPolicy {
  owner_user_id?: string | null
  ticket_queue?: string | null
  notify_emails: string[]
  confidence_threshold: number
  blocked_intents: string[]
}

export interface WorkforceBudget {
  daily_credit_limit?: number | null
  weekly_credit_limit?: number | null
  monthly_credit_limit?: number | null
  on_exceeded: 'pause' | 'escalate' | 'warn'
}

export interface WorkforceKnowledgeRef {
  source: 'policy' | 'contract' | 'knowledge_source' | 'skill' | 'url'
  ref_id: string
  title?: string | null
  description?: string | null
}

export interface WorkforceCreditUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  credits: number
  formula_version: string
  estimated_usd?: number | null
}

// Workforce-only configuration carried on the host agent record.
export interface WorkforceProfile {
  role: string
  department?: string | null
  owner_user_id?: string | null
  autonomy_level: WorkforceAutonomyLevel
  escalation: WorkforceEscalationPolicy
  budget: WorkforceBudget
  knowledge_refs: WorkforceKnowledgeRef[]
  instructions: string
  // Soft-delete marker. Populated when an operator archives the agent;
  // restoring the agent clears it. The UI uses this to render the
  // archived view and to drive the recovery flow.
  archived_at?: string | null
  archived_by_user_id?: string | null
}

export interface WorkforceAgent {
  agent_id: string
  name: string
  display_name: string
  description: string
  domain: string
  surfaces: string[]
  is_active: boolean
  status: WorkforceAgentStatus
  tags: string[]
  skill_ids: string[]
  policy_refs: string[]
  workforce_profile: WorkforceProfile
  created_at: string
  updated_at: string
}

export interface WorkforceAgentPage {
  data: WorkforceAgent[]
  total: number
}

export interface WorkforceAgentCreateInput {
  name: string
  display_name?: string
  description?: string
  domain?: string
  role?: string
  department?: string | null
  owner_user_id?: string | null
  autonomy_level?: WorkforceAutonomyLevel
  skill_ids?: string[]
  policy_refs?: string[]
  knowledge_refs?: WorkforceKnowledgeRef[]
  instructions?: string
  escalation?: WorkforceEscalationPolicy
  budget?: WorkforceBudget
  tags?: string[]
}

export type WorkforceAgentUpdateInput = Partial<Omit<WorkforceAgentCreateInput, 'name'>>

/**
 * Agent tag that opts a workforce agent into the CRM Customer 360 Inbound tab.
 *
 * When present in `WorkforceAgent.tags`, the agent's inbound-email runs are
 * surfaced in the Customer 360 inbound stream. It is toggled from the agent's
 * settings in Enterprise Workforce (no backend change — tags are part of the
 * existing agent update payload) and read by the Customer 360 app, so the two
 * surfaces share one source of truth instead of a hardcoded agent name.
 */
export const CUSTOMER_360_INBOUND_TAG = 'customer-360-inbound'

/** True when the agent is flagged to surface its inbound runs in Customer 360. */
export function hasCustomer360InboundTag(agent: Pick<WorkforceAgent, 'tags'>): boolean {
  return (agent.tags ?? []).includes(CUSTOMER_360_INBOUND_TAG)
}

/** Add or remove a tag from an agent's tag list (stable, de-duplicated). */
export function toggleAgentTag(tags: string[] | undefined, tag: string, enabled: boolean): string[] {
  const current = tags ?? []
  if (enabled) return current.includes(tag) ? current : [...current, tag]
  return current.filter(existing => existing !== tag)
}

export interface WorkforceTrigger {
  trigger_id: string
  agent_id: string
  workspace_id?: string | null
  type: WorkforceTriggerType
  name: string
  enabled: boolean
  // Type-specific config. For inbound_email this is
  // { mailbox: string; email_account_id: string }, where email_account_id
  // references a mailbox the operator connected in document-service (via the
  // Email app) and mailbox is the verified address from that account. Both are
  // required by the backend (prompt-manager validators); the address is never
  // free-typed.
  config: Record<string, unknown>
  created_at: string
  updated_at: string
  // Populated only for webhook triggers — the backend-relative POST
  // path operators give to the upstream system. Combined with the
  // current origin to produce the absolute URL the UI shows.
  webhook_url?: string | null
  // Most recent successful dispatch timestamp; used to render
  // "last fired" hints next to event-driven triggers.
  last_fired_at?: string | null
}

export interface WorkforceTriggerCreateInput {
  type: WorkforceTriggerType
  name?: string
  enabled?: boolean
  config?: Record<string, unknown>
}

// PATCH /workforce/triggers/{id}. Trigger type is immutable - to change
// the kind, delete the trigger and create a new one.
export interface WorkforceTriggerUpdateInput {
  name?: string
  enabled?: boolean
  config?: Record<string, unknown>
}

// Thin view over a DeepAgentSession attributed to a Workforce Agent.
// session_id is the canonical id; cost_summary is the raw backend payload
// from which Newwork credits are derived client-side via tokensToCredits.
export interface WorkforceRunTraceEvent {
  seq?: number
  event_id?: string
  type: string
  timestamp?: string
  // Open-ended: trace entries carry tool calls, decisions, escalations, etc.
  // The detail drawer renders whatever known keys it finds and falls back
  // to a JSON dump for anything else.
  [key: string]: unknown
}

export interface WorkforceRunArtifactSummary {
  name: string
  path?: string | null
  mime_type?: string | null
  size: number
  created_at?: string | null
  modified_at?: string | null
}

// One row per CRM tool action the agent performed during the run.
// Derived server-side from the session trace; the CRM app remains the
// source of truth for the actual records — the run drawer just uses
// these ids to deep-link operators back into CRM.
export type WorkforceRunCrmAction = 'search' | 'create' | 'update' | 'timeline' | 'note' | 'task'

export interface WorkforceRunCrmActionEntry {
  tool_ref: string
  action: WorkforceRunCrmAction | string
  entity_type?: string | null
  record_ids: Record<string, string>
  // Human-readable labels keyed by the same ids as `record_ids` (e.g. the
  // matched contact's name), so the UI can show a name instead of a raw id.
  record_labels?: Record<string, string>
  succeeded: boolean
  timestamp?: string | null
  seq?: number | null
}

// Domain-agnostic generalisation of a CRM action — carries a `domain`
// discriminator so non-CRM verticals get the same entity-link treatment.
export interface WorkforceRunDomainAction extends WorkforceRunCrmActionEntry {
  domain: string
}

// The primary entity/case a run acted on, for the "Case assigned" link.
export interface WorkforceRunCaseRef {
  domain: string
  entity_type?: string | null
  record_id: string
  record_ids?: Record<string, string>
  // Human-readable labels keyed by record id (e.g. the matched contact's
  // name) so the header can render an avatar + name instead of a raw id.
  record_labels?: Record<string, string>
  tool_ref?: string | null
}

// Structured audit-log entry (who / when / why) for the run backtrace.
export interface WorkforceAuditEntry {
  event_type: string
  session_id: string
  user_id: string
  workspace_id?: string
  timestamp: string
  tool_name?: string | null
  tool_input_summary?: string | null
  outcome?: string | null
  metadata?: Record<string, unknown>
}

export interface WorkforceAuditPage {
  data: WorkforceAuditEntry[]
  total: number
}

export interface WorkforceRun {
  session_id: string
  agent_id: string
  workforce_trigger_id?: string | null
  status: WorkforceRunStatus
  input: string
  output?: string | null
  cost_summary?: Record<string, unknown> | null
  pending_human_question?: string | null
  workspace_id?: string | null
  user_id?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  // Phase 4: enriched detail payload returned by the backend.
  trace?: WorkforceRunTraceEvent[]
  metadata?: Record<string, unknown> | null
  presentation_mode?: string | null
  next_event_seq?: number
  // Phase A (detail screen): surfaced detail fields the run drawer/Trace
  // tab need without firing a second request for the deep-agent session.
  todos?: Array<Record<string, unknown>>
  artifacts?: WorkforceRunArtifactSummary[]
  session_attachments?: Array<Record<string, unknown>>
  pending_structured_input?: Record<string, unknown> | null
  // Convenience: shortcut to metadata.workforce.source so Inbox / Runs
  // tabs can filter / colour-code without parsing the full metadata blob.
  source?: WorkforceRunSource | null
  // Convenience: shortcut to metadata.workforce.trigger_payload for the
  // Trace tab to render the original inbound email at the top.
  trigger_payload?: Record<string, unknown> | null
  // Compact "what did the agent do in CRM" view derived from the
  // session trace. Each entry carries the CRM tool ref, the action
  // verb, and any record ids returned so the drawer can deep-link to
  // CRM accounts / contacts / notes without re-parsing the trace.
  crm_actions?: WorkforceRunCrmActionEntry[]
  // Domain-agnostic action list (CRM today, other verticals later).
  actions?: WorkforceRunDomainAction[]
  // Primary entity/case the run acted on, for the "Case assigned" link.
  case_ref?: WorkforceRunCaseRef | null
}

export type WorkforceRunSource = 'manual' | 'schedule' | 'webhook' | 'inbound_email'

export interface WorkforceRunPage {
  data: WorkforceRun[]
  total: number
}

// Compact summary of the trigger that started a run (what caused it),
// served inline on live + recent runs by the active stream.
export interface WorkforceTriggerSummary {
  type?: WorkforceTriggerType | null
  name?: string | null
  trigger_id?: string | null
}

// Trimmed view of a live (non-terminal) run, served by GET /workforce/active
// and pushed over GET /workforce/active/stream. Powers the "who is working
// now" overview strip and per-agent live indicators.
export interface WorkforceActiveRun {
  session_id: string
  agent_id: string
  display_name?: string | null
  status: WorkforceRunStatus
  source?: WorkforceRunSource | null
  trigger?: WorkforceTriggerSummary | null
  input: string
  current_activity: string
  workspace_id?: string | null
  pending_human_question?: string | null
  started_at?: string | null
  updated_at?: string | null
  last_seq: number
}

// A just-finished run surfaced in the live "command center" feed. Carries the
// outcome and business impact (duration, credits, case) so the feed can show
// "X solved case Y in 42s" without an extra per-run fetch.
export interface WorkforceRecentRun {
  session_id: string
  agent_id: string
  display_name?: string | null
  status: WorkforceRunStatus
  source?: WorkforceRunSource | null
  trigger?: WorkforceTriggerSummary | null
  started_at?: string | null
  completed_at?: string | null
  duration_ms?: number | null
  credits: number
  case_ref?: WorkforceRunCaseRef | null
}

export interface WorkforceActiveOverview {
  type?: string
  ts?: string
  count: number
  status_counts: {
    running: number
    pending: number
    waiting_for_human: number
  }
  agents_working: string[]
  by_agent: Record<string, number>
  runs: WorkforceActiveRun[]
  recent_completed: WorkforceRecentRun[]
  // Server-computed completions for the current UTC day. ``buckets`` are
  // hourly (oldest first, index == hour-of-day UTC) and power the
  // command-center "done today" sparkline.
  throughput?: WorkforceThroughput
}

export interface WorkforceThroughput {
  count: number
  buckets: number[]
}

// Query parameters for GET /workforce/agents/{id}/runs.
//
// The backend accepts these as optional query-string filters; the
// frontend mirrors them 1:1 so the URL stays the source of truth for
// the Runs / Inbox tabs.
export interface WorkforceRunListParams {
  status?: WorkforceRunStatus
  source?: WorkforceRunSource
  since?: string // ISO-8601, inclusive lower bound on created_at
  until?: string // ISO-8601, exclusive upper bound on created_at
  q?: string // case-insensitive substring on subject / from
  limit?: number
  offset?: number
}

// POST /workforce/agents/{id}/runs body. ``trigger_id`` lets an operator
// fire a manual test using an existing trigger's context; omit it for an
// ad-hoc UI run.
export interface WorkforceRunCreateInput {
  input: string
  trigger_id?: string | null
  config_overrides?: Record<string, unknown> | null
}

// Newwork credit conversion constants kept in sync with prompt-manager's
// src/workforce/credits.py. Frontend uses these only for client-side
// estimates and display labels - the source of truth for billing is the
// backend session record.
export const TOKENS_PER_CREDIT = 1_000
export const MIN_CREDITS_PER_BILLED_RUN = 1

/**
 * Convert a token total into Newwork credits.
 *
 * Mirrors `tokens_to_credits` in the backend. Always returns whole credits
 * (rounded up) and never goes below `MIN_CREDITS_PER_BILLED_RUN` for runs
 * that consumed any tokens.
 */
/**
 * Default Workforce profile used when an API payload omits the field.
 *
 * Belt-and-braces for the "tolerant reader" rule: the backend always
 * populates `workforce_profile`, but a stale cache, an old deployment,
 * or a wire-format hiccup must never crash the whole Every Fabric tree.
 */
export function defaultWorkforceProfile(): WorkforceProfile {
  return {
    role: '',
    department: null,
    owner_user_id: null,
    autonomy_level: 'approval_required',
    escalation: {
      owner_user_id: null,
      ticket_queue: null,
      notify_emails: [],
      confidence_threshold: 0.6,
      blocked_intents: []
    },
    budget: {
      daily_credit_limit: null,
      weekly_credit_limit: null,
      monthly_credit_limit: null,
      on_exceeded: 'pause'
    },
    knowledge_refs: [],
    instructions: '',
    archived_at: null,
    archived_by_user_id: null
  }
}

/**
 * Ensure a Workforce Agent payload has every field the UI relies on.
 *
 * Coerces missing collections to empty arrays and fills `workforce_profile`
 * with a safe default so render code can read fields directly without
 * null-checks at every call site.
 */
export function normalizeWorkforceAgent(agent: WorkforceAgent): WorkforceAgent {
  return {
    ...agent,
    surfaces: agent.surfaces ?? [],
    tags: agent.tags ?? [],
    skill_ids: agent.skill_ids ?? [],
    policy_refs: agent.policy_refs ?? [],
    workforce_profile: agent.workforce_profile ?? defaultWorkforceProfile()
  }
}

export function tokensToCredits(totalTokens: number | null | undefined): number {
  if (totalTokens === null || totalTokens === undefined) return 0
  if (!Number.isFinite(totalTokens) || totalTokens <= 0) return 0
  const whole = Math.floor(totalTokens / TOKENS_PER_CREDIT)
  const remainder = totalTokens % TOKENS_PER_CREDIT
  const credits = whole + (remainder > 0 ? 1 : 0)
  return Math.max(credits, MIN_CREDITS_PER_BILLED_RUN)
}

// Phase 6: aggregated workforce credit metrics
//
// Mirrors src/workforce/metrics.py response shapes. The backend serves
// snake_case (response_model_by_alias=False) so types match field-for-field.

export type WorkforceMetricsWindow = 'day' | 'week' | 'month'

export interface WorkforceMetricsTotals {
  runs: number
  completed_runs: number
  failed_runs: number
  cancelled_runs: number
  total_tokens: number
  total_credits: number
  estimated_cost_usd: number
}

export interface WorkforceMetricsBucket {
  date: string // YYYY-MM-DD (UTC)
  runs: number
  credits: number
  tokens: number
}

export interface WorkforceAgentMetrics {
  agent_id: string
  window: WorkforceMetricsWindow
  from_date: string
  to_date: string
  totals: WorkforceMetricsTotals
  daily_buckets: WorkforceMetricsBucket[]
}

export interface WorkforceWorkspaceAgentBreakdown {
  agent_id: string
  totals: WorkforceMetricsTotals
  last_completed_at?: string | null
}

// Business-value rollup mirroring src/workforce/metrics.py
// WorkforceBusinessMetrics. Drives the workspace "Value Scoreboard".
export interface WorkforceBusinessMetrics {
  cases_handled: number
  measured_runs: number
  avg_duration_ms: number
  p50_duration_ms: number
  p90_duration_ms: number
  sla_target_ms: number
  under_sla_runs: number
  escalated_runs: number
  autonomous_runs: number
  guardrail_stops: number
  audited_runs: number
}

export interface WorkforceWorkspaceMetrics {
  workspace_id: string
  window: WorkforceMetricsWindow
  from_date: string
  to_date: string
  totals: WorkforceMetricsTotals
  daily_buckets: WorkforceMetricsBucket[]
  by_agent: WorkforceWorkspaceAgentBreakdown[]
  runs_today: number
  business: WorkforceBusinessMetrics
}

// Phase A: per-source breakdown for the agent overview tab.
export interface WorkforceSourceBreakdownEntry {
  source: string
  runs: number
  credits: number
  tokens: number
}

export interface WorkforceSourceBreakdown {
  window: WorkforceMetricsWindow
  from_date: string
  to_date: string
  entries: WorkforceSourceBreakdownEntry[]
}

// One-shot KPI feed for the per-agent Overview tab: today + week +
// month + per-source breakdown so the page renders without three or
// four parallel metrics requests.
export interface WorkforceAgentMetricsSummary {
  agent_id: string
  today: WorkforceAgentMetrics
  week: WorkforceAgentMetrics
  month: WorkforceAgentMetrics
  source_breakdown: WorkforceSourceBreakdown
}

// Raw ledger row returned by GET /workforce/agents/{id}/ledger.
export interface WorkforceLedgerRow {
  ledger_id: string
  session_id: string
  workforce_agent_id: string
  workforce_trigger_id?: string | null
  workspace_id: string
  source: 'manual' | 'schedule' | 'webhook' | 'inbound_email'
  status: 'completed' | 'failed' | 'cancelled'
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  credits: number
  estimated_cost_usd?: number | null
  formula_version: string
  started_at?: string | null
  completed_at: string
  duration_ms?: number | null
  created_at: string
}

export interface WorkforceLedgerPage {
  data: WorkforceLedgerRow[]
  total: number
}

export function emptyMetricsTotals(): WorkforceMetricsTotals {
  return {
    runs: 0,
    completed_runs: 0,
    failed_runs: 0,
    cancelled_runs: 0,
    total_tokens: 0,
    total_credits: 0,
    estimated_cost_usd: 0
  }
}

export function emptyBusinessMetrics(): WorkforceBusinessMetrics {
  return {
    cases_handled: 0,
    measured_runs: 0,
    avg_duration_ms: 0,
    p50_duration_ms: 0,
    p90_duration_ms: 0,
    sla_target_ms: 0,
    under_sla_runs: 0,
    escalated_runs: 0,
    autonomous_runs: 0,
    guardrail_stops: 0,
    audited_runs: 0
  }
}
