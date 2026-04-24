import { useMemo } from 'react'
import type { AgentDecisionEvent, AgentStreamEvent, DecisionCategory } from '../types/enterpriseAgent'
import { humanizeSkillId } from '../utils/skillUtils'

type SkillLoadedEvent = Extract<AgentStreamEvent, { type: 'skill_loaded' }>
type TerminalEvent = Extract<AgentStreamEvent, { type: 'terminal' }>
type StepStartedEvent = Extract<AgentStreamEvent, { type: 'step_started' }>

/**
 * UI-ready view of an agent decision row. This is a superset of the
 * `AgentDecisionEvent` payload with a stable `id` for list rendering and
 * a normalized `seq` value — older sessions whose trace lacks `decision`
 * events can still populate this list via synthesized rows.
 */
export interface DecisionItem {
  id: string
  seq: number
  timestamp: string
  category: DecisionCategory
  title: string
  chosen: string
  rationale: string
  alternatives?: string[]
  confidence?: number
  metadata?: Record<string, unknown>
  /** True when the row was synthesized from a legacy event rather than a `decision` SSE event. */
  synthesized?: boolean
}

const toDecisionItem = (event: AgentDecisionEvent): DecisionItem => ({
  id: event.event_id,
  seq: event.seq,
  timestamp: event.timestamp,
  category: event.category,
  title: event.title,
  chosen: event.chosen,
  rationale: event.rationale,
  alternatives: event.alternatives,
  confidence: event.confidence,
  metadata: event.metadata
})

const skillLoadedToDecision = (event: SkillLoadedEvent): DecisionItem => ({
  id: `synthesized-skill-${event.event_id}`,
  seq: event.seq,
  timestamp: event.timestamp,
  category: 'skill',
  title: `Loaded skill ${event.skill.name}`,
  chosen: event.skill.skill_id,
  rationale: event.skill.description || 'Matched enterprise skill for this task',
  metadata: {
    was_auto_detected: event.was_auto_detected,
    category: event.skill.category
  },
  synthesized: true
})

/**
 * Synthesize a decision row from an agent `skill_load` tool call. Used
 * when the backend does not emit a dedicated `decision` or `skill_loaded`
 * event for the chosen skill — the tool invocation itself is the branch
 * point we want to surface in the Decisions panel.
 */
const skillLoadStepToDecision = (event: StepStartedEvent, skillId: string): DecisionItem => {
  const name = humanizeSkillId(skillId)
  return {
    id: `synthesized-skill-load-${event.event_id}`,
    seq: event.seq,
    timestamp: event.timestamp,
    category: 'skill',
    title: `Using skill ${name}`,
    chosen: skillId,
    rationale: 'Agent loaded this skill to guide its next steps.',
    metadata: { source: 'skill_load_tool' },
    synthesized: true
  }
}

const extractSkillLoadSkillId = (event: StepStartedEvent): string | null => {
  if (event.name !== 'skill_load') return null
  const raw = event.input?.skill_id
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  return null
}

const terminalReflectionToDecision = (event: TerminalEvent): DecisionItem | null => {
  const reflection = event.reflection
  if (!reflection) return null
  const missing = reflection.missing_steps?.length ?? 0
  const issues = reflection.quality_issues?.length ?? 0
  let rationale: string
  if (missing === 0 && issues === 0) {
    rationale = reflection.complete ? 'Output quality confirmed' : 'Reflection completed'
  } else {
    rationale = `${issues} quality issue(s), ${missing} gap(s) found`
  }
  return {
    id: `synthesized-reflection-${event.event_id}`,
    seq: event.seq,
    timestamp: event.timestamp ?? new Date().toISOString(),
    category: 'reflection',
    title: reflection.recommendation === 'continue' ? 'Reflection: continue' : 'Reflection: finalize',
    chosen: reflection.recommendation,
    rationale,
    metadata: {
      complete: reflection.complete,
      missing_steps: reflection.missing_steps,
      quality_issues: reflection.quality_issues
    },
    synthesized: true
  }
}

/**
 * Chosen values reported by the backend for "no enterprise skill matched"
 * branches. These decisions carry no user-facing signal (the agent just
 * fell back to the default generic reasoning path) and fire on every turn,
 * so we drop them from the panel entirely to keep the narrative meaningful.
 */
const NO_SKILL_CHOSEN = new Set(['generic_agent', 'none', 'no_skill', ''])

const isNoSkillDecision = (decision: DecisionItem): boolean =>
  decision.category === 'skill' && NO_SKILL_CHOSEN.has(decision.chosen?.trim().toLowerCase() ?? '')

/**
 * Chosen values reported by the backend for "no execution pack loaded"
 * branches. Like no-skill decisions, these fire on every turn when no
 * execution pack is active and add no meaningful signal to the panel.
 */
const NO_EXECUTION_PACK_CHOSEN = new Set(['generic_agent', 'none', 'no_execution_pack', ''])

const isNoExecutionPackDecision = (decision: DecisionItem): boolean =>
  (decision.category as string) === 'execution_pack' &&
  NO_EXECUTION_PACK_CHOSEN.has(decision.chosen?.trim().toLowerCase() ?? '')

/**
 * Collapses consecutive / redundant skill decisions that picked the same
 * skill. The backend may emit one per turn; the UI only needs to surface
 * the first occurrence, since a later "same skill again" row is not a real
 * new branch point.
 */
const dedupeSkillDecisions = (decisions: DecisionItem[]): DecisionItem[] => {
  const seenSkillChosen = new Set<string>()
  const out: DecisionItem[] = []
  for (const d of decisions) {
    if (d.category === 'skill') {
      const key = d.chosen?.trim().toLowerCase() ?? ''
      if (seenSkillChosen.has(key)) continue
      seenSkillChosen.add(key)
    }
    out.push(d)
  }
  return out
}

const extractNativeDecisions = (events: AgentStreamEvent[]): DecisionItem[] => {
  const native: DecisionItem[] = []
  for (const event of events) {
    if (event.type === 'decision') {
      native.push(toDecisionItem(event))
    }
  }
  return native
}

const synthesizeSkillDecisions = (events: AgentStreamEvent[]): DecisionItem[] => {
  const synthesized: DecisionItem[] = []
  const seenSynthesizedSkillIds = new Set<string>()

  for (const event of events) {
    if (event.type === 'skill_loaded') {
      synthesized.push(skillLoadedToDecision(event))
      seenSynthesizedSkillIds.add(event.skill.skill_id)
    }
  }

  for (const event of events) {
    if (event.type !== 'step_started') continue
    const skillId = extractSkillLoadSkillId(event)
    if (!skillId || seenSynthesizedSkillIds.has(skillId)) continue
    synthesized.push(skillLoadStepToDecision(event, skillId))
    seenSynthesizedSkillIds.add(skillId)
  }

  return synthesized
}

const synthesizeReflectionDecision = (events: AgentStreamEvent[]): DecisionItem | null => {
  const terminalEvent = events.find((e): e is TerminalEvent => e.type === 'terminal' && e.status === 'completed')
  if (!terminalEvent) return null
  return terminalReflectionToDecision(terminalEvent)
}

/**
 * Reduces SSE events into a list of discrete decision rows for the
 * Decisions side panel.
 *
 * Primary source: `type: 'decision'` events emitted by prompt-manager
 * (skill selection, reflection verdict, HITL branches, …).
 *
 * Transitional fallback: when no `decision` events are present (older
 * sessions, feature-flagged deployments) we synthesize rows from
 * `skill_loaded` and `terminal.reflection`. Synthesized rows are
 * suppressed for categories that already have a native decision row.
 *
 * Post-processing: we hide "no enterprise skill used" rows (they are
 * noise until we have a richer skill catalog) and dedupe repeated skill
 * rows so a single skill shows once per session instead of once per turn.
 */
export const useFabricDecisions = (events: AgentStreamEvent[]): DecisionItem[] => {
  return useMemo(() => {
    const native = extractNativeDecisions(events)
    const hasNativeSkill = native.some(d => d.category === 'skill')
    const hasNativeReflection = native.some(d => d.category === 'reflection')

    const synthesized: DecisionItem[] = []
    if (!hasNativeSkill) {
      synthesized.push(...synthesizeSkillDecisions(events))
    }
    if (!hasNativeReflection) {
      const reflectionRow = synthesizeReflectionDecision(events)
      if (reflectionRow) synthesized.push(reflectionRow)
    }

    const merged = [...native, ...synthesized]
      .filter(d => !isNoSkillDecision(d) && !isNoExecutionPackDecision(d))
      .sort((a, b) => a.seq - b.seq)

    return dedupeSkillDecisions(merged)
  }, [events])
}
