/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'

import { FlowDetailPanel } from '../FlowDetailPanel'

// Without an access token the hook does not poll, so the panel renders from its
// initial (agent-reported) state — perfect for asserting the static chrome.
describe('FlowDetailPanel', () => {
  it('renders an empty message when no workflow id is provided', () => {
    render(<FlowDetailPanel workflowName="Workflow" />)
    expect(screen.getByTestId('flow-detail-empty')).toHaveTextContent('flow-detail-empty')
  })

  it('renders the flow name, an in-progress status, and the template chip', () => {
    render(<FlowDetailPanel workflowId="wf-1" templateId="flow_abc" workflowName="Insurance Claim Intake" />)

    expect(screen.getByTestId('flow-detail-link')).toHaveTextContent('Insurance Claim Intake')
    expect(screen.getByTestId('flow-detail-link')).toHaveAttribute(
      'href',
      '/platform/apps/flow/apps/detail?flowId=wf-1'
    )
    const status = screen.getByTestId('flow-detail-status')
    expect(status).toHaveAttribute('data-status-code', 'RUNNING')
    expect(status).toHaveTextContent('In progress')
    expect(screen.getByText(/template_id: flow_abc/)).toBeInTheDocument()
  })

  it('shows a failed status when the trigger did not succeed', () => {
    render(<FlowDetailPanel workflowId="wf-1" workflowName="Workflow" succeeded={false} />)
    const status = screen.getByTestId('flow-detail-status')
    expect(status).toHaveAttribute('data-status-code', 'FAILED')
    expect(status).toHaveTextContent('Failed')
  })

  it('shows a no-steps placeholder when the overview is unavailable', () => {
    render(<FlowDetailPanel workflowId="wf-1" workflowName="Workflow" />)
    expect(screen.getByTestId('flow-detail-steps-empty')).toHaveTextContent('flow-steps-empty')
  })
})
