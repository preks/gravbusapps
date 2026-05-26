import { renderHook } from '@testing-library/react'
import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { useFabricSkills } from '../useFabricSkills'

describe('useFabricSkills', () => {
  it('captures version metadata from skill_loaded events', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'skill_loaded',
        seq: 1,
        event_id: 'e1',
        timestamp: '2026-01-01T00:00:00Z',
        skill: {
          skill_id: 'create-hook',
          name: 'Create Hook',
          category: 'dev',
          description: 'Hook skill',
          version: 4,
          published_version: 3,
          current_version: 5
        },
        was_auto_detected: false
      }
    ]

    const { result } = renderHook(() => useFabricSkills(events))
    const { activeSkill } = result.current
    expect(activeSkill?.skillId).toBe('create-hook')
    expect(activeSkill?.version).toBe(4)
    expect(activeSkill?.publishedVersion).toBe(3)
    expect(activeSkill?.currentVersion).toBe(5)
  })
})
