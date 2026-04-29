import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SkillsScreen } from '../SkillsScreen'
import type { BrowseSkillManifestEntry } from '../BrowseSkillsView'

const mockSetPendingPrefill = jest.fn()
const mockNewSession = jest.fn()
let mockAttachedSkillIds: string[] = []

jest.mock('../../../context/FabricContext', () => ({
  useFabric: () => ({
    setPendingPrefill: (...args: unknown[]) => mockSetPendingPrefill(...args),
    newSession: (...args: unknown[]) => mockNewSession(...args),
    attachedSkillIds: mockAttachedSkillIds
  })
}))

// Pass-through mock for BrowseSkillsView so we can assert behavior without exercising network.
// Captures the `attachedSkillIds` prop so we can assert it was threaded through.
let capturedAttachedSkillIds: Set<string> | undefined
jest.mock('../BrowseSkillsView', () => ({
  BrowseSkillsView: ({
    onSelectSkill,
    attachedSkillIds,
    onEditSkill
  }: {
    onSelectSkill?: (s: unknown) => void
    attachedSkillIds?: Set<string>
    onEditSkill?: (skillId: string) => void
  }) => {
    capturedAttachedSkillIds = attachedSkillIds
    return (
      <div data-testid="browse-skills-view">
        <button
          type="button"
          data-testid="mock-use-skill"
          onClick={() => {
            const skill = {
              skill_id: 'skl_foo',
              name: 'Foo',
              description: 'Do Foo'
            } satisfies BrowseSkillManifestEntry
            onSelectSkill?.(skill)
          }}
        >
          use-skill
        </button>
        <button type="button" data-testid="mock-edit-skill" onClick={() => onEditSkill?.('skl_foo')}>
          edit-skill
        </button>
      </div>
    )
  }
}))

// SkillEditorPanel pulls in useEnterpriseAgentClient (and through it `import.meta`), which Jest
// cannot parse. Stub it to a tiny marker component so SkillsScreen can be unit-tested in isolation.
let capturedEditorSkillId: string | null | undefined
jest.mock('../SkillEditorPanel', () => ({
  SkillEditorPanel: ({ skillId }: { skillId: string | null }) => {
    capturedEditorSkillId = skillId
    return <div data-testid="skill-editor-panel-mock" data-skill-id={skillId ?? ''} />
  }
}))

describe('SkillsScreen', () => {
  beforeEach(() => {
    mockSetPendingPrefill.mockReset()
    mockNewSession.mockReset()
    mockAttachedSkillIds = []
    capturedAttachedSkillIds = undefined
    capturedEditorSkillId = undefined
  })

  it('renders the page title "Enterprise Agent" as an h1', () => {
    render(<SkillsScreen accessToken="token" onBack={jest.fn()} />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/^Enterprise Agent$/)
  })

  it('renders a Back button that calls onBack', () => {
    const onBack = jest.fn()
    render(<SkillsScreen accessToken="token" onBack={onBack} />)

    fireEvent.click(screen.getByTestId('skills-back-button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders a close (X) button that calls onBack', () => {
    const onBack = jest.fn()
    render(<SkillsScreen accessToken="token" onBack={onBack} />)

    fireEvent.click(screen.getByTestId('skills-close-button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('embeds BrowseSkillsView (not the legacy modal)', () => {
    render(<SkillsScreen accessToken="token" onBack={jest.fn()} />)

    expect(screen.getByTestId('browse-skills-view')).toBeInTheDocument()
    expect(screen.queryByTestId('browse-skills-modal')).not.toBeInTheDocument()
  })

  it('Use skill sets pendingPrefill with empty text and skill id, starts a new session, and invokes onBack', () => {
    const onBack = jest.fn()
    render(<SkillsScreen accessToken="token" onBack={onBack} />)

    fireEvent.click(screen.getByTestId('mock-use-skill'))

    expect(mockSetPendingPrefill).toHaveBeenCalledTimes(1)
    const prefill = mockSetPendingPrefill.mock.calls[0][0]
    // Empty opener — the chip on the composer communicates the attachment; the user types their
    // actual prompt. Parity with the skill-creator flow where SKILL_CREATOR_AGENT_OPENER === ''.
    expect(prefill.text).toBe('')
    expect(prefill.config).toMatchObject({ preload_skill_ids: ['skl_foo'] })

    expect(mockNewSession).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('does NOT construct the legacy verbose opener ("Use the \\"X\\" skill. Context: ...")', () => {
    render(<SkillsScreen accessToken="token" onBack={jest.fn()} />)
    fireEvent.click(screen.getByTestId('mock-use-skill'))

    const prefill = mockSetPendingPrefill.mock.calls[0][0]
    // Guard against regression: the old implementation prefilled the textarea with a long
    // "Use the "X" skill. Context: ..." string that the user had to delete before typing.
    expect(prefill.text).not.toMatch(/^Use the "/)
    expect(prefill.text).not.toMatch(/\bContext:/)
  })

  it('routes onEditSkill from BrowseSkillsView into SkillEditorPanel.skillId', () => {
    render(<SkillsScreen accessToken="token" onBack={jest.fn()} />)
    // Initially no skill is selected.
    expect(capturedEditorSkillId).toBeNull()

    fireEvent.click(screen.getByTestId('mock-edit-skill'))
    expect(capturedEditorSkillId).toBe('skl_foo')
  })

  it('threads attachedSkillIds from FabricContext into BrowseSkillsView as a Set', () => {
    mockAttachedSkillIds = ['skl_a', 'skl_b']
    render(<SkillsScreen accessToken="token" onBack={jest.fn()} />)

    expect(capturedAttachedSkillIds).toBeInstanceOf(Set)
    expect(capturedAttachedSkillIds?.has('skl_a')).toBe(true)
    expect(capturedAttachedSkillIds?.has('skl_b')).toBe(true)
    expect(capturedAttachedSkillIds?.has('skl_c')).toBe(false)
  })
})
