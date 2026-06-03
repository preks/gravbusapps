import type { AgentStreamEvent, SkillLoadedEvent } from '../../types/enterpriseAgent'
import type { ActiveSkillInfo } from './types'

export function pickActiveSkillFromEvents(events: AgentStreamEvent[]): ActiveSkillInfo | null {
  if (events.length === 0) return null
  const isSkillEvent = (e: AgentStreamEvent): e is SkillLoadedEvent =>
    e.type === 'skill_loaded' || e.type === 'skill_scoped'
  const loaded = events.find((e): e is SkillLoadedEvent => e.type === 'skill_loaded')
  const skillEvent = loaded ?? events.find(isSkillEvent)
  if (!skillEvent?.skill) return null
  return {
    skill_id: skillEvent.skill.skill_id,
    name: skillEvent.skill.name,
    category: skillEvent.skill.category,
    description: skillEvent.skill.description,
    icon: skillEvent.skill.icon,
    was_auto_detected: skillEvent.was_auto_detected,
    version: skillEvent.skill.version,
    published_version: skillEvent.skill.published_version,
    current_version: skillEvent.skill.current_version
  }
}
