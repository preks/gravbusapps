/**
 * Tests for ReferencesRail: filtering of unrenderable protocols, grouping by
 * category, and propagation of href + accessToken into EntityLink chips.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const mockEntityLink = jest.fn()

jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  default: (props: any) => {
    mockEntityLink(props)
    return (
      <a data-testid="entity-link-chip" data-href={props.href} data-token={props.accessToken}>
        {props.children}
      </a>
    )
  },
  // Only these two protocols are "renderable" for the purpose of this test.
  SUPPORTED_PROTOCOLS: ['employee', 'account']
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
  beforeEach(() => mockEntityLink.mockClear())

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
    const chips = screen.getAllByTestId('entity-link-chip')
    expect(chips).toHaveLength(2)
    expect(chips.map(c => c.getAttribute('data-href'))).toEqual(['employee://emp-1', 'employee://emp-2'])
  })

  it('passes href and accessToken into each chip', () => {
    render(
      <ReferencesRail
        references={[ref({}), ref({ id: 'emp-2', href: 'employee://emp-2', label: 'Bob Stone' })]}
        accessToken="secret-token"
      />
    )
    const call = mockEntityLink.mock.calls.at(0)?.[0]
    expect(call?.href).toBe('employee://emp-1')
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
})
