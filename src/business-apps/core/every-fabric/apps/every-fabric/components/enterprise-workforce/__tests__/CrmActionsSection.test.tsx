/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import React from 'react'

import { CrmActionsSection } from '../CrmActionsSection'
import type { WorkforceRunCrmActionEntry } from '../workforceTypes'

function buildAction(overrides: Partial<WorkforceRunCrmActionEntry> = {}): WorkforceRunCrmActionEntry {
  return {
    tool_ref: 'functions.search_crm_entity',
    action: 'search',
    entity_type: 'contact',
    record_ids: { contact_id: 'ct-1', account_id: 'ac-2' },
    succeeded: true,
    timestamp: '2026-06-01T10:00:00Z',
    seq: 5,
    ...overrides
  }
}

describe('CrmActionsSection', () => {
  it('renders nothing when there are no CRM actions', () => {
    const { container } = render(<CrmActionsSection actions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one row per CRM action with the action label and tool ref', () => {
    render(
      <CrmActionsSection
        actions={[
          buildAction({ action: 'search' }),
          buildAction({
            action: 'create',
            tool_ref: 'functions.create_crm_entity',
            record_ids: { id: 'ct-new', contact_id: 'ct-new' },
            seq: 7,
            timestamp: '2026-06-01T10:00:01Z'
          })
        ]}
      />
    )

    const rows = screen.getAllByTestId('crm-action-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Search')
    expect(rows[0]).toHaveTextContent('functions.search_crm_entity')
    expect(rows[1]).toHaveTextContent('Create')
    expect(rows[1]).toHaveTextContent('functions.create_crm_entity')
  })

  it('renders deep-links for account and contact ids when present', () => {
    render(
      <CrmActionsSection
        actions={[
          buildAction({
            record_ids: { contact_id: 'ct-1', account_id: 'ac-2' },
            record_labels: { 'ct-1': 'Maria Schmidt', 'ac-2': 'Acme GmbH' }
          })
        ]}
      />
    )
    const accountLink = screen.getByTestId('crm-action-link-account')
    expect(accountLink.tagName).toBe('A')
    expect(accountLink).toHaveAttribute('href')
    expect(accountLink.getAttribute('href')).toMatch(/accountId=ac-2/)
    expect(accountLink).toHaveTextContent('Acme GmbH')

    const contactLink = screen.getByTestId('crm-action-link-contact')
    expect(contactLink.getAttribute('href')).toMatch(/contactId=ct-1/)
    expect(contactLink).toHaveTextContent('Maria Schmidt')
  })

  it('renders note and task ids as deep-links with human labels', () => {
    render(
      <CrmActionsSection
        actions={[
          buildAction({
            action: 'note',
            tool_ref: 'functions.add_crm_note',
            record_ids: { note_id: 'nt-9', contact_id: 'ct-1' },
            record_labels: { 'nt-9': 'Claim intake note', 'ct-1': 'Jonas Weber' }
          })
        ]}
      />
    )
    expect(screen.getByTestId('crm-action-link-contact')).toHaveTextContent('Jonas Weber')
    const noteLink = screen.getByTestId('crm-action-link-note')
    expect(noteLink.tagName).toBe('A')
    expect(noteLink.getAttribute('href')).toMatch(/noteId=nt-9/)
    expect(noteLink).toHaveTextContent('Claim intake note')
  })

  it('marks failed CRM actions visibly', () => {
    render(
      <CrmActionsSection
        actions={[
          buildAction({
            succeeded: false,
            record_ids: {}
          })
        ]}
      />
    )
    const row = screen.getByTestId('crm-action-row')
    expect(row).toBeInTheDocument()
    expect(screen.queryByTestId('crm-action-link-account')).toBeNull()
    expect(screen.queryByTestId('crm-action-link-contact')).toBeNull()
  })

  it('falls back to a plain id badge when the deep-link helper has no mapping', () => {
    render(
      <CrmActionsSection
        actions={[
          buildAction({
            entity_type: 'mystery',
            record_ids: {}
          })
        ]}
      />
    )
    expect(screen.getByTestId('crm-action-row')).toBeInTheDocument()
  })
})
