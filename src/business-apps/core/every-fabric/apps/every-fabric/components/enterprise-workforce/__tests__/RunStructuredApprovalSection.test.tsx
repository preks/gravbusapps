/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { RunStructuredApprovalSection } from '../RunStructuredApprovalSection'
import type { WorkforceRun } from '../workforceTypes'

const replyToInterrupt = jest.fn().mockResolvedValue(undefined)

jest.mock('../../../hooks/useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => ({ replyToInterrupt })
}))

jest.mock('../../renderers/StructuredInputForm', () => ({
  StructuredInputForm: ({
    title,
    onSubmit
  }: {
    title: string
    onSubmit: (values: Record<string, unknown>, aiDelegated: string[]) => void
  }) => (
    <div data-testid="structured-input-form">
      <span>{title}</span>
      <button type="button" data-testid="mock-submit" onClick={() => onSubmit({ decision: 'approve' }, [])}>
        submit
      </button>
    </div>
  )
}))

jest.mock('../../renderers/ToolPermissionRequest', () => ({
  ToolPermissionRequest: ({ onSubmit }: { onSubmit: (payload: Record<string, unknown>) => void }) => (
    <div data-testid="tool-permission-request">
      <button type="button" data-testid="mock-permission-submit" onClick={() => onSubmit({ action: 'approve' })}>
        approve
      </button>
    </div>
  )
}))

function buildRun(pending: Record<string, unknown> | null): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-1',
    status: 'waiting_for_human',
    input: 'task',
    pending_structured_input: pending
  } as WorkforceRun
}

describe('RunStructuredApprovalSection', () => {
  beforeEach(() => {
    replyToInterrupt.mockClear()
  })

  it('renders nothing when there is no renderable structured form', () => {
    const { container } = render(
      <RunStructuredApprovalSection
        run={buildRun({ form_id: 'compose_email' })}
        accessToken="token"
        onRefreshAfterSubmit={() => Promise.resolve()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('submits a structured form and refreshes', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    render(
      <RunStructuredApprovalSection
        run={buildRun({
          form_id: 'approve-patch',
          title: 'Approve proposed patch',
          fields: [{ field_id: 'decision', label: 'Decision', field_type: 'select', required: true }]
        })}
        accessToken="token"
        onRefreshAfterSubmit={onRefresh}
      />
    )

    expect(screen.getByTestId('structured-input-form')).toHaveTextContent('Approve proposed patch')
    fireEvent.click(screen.getByTestId('mock-submit'))

    await waitFor(() => expect(replyToInterrupt).toHaveBeenCalledWith('sess-1', undefined, { decision: 'approve' }))
    await waitFor(() => expect(onRefresh).toHaveBeenCalled())
  })

  it('renders a tool permission request and submits its payload', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    render(
      <RunStructuredApprovalSection
        run={buildRun({ form_id: 'tool_permission_request', action_requests: [{ name: 'update_contract' }] })}
        accessToken="token"
        onRefreshAfterSubmit={onRefresh}
      />
    )

    fireEvent.click(screen.getByTestId('mock-permission-submit'))
    await waitFor(() => expect(replyToInterrupt).toHaveBeenCalledWith('sess-1', undefined, { action: 'approve' }))
  })
})
