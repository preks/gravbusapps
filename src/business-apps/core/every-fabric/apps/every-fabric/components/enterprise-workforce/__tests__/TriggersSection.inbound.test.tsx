/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { TriggersSection } from '../sections/TriggersSection'
import type { WorkforceTrigger } from '../workforceTypes'

function buildTrigger(overrides: Partial<WorkforceTrigger> = {}): WorkforceTrigger {
  return {
    trigger_id: 'tr-1',
    agent_id: 'a-1',
    workspace_id: 'ws-1',
    type: 'webhook',
    name: 'External tickets',
    enabled: true,
    config: {},
    created_at: '2026-05-27T12:00:00Z',
    updated_at: '2026-05-27T12:00:00Z',
    webhook_url: null,
    last_fired_at: null,
    ...overrides
  }
}

const noopAsync = async () => {}

beforeEach(() => {
  // jsdom defaults window.location.origin to http://localhost
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, origin: 'https://workforce.test' }
  })
})

describe('TriggersSection inbound details', () => {
  it('renders the absolute webhook URL when the backend ships a path', () => {
    const trigger = buildTrigger({
      webhook_url: '/prompt-manager/api/v1/workforce/webhooks/tr-1'
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.getByTestId(`workforce-trigger-webhook-url-${trigger.trigger_id}`)).toHaveTextContent(
      'https://workforce.test/prompt-manager/api/v1/workforce/webhooks/tr-1'
    )
  })

  it('renders the absolute URL unchanged when the backend already returned it absolute', () => {
    const trigger = buildTrigger({
      webhook_url: 'https://other.example.com/wh/tr-1'
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.getByTestId(`workforce-trigger-webhook-url-${trigger.trigger_id}`)).toHaveTextContent(
      'https://other.example.com/wh/tr-1'
    )
  })

  it('falls back to a hint when webhook_url is missing', () => {
    const trigger = buildTrigger({ webhook_url: null })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.getByTestId(`workforce-trigger-webhook-url-missing-${trigger.trigger_id}`)).toBeInTheDocument()
  })

  it('mentions HMAC signature when a secret is configured', () => {
    const trigger = buildTrigger({
      webhook_url: '/prompt-manager/api/v1/workforce/webhooks/tr-1',
      config: { secret: 'rotated-secret' }
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.getByText(/X-Workforce-Signature/i)).toBeInTheDocument()
  })

  it('copies the webhook URL to the clipboard when the copy button is clicked', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const trigger = buildTrigger({
      webhook_url: '/prompt-manager/api/v1/workforce/webhooks/tr-1'
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )

    fireEvent.click(screen.getByTestId(`workforce-trigger-webhook-copy-${trigger.trigger_id}`))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://workforce.test/prompt-manager/api/v1/workforce/webhooks/tr-1')
    )
  })

  it('renders the mailbox for inbound email triggers and copies it', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const trigger = buildTrigger({
      trigger_id: 'tr-mb',
      type: 'inbound_email',
      config: { mailbox: 'support@acme.com' },
      webhook_url: null
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.getByTestId(`workforce-trigger-mailbox-${trigger.trigger_id}`)).toHaveTextContent('support@acme.com')

    fireEvent.click(screen.getByTestId(`workforce-trigger-mailbox-copy-${trigger.trigger_id}`))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('support@acme.com'))
  })

  it('does not render inbound details for schedule triggers', () => {
    const trigger = buildTrigger({
      trigger_id: 'tr-sched',
      type: 'schedule',
      config: { interval_minutes: 60 },
      webhook_url: null
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.queryByTestId(`workforce-trigger-inbound-${trigger.trigger_id}`)).toBeNull()
  })

  it('shows the last_fired_at hint when present', () => {
    const trigger = buildTrigger({
      trigger_id: 'tr-fired',
      type: 'webhook',
      webhook_url: '/prompt-manager/api/v1/workforce/webhooks/tr-fired',
      last_fired_at: '2026-05-27T12:00:00Z'
    })
    render(
      <TriggersSection
        triggers={[trigger]}
        pendingTriggerId={null}
        onCreate={noopAsync}
        onUpdate={noopAsync}
        onDelete={noopAsync}
      />
    )
    expect(screen.getByTestId(`workforce-trigger-last-fired-${trigger.trigger_id}`)).toBeInTheDocument()
  })
})
