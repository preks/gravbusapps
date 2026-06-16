/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { DeploymentsSection } from '../DeploymentsSection'

const mockDeployWorkforce = jest.fn()

const mockClient = {
  deployWorkforce: (...a: unknown[]) => mockDeployWorkforce(...a)
}

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => mockClient
}))

describe('DeploymentsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeployWorkforce.mockResolvedValue({})
  })

  it('shows the Add Workforce deployment action when not deployed', () => {
    render(<DeploymentsSection agentId="a-1" accessToken="tok" isWorkforceEnabled={false} />)
    expect(screen.getByTestId('add-workforce-deployment')).toBeInTheDocument()
    expect(screen.queryByTestId('deployment-workforce-status')).toBeNull()
  })

  it('renders the live status and no add button when already deployed', () => {
    render(
      <DeploymentsSection
        agentId="a-1"
        accessToken="tok"
        isWorkforceEnabled
        deployments={{
          enterprise: { enabled: true },
          workforce: { enabled: true, status: 'paused' }
        }}
      />
    )
    expect(screen.getByTestId('deployment-workforce-status')).toHaveTextContent('Paused')
    expect(screen.queryByTestId('add-workforce-deployment')).toBeNull()
  })

  it('requires a role before deploying', async () => {
    render(<DeploymentsSection agentId="a-1" accessToken="tok" isWorkforceEnabled={false} />)
    await userEvent.click(screen.getByTestId('add-workforce-deployment'))
    await userEvent.click(screen.getByTestId('wf-deploy-submit'))
    expect(mockDeployWorkforce).not.toHaveBeenCalled()
    expect(screen.getByText(/Role is required/i)).toBeInTheDocument()
  })

  it('deploys with the entered profile and notifies the parent', async () => {
    const onDeployed = jest.fn()
    render(
      <DeploymentsSection agentId="a-1" accessToken="tok" isWorkforceEnabled={false} onWorkforceDeployed={onDeployed} />
    )
    await userEvent.click(screen.getByTestId('add-workforce-deployment'))
    await userEvent.type(screen.getByTestId('wf-role-input'), 'Customer Care')
    await userEvent.type(screen.getByTestId('wf-department-input'), 'Support')
    await userEvent.click(screen.getByTestId('wf-deploy-submit'))

    // Wait for the post-deploy confirmation so the trailing setState calls
    // flush inside act before we assert.
    await waitFor(() => expect(screen.getByTestId('deployment-workforce-deployed')).toBeInTheDocument())
    expect(mockDeployWorkforce).toHaveBeenCalledTimes(1)
    expect(mockDeployWorkforce).toHaveBeenCalledWith('a-1', {
      role: 'Customer Care',
      department: 'Support',
      autonomy_level: 'approval_required',
      instructions: ''
    })
    expect(onDeployed).toHaveBeenCalled()
  })
})
