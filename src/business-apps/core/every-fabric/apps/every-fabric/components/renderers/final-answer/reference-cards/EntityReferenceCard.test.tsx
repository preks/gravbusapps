/**
 * Dispatcher tests: the right specialized card is chosen per protocol (incl.
 * relation -> parent redirects), unknown types fall back to the generic card,
 * and emphasized references are wrapped in a highlight ring.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const stub = (testid: string) => (props: any) => <div data-testid={testid}>{props.reference.label}</div>

jest.mock('./EmployeeReferenceCard', () => ({ __esModule: true, EmployeeReferenceCard: stub('card-employee') }))
jest.mock('./AccountReferenceCard', () => ({ __esModule: true, AccountReferenceCard: stub('card-account') }))
jest.mock('./ContactReferenceCard', () => ({ __esModule: true, ContactReferenceCard: stub('card-contact') }))
jest.mock('./LeadReferenceCard', () => ({ __esModule: true, LeadReferenceCard: stub('card-lead') }))
jest.mock('./OpportunityReferenceCard', () => ({
  __esModule: true,
  OpportunityReferenceCard: stub('card-opportunity')
}))
jest.mock('./GenericReferenceCard', () => ({ __esModule: true, GenericReferenceCard: stub('card-generic') }))

import { EntityReferenceCard } from './EntityReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref = (over: Partial<EntityReference>): EntityReference => ({
  type: 'employee',
  id: 'id-1',
  href: 'employee://id-1',
  label: 'Label',
  category: 'person',
  ...over
})

describe('EntityReferenceCard dispatcher', () => {
  it.each([
    ['employee', 'card-employee'],
    ['account', 'card-account'],
    ['company', 'card-account'],
    ['contact', 'card-contact'],
    ['lead', 'card-lead'],
    ['opportunity', 'card-opportunity'],
    ['service_workflow', 'card-generic'],
    ['document', 'card-generic']
  ])('routes %s to %s', (type, testid) => {
    render(<EntityReferenceCard reference={ref({ type })} accessToken="tok" />)
    expect(screen.getByTestId(testid)).toBeInTheDocument()
  })

  it('applies PROTOCOL_REDIRECTS so relation types reuse the parent card', () => {
    render(<EntityReferenceCard reference={ref({ type: 'account_contact' })} accessToken="tok" />)
    expect(screen.getByTestId('card-contact')).toBeInTheDocument()
  })

  it('wraps an emphasized reference in a highlight ring', () => {
    const { container } = render(
      <EntityReferenceCard reference={ref({ emphasis: 'answer_focus' })} accessToken="tok" />
    )
    expect(container.querySelector('.gba\\:ring-1')).not.toBeNull()
  })

  it('does not wrap a non-emphasized reference', () => {
    const { container } = render(<EntityReferenceCard reference={ref({})} accessToken="tok" />)
    expect(container.querySelector('.gba\\:ring-1')).toBeNull()
  })
})
