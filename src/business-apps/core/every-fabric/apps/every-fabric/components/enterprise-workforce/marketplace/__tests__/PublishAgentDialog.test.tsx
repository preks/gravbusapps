/** @jest-environment jsdom */
import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PublishAgentDialog } from '../PublishAgentDialog'

describe('PublishAgentDialog', () => {
  it('submits publish options with target tenant credentials', async () => {
    const onPublish = jest.fn().mockResolvedValue({
      package_id: 'insurance-claims-specialist',
      name: 'Insurance Claims Specialist',
      skill_count: 3,
      tool_count: 6
    })

    render(
      <PublishAgentDialog
        open
        agentId="agent-123"
        agentName="Insurance Claims Specialist"
        isBusy={false}
        onClose={jest.fn()}
        onPublish={onPublish}
      />
    )

    fireEvent.change(screen.getByTestId('publish-agent-target-url'), {
      target: { value: 'https://customer.example.com/prompt-manager' }
    })
    fireEvent.change(screen.getByTestId('publish-agent-target-token'), {
      target: { value: 'target-token' }
    })
    fireEvent.change(screen.getByTestId('publish-agent-category'), { target: { value: 'insurance' } })
    fireEvent.click(screen.getByTestId('publish-agent-submit'))

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith({
        targetBaseUrl: 'https://customer.example.com/prompt-manager',
        targetToken: 'target-token',
        packageId: undefined,
        category: 'insurance',
        publisher: 'newwork'
      })
    })

    expect(await screen.findByTestId('publish-agent-done')).toBeInTheDocument()
  })
})
