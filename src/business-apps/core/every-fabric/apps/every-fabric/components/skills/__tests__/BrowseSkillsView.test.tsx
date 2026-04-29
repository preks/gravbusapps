import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowseSkillsView } from '../BrowseSkillsView'

const mockGetSkillsManifest = jest.fn()
const mockDeleteSkill = jest.fn()
const mockListSkillFiles = jest.fn()

jest.mock('../../../hooks/useEnterpriseAgentClient', () => {
  // Single stable client object so that React effects keyed on client identity don't cycle.
  const stableClient = {
    getSkillsManifest: (...args: unknown[]) => mockGetSkillsManifest(...args),
    deleteSkill: (...args: unknown[]) => mockDeleteSkill(...args),
    listSkillFiles: (...args: unknown[]) => mockListSkillFiles(...args),
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
    mockDeleteSkill.mockReset()
    mockListSkillFiles.mockReset()
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

  it('shows a "Use skill" button only when onSelectSkill is provided', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })

    const { rerender } = render(<BrowseSkillsView accessToken="token" />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument())
    expect(screen.queryByTestId('browse-skills-use-skl_a')).not.toBeInTheDocument()

    rerender(<BrowseSkillsView accessToken="token" onSelectSkill={jest.fn()} />)
    expect(screen.getByTestId('browse-skills-use-skl_a')).toBeInTheDocument()
  })

  it('onSelectSkill is invoked with the full manifest entry', async () => {
    const onSelectSkill = jest.fn()
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })

    render(<BrowseSkillsView accessToken="token" onSelectSkill={onSelectSkill} />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-use-skl_a')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('browse-skills-use-skl_a'))
    expect(onSelectSkill).toHaveBeenCalledWith(
      expect.objectContaining({ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' })
    )
  })

  it('renders a disabled "Added" button when the skill id is in attachedSkillIds', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [
        { skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' },
        { skill_id: 'skl_b', name: 'Beta', description: 'Do beta' }
      ]
    })

    render(<BrowseSkillsView accessToken="token" onSelectSkill={jest.fn()} attachedSkillIds={new Set(['skl_a'])} />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument())

    // skl_a is attached -> Added button, no Use button.
    const added = screen.getByTestId('browse-skills-added-skl_a') as HTMLButtonElement
    expect(added).toBeInTheDocument()
    expect(added).toBeDisabled()
    expect(screen.queryByTestId('browse-skills-use-skl_a')).not.toBeInTheDocument()

    // skl_b is not attached -> normal Use button.
    expect(screen.getByTestId('browse-skills-use-skl_b')).toBeInTheDocument()
    expect(screen.queryByTestId('browse-skills-added-skl_b')).not.toBeInTheDocument()
  })

  it('does not invoke onSelectSkill when an Added card is clicked', async () => {
    const onSelectSkill = jest.fn()
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })

    render(<BrowseSkillsView accessToken="token" onSelectSkill={onSelectSkill} attachedSkillIds={new Set(['skl_a'])} />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-added-skl_a')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('browse-skills-added-skl_a'))
    expect(onSelectSkill).not.toHaveBeenCalled()
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

  it('clicking "Use skill" does not trigger onEditSkill (footer is a sibling of the row button)', async () => {
    const onEditSkill = jest.fn()
    const onSelectSkill = jest.fn()
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })

    render(<BrowseSkillsView accessToken="token" onEditSkill={onEditSkill} onSelectSkill={onSelectSkill} />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-use-skl_a')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('browse-skills-use-skl_a'))
    expect(onSelectSkill).toHaveBeenCalledWith(expect.objectContaining({ skill_id: 'skl_a' }))
    expect(onEditSkill).not.toHaveBeenCalled()
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

  it('delete asks for confirmation and then calls the client', async () => {
    mockGetSkillsManifest.mockResolvedValue({
      skills: [{ skill_id: 'skl_a', name: 'Alpha', description: 'Do alpha' }]
    })
    mockDeleteSkill.mockResolvedValue(undefined)

    render(<BrowseSkillsView accessToken="token" />)
    await waitFor(() => expect(screen.getByTestId('browse-skills-card-skl_a')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('browse-skills-delete-skl_a'))
    const confirmBtn = screen.getByTestId('browse-skills-confirm-delete-skl_a')

    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    expect(mockDeleteSkill).toHaveBeenCalledWith('skl_a')
    await waitFor(() => expect(screen.queryByTestId('browse-skills-card-skl_a')).not.toBeInTheDocument())
  })
})
