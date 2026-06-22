/** @jest-environment jsdom */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { CreateAgentScreen } from '../CreateAgentScreen'

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars?: Record<string, unknown>) => {
        if (key === 'agents-create-steps-ready' && vars) {
          return `${vars.completed} of ${vars.total} steps ready`
        }
        if (key === 'agents-create-creating-in' && vars) {
          return `Creating in ${vars.workspace}.`
        }
        return key
      }
    })
  }
})

jest.mock('@/common/data/content/hooks/useContentEntries', () => ({
  useContentEntries: () => ({ entries: [], isLoading: false, error: null })
}))

const client = {
  getWorkspaces: jest.fn(),
  getAiModels: jest.fn(),
  createPrompt: jest.fn(),
  addKnowledgeSourceContent: jest.fn(),
  deployWorkforce: jest.fn(),
  generateAgentAvatar: jest.fn()
}

describe('CreateAgentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    client.getWorkspaces.mockResolvedValue({
      data: [{ _id: 'workspace-1', name: 'Default workspace', default: true }]
    })
    client.getAiModels.mockResolvedValue({
      data: [{ _id: 'model-1' }]
    })
  })

  it('renders a guided create path and reveals Worker setup when selected', async () => {
    const user = userEvent.setup()
    render(<CreateAgentScreen client={client as never} accessToken="tok" onBack={() => {}} onCreated={() => {}} />)

    expect(await screen.findByText(/Creating in/i)).toBeInTheDocument()
    expect(screen.getByTestId('create-agent-setup-progress')).toHaveTextContent('agents-create-setup-title')
    expect(screen.getByTestId('create-agent-setup-progress')).toHaveTextContent('0 of 5 steps ready')
    expect(screen.getByTestId('create-agent-step-1')).toHaveTextContent('agents-create-step-profile')
    expect(screen.getByTestId('create-agent-step-2')).toHaveTextContent('agents-create-step-capabilities')
    expect(screen.getByTestId('create-agent-step-3')).toHaveTextContent('agents-create-step-deployment')
    expect(screen.getByTestId('create-agent-step-4')).toHaveTextContent('agents-create-step-passport')
    expect(screen.getByTestId('create-agent-step-5')).toHaveTextContent('agents-create-step-activation')
    expect(screen.getByTestId('create-agent-step-panel-1')).toHaveTextContent('agents-create-step-profile')
    expect(screen.queryByTestId('create-agent-workforce-role')).toBeNull()

    await act(async () => {
      await user.click(screen.getByTestId('create-agent-step-3'))
    })
    expect(await screen.findByTestId('create-agent-workforce-checkbox')).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByTestId('create-agent-workforce-checkbox'))
      await user.click(screen.getByTestId('create-agent-step-4'))
    })

    expect(screen.getByTestId('create-agent-workforce-role')).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByTestId('create-agent-step-5'))
    })

    expect(screen.getByTestId('create-agent-workforce-autonomy')).toBeInTheDocument()
  })

  it('uses the combined submit label when Worker deployment is selected', async () => {
    const user = userEvent.setup()
    render(<CreateAgentScreen client={client as never} accessToken="tok" onBack={() => {}} onCreated={() => {}} />)

    await act(async () => {
      await user.click(await screen.findByTestId('create-agent-step-3'))
    })
    await act(async () => {
      await user.click(await screen.findByTestId('create-agent-workforce-checkbox'))
    })

    expect(screen.getByTestId('create-agent-submit')).toHaveTextContent('agents-create-submit-worker')
  })
})
