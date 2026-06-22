import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SkillAssignmentPicker } from '../SkillAssignmentPicker'

const mockGetAgentSkills = jest.fn()
const mockSetAgentSkills = jest.fn()
const mockClientGet = jest.fn()
const mockPromptManagerClient = {
  getAgentSkills: (...args: unknown[]) => mockGetAgentSkills(...args),
  setAgentSkills: (...args: unknown[]) => mockSetAgentSkills(...args),
  get: (...args: unknown[]) => mockClientGet(...args)
}

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) => {
        if (key === 'agents-skill-picker-pin' && vars?.version != null) {
          return `Pin v${vars.version}`
        }
        return key
      }
    })
  }
})

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockPromptManagerClient
}))

describe('SkillAssignmentPicker', () => {
  beforeAll(() => {
    expect(React).toBeDefined()
  })

  beforeEach(() => {
    mockGetAgentSkills.mockReset()
    mockSetAgentSkills.mockReset()
    mockClientGet.mockReset()
    mockClientGet.mockImplementation((url: string) => {
      if (url.endsWith('/versions')) {
        return Promise.resolve([
          { skill_id: 'alpha', version: 1, is_published: true },
          { skill_id: 'alpha', version: 2, is_published: true },
          { skill_id: 'alpha', version: 3, is_published: false }
        ])
      }
      return Promise.resolve([
        {
          skill_id: 'alpha',
          name: 'Alpha',
          description: 'Alpha skill',
          status: 'approved',
          is_active: true,
          published_version: 2,
          version: 3
        }
      ])
    })
    mockGetAgentSkills.mockResolvedValue({
      agent_id: 'agent-1',
      source: 'prompt_odm',
      skills: [
        {
          skill_id: 'alpha',
          name: 'Alpha',
          description: 'Alpha skill',
          status: 'approved',
          follow_latest: false,
          version: 1
        }
      ],
      skill_bindings: [
        {
          skill_id: 'alpha',
          name: 'Alpha',
          description: 'Alpha skill',
          status: 'approved',
          follow_latest: false,
          version: 1
        }
      ]
    })
    mockSetAgentSkills.mockResolvedValue({ agent_id: 'agent-1', skill_ids: ['alpha'], count: 1 })
  })

  it('persists version-aware skill bindings on save', async () => {
    const onSaved = jest.fn()
    render(
      <SkillAssignmentPicker
        agent={{ id: 'agent-1', name: 'test_agent', skill_ids: ['alpha'], skills_count: 1 } as never}
        accessToken="token"
        onClose={jest.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => expect(screen.getByTestId('skill-option-alpha')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('skill-version-select-alpha')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'agents-skill-picker-save' }))

    await waitFor(() => expect(mockSetAgentSkills).toHaveBeenCalled())
    expect(mockSetAgentSkills).toHaveBeenCalledWith('agent-1', [
      { skill_id: 'alpha', follow_latest: false, version: 1, enabled: true }
    ])
    expect(onSaved).toHaveBeenCalledWith(['alpha'])
  })

  it('does not offer unpublished draft versions for pinning', async () => {
    render(
      <SkillAssignmentPicker
        agent={{ id: 'agent-1', name: 'test_agent', skill_ids: ['alpha'], skills_count: 1 } as never}
        accessToken="token"
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />
    )

    const select = (await screen.findByTestId('skill-version-select-alpha')) as HTMLSelectElement
    const options = Array.from(select.options).map(option => option.textContent)
    expect(options.some(text => text?.includes('agents-skill-picker-pin') || text?.includes('Pin v1'))).toBe(true)
    expect(options.some(text => text?.includes('Pin v2'))).toBe(true)
    expect(options).not.toContain('Pin v3')
  })
})
