export type BucketGranularity = 'hour' | 'day'

export interface DashboardResponse {
  workflow: string | null
  include_split_view?: boolean
  from_ts: string
  to_ts: string
  cards: DashboardCard[]
  distributions: DistributionBlock
  timeseries: TimeseriesPoint[]
  error_breakdown: BreakdownItem[]
  tool_breakdown: BreakdownItem[]
  model_breakdown: BreakdownItem[]
  provider_breakdown: BreakdownItem[]
  token_breakdown?: TokenBreakdownBlock
  token_breakdown_by_model?: TokenBreakdownByModelEntry[]
  tool_token_stats?: ToolTokenStat[]
  top_cost_runs: RunRow[]
  recent_runs: RunRow[]
}

export interface DashboardCard {
  key: string
  label: string
  value: number | null
  unit?: string
}

export interface QuantileStats {
  p50: number | null
  p95: number | null
  p99: number | null
}

export interface DistributionBlock {
  total_ms: QuantileStats
  ttft_ms: QuantileStats
  total_tokens: QuantileStats
}

export interface TimeseriesPoint {
  ts: string
  runs: number
  error_rate: number
  p50_total_ms: number | null
  p95_total_ms: number | null
  p50_tokens: number | null
  p95_tokens: number | null
}

export interface BreakdownItem {
  key: string
  count: number
  share: number
}

export interface ToolTokenStat {
  key: string
  runs: number
  avg_total_tokens: number | null
  p50_total_tokens: number | null
  p95_total_tokens: number | null
}

export interface TokenTotals {
  // Preferred (new contract)
  total_tokens?: number | null
  input_tokens?: number | null
  output_tokens?: number | null
  cached_input_tokens?: number | null
  uncached_total_tokens?: number | null

  // Backwards-compatible fallbacks (old contract)
  total?: number | null
  input?: number | null
  output?: number | null
  cached_input?: number | null
  uncached_total?: number | null
}

export interface TokenBreakdownBlock {
  overall?: TokenTotals
  monolith?: TokenTotals
  controller?: TokenTotals
}

export interface RunRow {
  run_id: string
  created_at: string
  workflow: string | null
  workflow_display?: string | null
  is_split_view?: boolean | null
  split_view_type?: string | null
  parent_run_id?: string | null
  parent_workflow?: string | null
  from_agent?: string | null
  to_agent?: string | null
  session_id: string | null
  total_ms: number | null
  ttft_ms: number | null
  total_tokens: number | null
  input_tokens: number | null
  output_tokens: number | null
  cached_input_tokens: number | null
  num_tool_calls: number | null
  tool: string | null
  error_type: string | null
  llm_provider?: string | null
  llm_model?: string | null
}

export interface TokenBreakdownByModelEntry {
  key: string
  provider: string
  runs: number
  avg_total_tokens: number | null
  sum_total_tokens: number | null
  avg_total_ms: number | null
  p50_total_ms: number | null
  p95_total_ms: number | null
}
