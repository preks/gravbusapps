import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowseSkillsView } from '../BrowseSkillsView'

const mockGetSkillsManifest = jest.fn()
const mockArchiveSkill = jest.fn()
const mockListSkillFiles = jest.fn()

jest.mock('../../../hooks/useEnterpriseAgentClient', () => {
  // Single stable client object so that React effects keyed on client identity don't cycle.
  const stableClient = {
    getSkillsManifest: (...args: unknown[]) => mockGetSkillsManifest(...args),
    archiveSkill: (...args: unknown[]) => mockArchiveSkill(...args),
    listSkillFiles: (...args: unknown[]) => mockListSkillFiles(...args),
    listArchivedSkills: jest.fn().mockResolvedValue([]),
    enableSkill: jest.fn().mockResolvedValue({}),
    disableSkill: jest.fn().mockResolvedValue({}),
    getSkill: jest.fn(),
    saveSkillRaw: jest.fn(),
    uploadSkillFiles: jest.fn(),
    deleteSkillFile: jest.fn(),
    exportSkillBundle: jest.fn()
  }
  return {
    useEnterpriseAgentClient: () => stableClient
  }
})

describe('BrowseSkillsView', () => {
  beforeEach(() => {
    mockGetSkillsManifest.mockReset()
    mockArchiveSkill.mockReset()
    mockListSkillFiles.mockReset()
  })

  it('shows draft and published version badges on skill cards', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [
        {
          skill_id: 'skl_a',
          name: 'Alpha',
          description: 'Do alpha',
          version: 3,
          published_version: 2
        }
      ]
    })

    render(<BrowseSkillsView accessToken="token" />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-version-skl_a')).toBeInTheDocument())
    expect(screen.getByTestId('browse-skills-version-skl_a')).toHaveTextContent('pub v2')
    expect(screen.getByTestId('browse-skills-version-skl_a')).toHaveTextContent('draft v3')
  })

  it('fetches the manifest on mount and renders every saved skill', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [
        { skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' },
        { skill_id: 'skl_b', name: 'Beta', description: 'Do beta' },
        { skill_id: 'skl_c', name: 'Gamma', description: 'Do gamma' }
      ]
    })

    render(<BrowseSkillsView accessToken="token" />)

    await waitFor(() => {
      expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument()
    })
    expect(screen.getByTestId('browse-skills-card-skl_b')).toBeInTheDocument()
    expect(screen.getByTestId('browse-skills-card-skl_c')).toBeInTheDocument()
    expect(mockGetSkillsManifest).toHaveBeenCalledTimes(1)
  })

  it('filters skills by search query', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [
        { skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' },
        { skill_id: 'skl_b', name: 'Beta', description: 'Do beta' }
      ]
    })

    render(<BrowseSkillsView accessToken="token" />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('browse-skills-search'), { target: { value: 'beta' } })

    expect(screen.queryByTestId('browse-skills-card-skl_a')).not.toBeInTheDocument()
    expect(screen.getByTestId('browse-skills-card-skl_b')).toBeInTheDocument()
  })

  it('clicking the row body invokes onEditSkill with the skill id', async () => {
    const onEditSkill = jest.fn()
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })

    render(<BrowseSkillsView accessToken="token" onEditSkill={onEditSkill} />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-row-skl_a')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('browse-skills-row-skl_a'))
    expect(onEditSkill).toHaveBeenCalledWith('skl_a')
  })

  it('highlights the selected row when selectedSkillId matches', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [
        { skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' },
        { skill_id: 'skl_b', name: 'Beta', description: 'Do beta' }
      ]
    })

    render(<BrowseSkillsView accessToken="token" onEditSkill={jest.fn()} selectedSkillId="skl_a" />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument())

    expect(screen.getByTestId('browse-skills-card-skl_a')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('browse-skills-card-skl_b')).not.toHaveAttribute('data-selected')
  })

  it('archive confirms via dialog and then calls the client', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })
    mockArchiveSkill.mockResolvedValue(undefined)
    jest.spyOn(window, 'confirm').mockReturnValue(true)

    render(<BrowseSkillsView accessToken="token" />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByTestId('browse-skills-archive-skl_a'))
    })

    expect(window.confirm).toHaveBeenCalled()
    expect(mockArchiveSkill).toHaveBeenCalledWith('skl_a')
    await waitFor(() => expect(screen.queryByTestId('browse-skills-card-skl_a')).not.toBeInTheDocument())
  })
})
