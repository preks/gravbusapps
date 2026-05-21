/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AgentMeshShell } from '../AgentMeshShell'

function renderShell(overrides: Partial<React.ComponentProps<typeof AgentMeshShell>> = {}) {
  const props: React.ComponentProps<typeof AgentMeshShell> = {
    scope: 'company',
    onScopeChange: jest.fn(),
    disabledScopes: [],
    title: 'Company Agent Mesh',
    subtitle: 'All agents across the workspace',
    agentCount: 4,
    toolCount: 12,
    showStatus: false,
    onBack: jest.fn(),
    isFullscreen: false,
    onToggleFullscreen: jest.fn(),
    breadcrumbs: [{ scope: 'company', fullscreen: false }],
    canGoBack: false,
    onMeshBack: jest.fn(),
    onBreadcrumbSelect: jest.fn(),
    children: <div data-testid="mesh-test-children" />,
    ...overrides
  }
  return { props, ...render(<AgentMeshShell {...props} />) }
}

describe('AgentMeshShell', () => {
  it('renders the windowed layout by default', () => {
    renderShell()
    const screenContainer = screen.getByTestId('agent-mesh-screen')
    expect(screenContainer.getAttribute('data-fullscreen')).toBe('false')
    expect(screen.getByTestId('mesh-fullscreen-toggle')).toBeInTheDocument()
  })

  it('switches to fullscreen layout when isFullscreen=true', () => {
    renderShell({ isFullscreen: true })
    const screenContainer = screen.getByTestId('agent-mesh-screen')
    expect(screenContainer.getAttribute('data-fullscreen')).toBe('true')
    expect(screen.getByTestId('mesh-floating-controls')).toBeInTheDocument()
  })

  it('invokes onToggleFullscreen when the toggle is clicked', () => {
    const onToggleFullscreen = jest.fn()
    renderShell({ onToggleFullscreen })
    fireEvent.click(screen.getByTestId('mesh-fullscreen-toggle'))
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('exits fullscreen when ESC is pressed', () => {
    const onToggleFullscreen = jest.fn()
    renderShell({ isFullscreen: true, onToggleFullscreen })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('toggles fullscreen with the F key when no input has focus', () => {
    const onToggleFullscreen = jest.fn()
    renderShell({ onToggleFullscreen })
    fireEvent.keyDown(window, { key: 'F' })
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1)
  })

  it('ignores the F shortcut while focus is in an input', () => {
    const onToggleFullscreen = jest.fn()
    renderShell({ onToggleFullscreen })
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: 'F' })
    expect(onToggleFullscreen).not.toHaveBeenCalled()
    input.remove()
  })

  it('renders breadcrumbs when more than one snapshot exists', () => {
    renderShell({
      canGoBack: true,
      breadcrumbs: [
        { scope: 'company', fullscreen: false },
        { scope: 'user', userId: 'u1', label: 'Maria Popescu', fullscreen: false }
      ]
    })
    expect(screen.getByTestId('mesh-breadcrumbs')).toBeInTheDocument()
    expect(screen.getByText('Maria Popescu')).toBeInTheDocument()
  })

  it('calls onMeshBack from Backspace when back history exists', () => {
    const onMeshBack = jest.fn()
    renderShell({
      canGoBack: true,
      breadcrumbs: [
        { scope: 'company', fullscreen: false },
        { scope: 'user', userId: 'u1', fullscreen: false }
      ],
      onMeshBack
    })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onMeshBack).toHaveBeenCalledTimes(1)
  })

  it('does not call onMeshBack from Backspace at root', () => {
    const onMeshBack = jest.fn()
    renderShell({ onMeshBack })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onMeshBack).not.toHaveBeenCalled()
  })
})
