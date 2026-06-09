// KPI tiles shown faintly behind the glass cluster.
//
// Generic value/label pairs so every consumer (workforce, agent mesh) can roll
// up its own metrics and feed them to the same distant background panels.

export interface ValueKpiTile {
  id: string
  value: string
  label: string
}

// 12_400 -> "12.4k", 980 -> "980". Keeps distant panels readable.
export function compactNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}
