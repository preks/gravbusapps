import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UserProfileBriefEditor } from '../components/UserProfileBriefEditor'
import type { UserProfileBrief } from '../../../hooks/useEnterpriseAgentClient'

const baseProfile: UserProfileBrief = {
  user_id: 'user-1',
  tenant_id: 'tenant-1',
  brief_text: 'Ed works in People Operations and manages HR workflows.',
  generated_brief_text: 'Ed works in People Operations and manages HR workflows.',
  source_facts: {},
  source_hash: 'hash-1',
  status: 'ready',
  generation_version: 1,
  updated_at: '2026-06-09T10:00:00Z'
}

const makeClient = (overrides: Partial<Record<string, jest.Mock>> = {}) =>
  ({
    getUserProfileBrief: jest.fn().mockResolvedValue(baseProfile),
    ensureUserProfileBrief: jest.fn().mockResolvedValue(baseProfile),
    updateUserProfileBrief: jest.fn().mockResolvedValue({ ...baseProfile, status: 'edited' }),
    regenerateUserProfileBrief: jest.fn().mockResolvedValue({ ...baseProfile, status: 'generating' }),
    ...overrides
  }) as never

describe('UserProfileBriefEditor', () => {
  it('loads and saves user edits', async () => {
    const updateUserProfileBrief = jest.fn().mockResolvedValue({
      ...baseProfile,
      status: 'edited',
      brief_text: 'Edited profile brief.'
    })
    const client = makeClient({ updateUserProfileBrief })

    render(<UserProfileBriefEditor client={client} isOpen />)

    const textarea = await screen.findByTestId('pref-user-profile-brief')
    expect(textarea).toHaveValue(baseProfile.brief_text)

    fireEvent.change(textarea, { target: { value: 'Edited profile brief.' } })
    fireEvent.blur(textarea)

    await waitFor(() => expect(updateUserProfileBrief).toHaveBeenCalledWith('Edited profile brief.'))
  })

  it('ensures generation when the profile is missing', async () => {
    const missingProfile: UserProfileBrief = {
      ...baseProfile,
      brief_text: '',
      generated_brief_text: '',
      source_hash: '',
      status: 'missing'
    }
    const generatingProfile: UserProfileBrief = {
      ...missingProfile,
      status: 'generating'
    }
    const ensureUserProfileBrief = jest.fn().mockResolvedValue(generatingProfile)
    const client = makeClient({
      getUserProfileBrief: jest.fn().mockResolvedValue(missingProfile),
      ensureUserProfileBrief
    })

    render(<UserProfileBriefEditor client={client} isOpen />)

    await waitFor(() => expect(ensureUserProfileBrief).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Generating from employee data...')).toBeInTheDocument()
  })
})
