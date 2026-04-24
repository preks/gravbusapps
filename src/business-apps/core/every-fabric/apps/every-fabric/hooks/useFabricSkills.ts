import { useMemo } from 'react'
import type { AgentStreamEvent } from '../types/enterpriseAgent'
import { humanizeSkillId } from '../utils/skillUtils'

type StepStartedEvent = Extract<AgentStreamEvent, { type: 'step_started' }>
type SkillLoadedEvent = Extract<AgentStreamEvent, { type: 'skill_loaded' }>

/**
 * UI-ready view of the skill currently in use by the agent.
 *
 * `skillId` is the raw backend id (e.g. `"create-hook"`), `skillName` is
 * the human-readable label derived either from the rich `skill_loaded`
 * event payload, or — when only the tool call is available — from the
 * kebab-case id.
 */
export interface ActiveFabricSkill {
  skillId: string
  skillName: string
  /** Present when the source was a rich `skill_loaded` SSE event. */
  description?: string
  /** Present when the source was a rich `skill_loaded` SSE event. */
  category?: string
  /** True when the skill came from the agent's auto-detection path. */
  wasAutoDetected?: boolean
  /** Sequence number used to pick the most recent skill. */
  seq: number
}

/**
 * Extract `skill_id` from a `step_started` event's tool input. The
 * backend sends inputs as a free-form object; the `skill_load` tool
 * accepts a single `skill_id` string argument.
 */
const extractSkillIdFromStepStart = (event: StepStartedEvent): string | null => {
  if (event.name !== 'skill_load') return null
  const raw = event.input?.skill_id
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  return null
}

const fromStepStarted = (event: StepStartedEvent): ActiveFabricSkill | null => {
  const skillId = extractSkillIdFromStepStart(event)
  if (!skillId) return null
  return {
    skillId,
    skillName: humanizeSkillId(skillId),
    seq: event.seq
  }
}

const fromSkillLoaded = (event: SkillLoadedEvent): ActiveFabricSkill => ({
  skillId: event.skill.skill_id,
  skillName: event.skill.name || humanizeSkillId(event.skill.skill_id),
  description: event.skill.description,
  category: event.skill.category,
  wasAutoDetected: event.was_auto_detected,
  seq: event.seq
})

/**
 * Reduces the SSE event stream into the set of skills the agent has
 * touched this session, plus a convenient pointer to the most recent
 * (i.e. "currently active") skill.
 *
 * Sources, in order of preference for the same `skillId`:
 *   1. `skill_loaded` SSE events (rich payload: name, description, …)
 *   2. `step_started` events with `name === 'skill_load'` (tool call)
 *
 * Multiple tool calls to the same skill_id collapse into one entry so
 * the UI shows a stable row instead of flickering on re-loads.
 */
export const useFabricSkills = (
  events: AgentStreamEvent[]
): {
  activeSkill: ActiveFabricSkill | null
  loadedSkills: ActiveFabricSkill[]
  /** Map of `step_id` → skill id for row-level correlation (Activity badge). */
  skillIdByStepId: Map<string, string>
} => {
  return useMemo(() => {
    const bySkillId = new Map<string, ActiveFabricSkill>()
    const skillIdByStepId = new Map<string, string>()

    for (const event of events) {
      if (event.type === 'step_started') {
        const row = fromStepStarted(event)
        if (row) {
          skillIdByStepId.set(event.step_id, row.skillId)
          const prior = bySkillId.get(row.skillId)
          if (!prior || prior.seq < row.seq) {
            bySkillId.set(row.skillId, prior ? { ...prior, ...row } : row)
          }
        }
      } else if (event.type === 'skill_loaded') {
        const row = fromSkillLoaded(event)
        const prior = bySkillId.get(row.skillId)
        bySkillId.set(row.skillId, prior ? { ...prior, ...row, seq: Math.max(prior.seq, row.seq) } : row)
      }
    }

    const loadedSkills = Array.from(bySkillId.values()).sort((a, b) => a.seq - b.seq)
    const activeSkill = loadedSkills.length === 0 ? null : loadedSkills[loadedSkills.length - 1]

    return { activeSkill, loadedSkills, skillIdByStepId }
  }, [events])
}
