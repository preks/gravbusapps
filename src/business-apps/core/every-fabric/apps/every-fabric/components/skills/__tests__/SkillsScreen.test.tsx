import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SkillsScreen } from '../SkillsScreen'

jest.mock('../BrowseSkillsView', () => ({
  BrowseSkillsView: ({ onEditSkill }: { onEditSkill?: (skillId: string) => void }) => {
    return (
      <div data-testid="browse-skills-view">
        <button type="button" data-testid="mock-edit-skill" onClick={() => onEditSkill?.('skl_foo')}>
          edit-skill
        </button>
      </div>
    )
  }
}))

let capturedEditorSkillId: string | null | undefined
jest.mock('../SkillEditorPanel', () => ({
  SkillEditorPanel: ({ skillId }: { skillId: string | null }) => {
    capturedEditorSkillId = skillId
    return <div data-testid="skill-editor-panel-mock" data-skill-id={skillId ?? ''} />
  }
}))

describe('SkillsScreen', () => {
  beforeEach(() => {
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

  it('routes onEditSkill from BrowseSkillsView into SkillEditorPanel.skillId', () => {
    render(<SkillsScreen accessToken="token" onBack={jest.fn()} />)
    expect(capturedEditorSkillId).toBeNull()

    fireEvent.click(screen.getByTestId('mock-edit-skill'))
    expect(capturedEditorSkillId).toBe('skl_foo')
  })
})
