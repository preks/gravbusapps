/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { RunEntityLinks } from '../RunEntityLinks'
import type { WorkforceRunDomainAction } from '../workforceTypes'

function buildFlowAction(overrides: Partial<WorkforceRunDomainAction> = {}): WorkforceRunDomainAction {
  return {
    domain: 'flow',
    tool_ref: 'newwork_trigger_flow',
    action: 'flow',
    entity_type: 'workflow',
    record_ids: { workflow_id: 'wf-123', template_id: 'flow_abc' },
    record_labels: { 'wf-123': 'Insurance Claim Intake' },
    succeeded: true,
    timestamp: '2026-06-01T10:00:00Z',
    seq: 4,
    ...overrides
  }
}

describe('RunEntityLinks — flow actions', () => {
  it('renders a flow row with the Flow label and tool ref', () => {
    render(<RunEntityLinks actions={[buildFlowAction()]} />)

    const row = screen.getByTestId('entity-action-row')
    expect(row).toHaveTextContent('entity-action-flow-label')
    expect(row).toHaveTextContent('newwork_trigger_flow')
  })

  it('deep-links the workflow id to the Flow Detail page using the workflow name', () => {
    render(<RunEntityLinks actions={[buildFlowAction()]} />)

    const link = screen.getByTestId('entity-link-workflow')
    expect(link).toHaveTextContent('Insurance Claim Intake')
    expect(link).toHaveAttribute('href', '/platform/apps/flow/apps/detail?flowId=wf-123')
  })

  it('falls back to a generic Workflow label when no name is provided', () => {
    render(<RunEntityLinks actions={[buildFlowAction({ record_labels: {} })]} />)

    expect(screen.getByTestId('entity-link-workflow')).toHaveTextContent('entity-workflow-fallback')
  })

  it('shows an in-progress status badge for a succeeded trigger (no live poll without a token)', () => {
    render(<RunEntityLinks actions={[buildFlowAction()]} />)

    const badge = screen.getByTestId('flow-status-badge')
    expect(badge).toHaveAttribute('data-status-code', 'RUNNING')
    expect(badge).toHaveTextContent('In progress')
  })

  it('shows a failed status badge when the trigger did not succeed', () => {
    render(<RunEntityLinks actions={[buildFlowAction({ succeeded: false })]} />)

    const badge = screen.getByTestId('flow-status-badge')
    expect(badge).toHaveAttribute('data-status-code', 'FAILED')
    expect(badge).toHaveTextContent('Failed')
  })

  it('renders the template id chip when present', () => {
    render(<RunEntityLinks actions={[buildFlowAction()]} />)
    expect(screen.getByText('flow-template-id-chip')).toBeInTheDocument()
  })

  it('opens the flow in-app via onOpenFlow without showing a separate external link', () => {
    const onOpenFlow = jest.fn()
    render(<RunEntityLinks actions={[buildFlowAction()]} onOpenFlow={onOpenFlow} />)

    const openButton = screen.getByTestId('entity-open-workflow')
    expect(openButton).toHaveTextContent('Insurance Claim Intake')
    fireEvent.click(openButton)
    expect(onOpenFlow).toHaveBeenCalledWith('wf-123')

    // The flow name is the only entry point; no secondary deep-link icon.
    expect(screen.queryByTestId('entity-link-workflow')).not.toBeInTheDocument()
  })

  it('shows the contact name on the CRM record chip instead of the raw uuid', () => {
    const crmAction: WorkforceRunDomainAction = {
      domain: 'crm',
      tool_ref: 'functions.search_crm_entity',
      action: 'search',
      entity_type: 'contact',
      record_ids: { contact_id: 'f3236e6c-d72c-4730-b60f-74990a6b413e' },
      record_labels: { 'f3236e6c-d72c-4730-b60f-74990a6b413e': 'Maria Schmidt' },
      succeeded: true,
      timestamp: '2026-06-01T10:00:05Z',
      seq: 8
    }

    render(<RunEntityLinks actions={[crmAction]} />)

    const link = screen.getByTestId('entity-link-contact')
    expect(link).toHaveTextContent('entity-record-id-label')
    expect(link).not.toHaveTextContent('f3236e6c-d72c-4730-b60f-74990a6b413e')
    expect(link).toHaveAttribute('href', expect.stringContaining('f3236e6c-d72c-4730-b60f-74990a6b413e'))
  })

  it('falls back to the record id when no contact name label is available', () => {
    const crmAction: WorkforceRunDomainAction = {
      domain: 'crm',
      tool_ref: 'functions.search_crm_entity',
      action: 'search',
      entity_type: 'contact',
      record_ids: { contact_id: 'f3236e6c-d72c-4730-b60f-74990a6b413e' },
      record_labels: {},
      succeeded: true,
      timestamp: '2026-06-01T10:00:05Z',
      seq: 8
    }

    render(<RunEntityLinks actions={[crmAction]} />)

    expect(screen.getByTestId('entity-link-contact')).toHaveTextContent('entity-record-id-label')
  })

  it('reuses a contact name resolved by one action for another action with the same id', () => {
    const contactId = 'f3236e6c-d72c-4730-b60f-74990a6b413e'
    const searchAction: WorkforceRunDomainAction = {
      domain: 'crm',
      tool_ref: 'functions.search_crm_entity',
      action: 'search',
      entity_type: 'contact',
      record_ids: { contact_id: contactId },
      record_labels: { [contactId]: 'Jonas Weber' },
      succeeded: true,
      timestamp: '2026-06-01T10:00:05Z',
      seq: 8
    }
    // The note tool returns only ids, so its own labels are empty.
    const noteAction: WorkforceRunDomainAction = {
      domain: 'crm',
      tool_ref: 'functions.add_crm_note',
      action: 'note',
      entity_type: 'contact',
      record_ids: { contact_id: contactId, note_id: 'note-1', entity_id: contactId },
      record_labels: {},
      succeeded: true,
      timestamp: '2026-06-01T10:00:09Z',
      seq: 9
    }

    render(<RunEntityLinks actions={[searchAction, noteAction]} />)

    const contactLinks = screen.getAllByTestId('entity-link-contact')
    expect(contactLinks).toHaveLength(2)
    contactLinks.forEach(link => expect(link).toHaveTextContent('entity-record-id-label'))
  })

  it('renders flow and CRM rows together in the same section', () => {
    const crmAction: WorkforceRunDomainAction = {
      domain: 'crm',
      tool_ref: 'functions.create_crm_entity',
      action: 'create',
      entity_type: 'contact',
      record_ids: { contact_id: 'ct-1' },
      record_labels: { 'ct-1': 'Maria Schmidt' },
      succeeded: true,
      timestamp: '2026-06-01T10:00:05Z',
      seq: 8
    }

    render(<RunEntityLinks actions={[buildFlowAction(), crmAction]} />)

    const rows = screen.getAllByTestId('entity-action-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('entity-action-flow-label')
    expect(rows[1]).toHaveTextContent('entity-action-create-label')
  })
})
