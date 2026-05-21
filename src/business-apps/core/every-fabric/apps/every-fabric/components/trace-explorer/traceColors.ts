// Maps trace event kinds to Tailwind design-token classes for the Gantt bars.

import type { FrameKind } from '../../utils/traceModel'

interface TraceColorEntry {
  /** Background class for Gantt bars. */
  bar: string
  /** Text colour for the legend label. */
  text: string
  /** Human label rendered in the legend strip. */
  label: string
}

const TRACE_COLORS: Record<string, TraceColorEntry> = {
  tool: { bar: 'gba:bg-sky-500', text: 'gba:text-white', label: 'Tool call' },
  subagent: { bar: 'gba:bg-emerald-500', text: 'gba:text-white', label: 'Delegation' },
  expert: { bar: 'gba:bg-violet-500', text: 'gba:text-white', label: 'Expert' },
  decision: { bar: 'gba:bg-amber-500', text: 'gba:text-white', label: 'Decision' },
  skill: { bar: 'gba:bg-teal-500', text: 'gba:text-white', label: 'Skill' },
  step: { bar: 'gba:bg-muted-foreground/40', text: 'gba:text-muted-foreground', label: 'Step' },
  hitl: { bar: 'gba:bg-rose-500', text: 'gba:text-white', label: 'Human input' },
  terminal: { bar: 'gba:bg-emerald-700', text: 'gba:text-white', label: 'Terminal' },
  capability_missing: { bar: 'gba:bg-destructive', text: 'gba:text-destructive-foreground', label: 'Missing' },
  artifact: { bar: 'gba:bg-cyan-500', text: 'gba:text-white', label: 'Artifact' }
}

const FALLBACK: TraceColorEntry = { bar: 'gba:bg-muted', text: 'gba:text-muted-foreground', label: 'Other' }

export function traceColor(kind: FrameKind | string): TraceColorEntry {
  return TRACE_COLORS[kind] ?? FALLBACK
}

export const LEGEND_KINDS: FrameKind[] = ['tool', 'subagent', 'expert', 'decision', 'skill', 'hitl']
