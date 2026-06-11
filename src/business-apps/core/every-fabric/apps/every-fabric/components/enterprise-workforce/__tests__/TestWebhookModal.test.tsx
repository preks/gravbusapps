/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { TestWebhookModal, type WebhookTestOption } from '../TestWebhookModal'

const OPTIONS: WebhookTestOption[] = [
  {
    agentId: 'agent-1',
    agentName: 'Claims Helper',
    triggerId: 'trig-1',
    triggerName: 'Claims webhook'
  },
  {
    agentId: 'agent-2',
    agentName: 'Support Bot',
    triggerId: 'trig-2',
    triggerName: 'Support webhook'
  }
]

describe('TestWebhookModal', () => {
  it('does not render when closed', () => {
    render(
      <TestWebhookModal
        open={false}
        options={OPTIONS}
        isDispatching={false}
        onClose={() => {}}
        onSubmit={async () => ({ session_id: 'sess-1', trigger_id: 'trig-1', accepted: true })}
      />
    )
    expect(screen.queryByTestId('workforce-test-webhook-modal')).toBeNull()
  })

  it('shows empty state when no webhook options exist', () => {
    render(
      <TestWebhookModal
        open
        options={[]}
        isDispatching={false}
        onClose={() => {}}
        onSubmit={async () => ({ session_id: null, trigger_id: 'trig-1', accepted: true })}
      />
    )
    expect(screen.getByTestId('workforce-test-webhook-empty')).toBeInTheDocument()
    expect(screen.getByTestId('workforce-test-webhook-submit')).toBeDisabled()
  })

  it('disables submit until message is entered', () => {
    render(
      <TestWebhookModal
        open
        options={OPTIONS}
        isDispatching={false}
        onClose={() => {}}
        onSubmit={async () => ({ session_id: 'sess-1', trigger_id: 'trig-1', accepted: true })}
      />
    )
    expect(screen.getByTestId('workforce-test-webhook-submit')).toBeDisabled()
    fireEvent.change(screen.getByTestId('workforce-test-webhook-message'), {
      target: { value: 'Customer needs help with claim #99' }
    })
    expect(screen.getByTestId('workforce-test-webhook-submit')).not.toBeDisabled()
  })

  it('preselects agent and trigger when opened from config', async () => {
    const onSubmit = jest.fn(async () => ({
      session_id: 'sess-1',
      trigger_id: 'trig-1',
      accepted: true
    }))
    render(
      <TestWebhookModal
        open
        options={OPTIONS}
        preselected={{ agentId: 'agent-1', triggerId: 'trig-1' }}
        isDispatching={false}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    )
    expect(screen.queryByTestId('workforce-test-webhook-agent')).toBeNull()
    fireEvent.change(screen.getByTestId('workforce-test-webhook-message'), {
      target: { value: 'Please triage this webhook event.' }
    })
    fireEvent.click(screen.getByTestId('workforce-test-webhook-submit'))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('trig-1', {
        subject: 'Test webhook',
        body: 'Please triage this webhook event.'
      })
    })
  })

  it('shows inline error from parent', () => {
    render(
      <TestWebhookModal
        open
        options={OPTIONS}
        isDispatching={false}
        errorMessage="server said no"
        onClose={() => {}}
        onSubmit={async () => ({ session_id: null, trigger_id: 'trig-1', accepted: false })}
      />
    )
    expect(screen.getByTestId('workforce-test-webhook-error')).toHaveTextContent('server said no')
  })
})
