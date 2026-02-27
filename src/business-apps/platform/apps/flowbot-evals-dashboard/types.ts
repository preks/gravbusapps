export type BucketGranularity = 'hour' | 'day'

export interface DashboardResponse {
  workflow: string | null
  from_ts: string
  to_ts: string
  cards: DashboardCard[]
  distributions: DistributionBlock
  timeseries: TimeseriesPoint[]
  error_breakdown: BreakdownItem[]
  tool_breakdown: BreakdownItem[]
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

export interface RunRow {
  run_id: string
  created_at: string
  workflow: string | null
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
}
