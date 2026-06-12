/**
 * Tests for ReferencesRail: filtering of unrenderable protocols, grouping by
 * category, emphasis-first ordering, the MAX_VISIBLE_CARDS cap, and propagation
 * of each reference + accessToken into the EntityReferenceCard dispatcher.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  // Chip fallback used for large groups.
  default: (props: any) => (
    <a data-testid="entity-link-chip" data-href={props.href} data-token={props.accessToken}>
      {props.children}
    </a>
  ),
  // Only these two protocols are "renderable" for the purpose of this test.
  SUPPORTED_PROTOCOLS: ['employee', 'account']
}))

const mockCard = jest.fn()

jest.mock('./reference-cards', () => ({
  __esModule: true,
  EntityReferenceCard: (props: any) => {
    mockCard(props)
    return (
      <div
        data-testid="reference-card"
        data-type={props.reference.type}
        data-id={props.reference.id}
        data-token={props.accessToken}
      >
        {props.reference.label}
      </div>
    )
  }
}))

import { ReferencesRail } from './ReferencesRail'
import type { EntityReference } from '../../../types/enterpriseAgent'

const ref = (over: Partial<EntityReference>): EntityReference => ({
  type: 'employee',
  id: 'emp-1',
  href: 'employee://emp-1',
  label: 'Anna Müller',
  category: 'person',
  ...over
})

describe('ReferencesRail', () => {
  beforeEach(() => mockCard.mockClear())

  it('renders nothing when there are no references', () => {
    const { container } = render(<ReferencesRail references={[]} accessToken="tok" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for a single reference (already shown inline)', () => {
    const { container } = render(<ReferencesRail references={[ref({})]} accessToken="tok" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only one reference survives protocol filtering', () => {
    const { container } = render(
      <ReferencesRail
        references={[ref({}), ref({ type: 'mystery', href: 'mystery://x', id: 'x', category: 'other' })]}
        accessToken="tok"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('filters out references whose protocol is not frontend-renderable', () => {
    render(
      <ReferencesRail
        references={[
          ref({}),
          ref({ id: 'emp-2', href: 'employee://emp-2', label: 'Bob Stone' }),
          ref({ type: 'mystery', href: 'mystery://x', id: 'x', category: 'other' })
        ]}
        accessToken="tok"
      />
    )
    const cards = screen.getAllByTestId('reference-card')
    expect(cards).toHaveLength(2)
    expect(cards.map(c => c.getAttribute('data-id'))).toEqual(['emp-1', 'emp-2'])
  })

  it('passes each reference and accessToken into the card dispatcher', () => {
    render(
      <ReferencesRail
        references={[ref({}), ref({ id: 'emp-2', href: 'employee://emp-2', label: 'Bob Stone' })]}
        accessToken="secret-token"
      />
    )
    const call = mockCard.mock.calls.at(0)?.[0]
    expect(call?.reference.href).toBe('employee://emp-1')
    expect(call?.accessToken).toBe('secret-token')
  })

  it('groups references by category with display labels', () => {
    render(
      <ReferencesRail
        references={[
          ref({ category: 'person', label: 'Anna', href: 'employee://emp-1', id: 'emp-1' }),
          ref({ type: 'account', category: 'crm', label: 'Acme', href: 'account://acc-9', id: 'acc-9' })
        ]}
        accessToken="tok"
      />
    )
    expect(screen.getByText('People')).toBeInTheDocument()
    expect(screen.getByText('CRM')).toBeInTheDocument()
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
  })

  it('orders emphasized (answer_focus) references first', () => {
    render(
      <ReferencesRail
        references={[
          ref({ id: 'emp-1', href: 'employee://emp-1', label: 'Subject' }),
          ref({ id: 'emp-2', href: 'employee://emp-2', label: 'Manager', emphasis: 'answer_focus' })
        ]}
        accessToken="tok"
      />
    )
    const cards = screen.getAllByTestId('reference-card')
    expect(cards.map(c => c.getAttribute('data-id'))).toEqual(['emp-2', 'emp-1'])
  })

  it('renders a small group as cards', () => {
    const references = Array.from({ length: 5 }, (_, i) =>
      ref({ id: `emp-${i}`, href: `employee://emp-${i}`, label: `Person ${i}` })
    )
    render(<ReferencesRail references={references} accessToken="tok" />)

    expect(screen.getAllByTestId('reference-card')).toHaveLength(5)
    expect(screen.queryByTestId('entity-link-chip')).toBeNull()
  })

  it('degrades a large group (over the card limit) to chips, no card fetches', () => {
    const references = Array.from({ length: 13 }, (_, i) =>
      ref({ id: `emp-${i}`, href: `employee://emp-${i}`, label: `Person ${i}` })
    )
    render(<ReferencesRail references={references} accessToken="tok" />)

    expect(screen.getAllByTestId('entity-link-chip')).toHaveLength(13)
    expect(screen.queryByTestId('reference-card')).toBeNull()
    expect(mockCard).not.toHaveBeenCalled()
  })

  it('mixes layouts: small group as cards, large group as chips', () => {
    const people = Array.from({ length: 13 }, (_, i) =>
      ref({ id: `emp-${i}`, href: `employee://emp-${i}`, label: `Person ${i}`, category: 'person' })
    )
    const accounts = Array.from({ length: 2 }, (_, i) =>
      ref({ type: 'account', id: `acc-${i}`, href: `account://acc-${i}`, label: `Acme ${i}`, category: 'crm' })
    )
    render(<ReferencesRail references={[...people, ...accounts]} accessToken="tok" />)

    expect(screen.getAllByTestId('entity-link-chip')).toHaveLength(13)
    expect(screen.getAllByTestId('reference-card')).toHaveLength(2)
  })
})
