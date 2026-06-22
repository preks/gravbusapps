// Maps trace event kinds to Tailwind design-token classes for the Gantt bars.

import type { FrameKind } from '../../utils/traceModel'

interface TraceColorEntry {
  /** Background class for Gantt bars. */
  bar: string
  /** Text colour for the legend label. */
  text: string
  /** FTL key for the legend label. */
  labelKey: string
}

const TRACE_COLORS: Record<string, TraceColorEntry> = {
  tool: { bar: 'gba:bg-sky-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-tool' },
  subagent: { bar: 'gba:bg-emerald-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-subagent' },
  expert: { bar: 'gba:bg-violet-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-expert' },
  decision: { bar: 'gba:bg-amber-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-decision' },
  skill: { bar: 'gba:bg-teal-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-skill' },
  step: {
    bar: 'gba:bg-muted-foreground/40',
    text: 'gba:text-muted-foreground',
    labelKey: 'trace-explorer-legend-step'
  },
  hitl: { bar: 'gba:bg-rose-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-hitl' },
  terminal: { bar: 'gba:bg-emerald-700', text: 'gba:text-white', labelKey: 'trace-explorer-legend-terminal' },
  capability_missing: {
    bar: 'gba:bg-destructive',
    text: 'gba:text-destructive-foreground',
    labelKey: 'trace-explorer-legend-capability-missing'
  },
  artifact: { bar: 'gba:bg-cyan-500', text: 'gba:text-white', labelKey: 'trace-explorer-legend-artifact' }
}

const FALLBACK: TraceColorEntry = {
  bar: 'gba:bg-muted',
  text: 'gba:text-muted-foreground',
  labelKey: 'trace-explorer-legend-other'
}

export function traceColor(kind: FrameKind | string): TraceColorEntry {
  return TRACE_COLORS[kind] ?? FALLBACK
}

export const LEGEND_KINDS: FrameKind[] = ['tool', 'subagent', 'expert', 'decision', 'skill', 'hitl']
