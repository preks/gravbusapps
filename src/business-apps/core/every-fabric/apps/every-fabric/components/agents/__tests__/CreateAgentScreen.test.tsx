/** @jest-environment jsdom */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { CreateAgentScreen } from '../CreateAgentScreen'

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
    expect(screen.getByTestId('create-agent-setup-progress')).toHaveTextContent('Create setup')
    expect(screen.getByTestId('create-agent-setup-progress')).toHaveTextContent('0 of 5 steps ready')
    expect(screen.getByTestId('create-agent-step-1')).toHaveTextContent('Profile')
    expect(screen.getByTestId('create-agent-step-2')).toHaveTextContent('Capabilities')
    expect(screen.getByTestId('create-agent-step-3')).toHaveTextContent('Deployment')
    expect(screen.getByTestId('create-agent-step-4')).toHaveTextContent('Passport')
    expect(screen.getByTestId('create-agent-step-5')).toHaveTextContent('Activation')
    expect(screen.getByTestId('create-agent-step-panel-1')).toHaveTextContent('Profile')
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

    expect(screen.getByTestId('create-agent-submit')).toHaveTextContent('Create agent or worker')
  })
})
