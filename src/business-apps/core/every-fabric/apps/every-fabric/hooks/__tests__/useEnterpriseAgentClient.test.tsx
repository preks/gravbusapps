import { renderHook } from '@testing-library/react'

const mockPost = jest.fn()
const mockGetAgentSkills = jest.fn()

jest.mock('@/common/utils/serviceResolver', () => ({
  PROMPT_MANAGER_API_URL: 'https://prompt-manager.test'
}))

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => ({
    post: (...args: unknown[]) => mockPost(...args),
    getAgentSkills: (...args: unknown[]) => mockGetAgentSkills(...args)
  })
}))

import { useEnterpriseAgentClient } from '../useEnterpriseAgentClient'

describe('useEnterpriseAgentClient', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockGetAgentSkills.mockReset()
    mockPost.mockResolvedValue({ session_id: 's1', session: {} })
  })

  it('starts sessions with saved pinned skill bindings for the selected expert', async () => {
    mockGetAgentSkills.mockResolvedValue({
      agent_id: 'agent-1',
      skills: [],
      skill_bindings: [
        {
          skill_id: 'alpha',
          follow_latest: false,
          version: 2,
          enabled: true
        }
      ]
    })
    const { result } = renderHook(() => useEnterpriseAgentClient('token'))

    await result.current.startSession('do the thing', {
      selectedAgent: { id: 'agent-1', name: 'Agent One' },
      selectedEnterpriseSkill: {
        id: 'beta',
        skill_id: 'beta',
        name: 'Beta',
        description: 'Beta skill',
        category: 'General',
        version: '1',
        is_active: true,
        publisher: 'Every Fabric',
        install_count: 0,
        onboarding_steps: [],
        tool_refs: ['builtin.web_search']
      }
    } as never)

    expect(mockGetAgentSkills).toHaveBeenCalledWith('agent-1')
    expect(mockPost).toHaveBeenCalledWith(
      '/deep-agent/sessions',
      expect.objectContaining({
        skill_ids: ['alpha', 'beta'],
        skill_bindings: [
          { skill_id: 'alpha', follow_latest: false, version: 2, enabled: true },
          { skill_id: 'beta', follow_latest: true, version: null, enabled: true }
        ]
      })
    )
  })
})
