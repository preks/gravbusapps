/**
 * ContactReferenceCard: name/title/account plus the email fix — email/phone are
 * read from `communicationChannels` (not the never-populated `contact.email`).
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const mockUseCustomerContact = jest.fn()

jest.mock('@/common/data/customer/hooks/useCustomerContact', () => ({
  __esModule: true,
  useCustomerContact: (...args: any[]) => mockUseCustomerContact(...args)
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  getEntityUrl: () => '/platform/crm/contact-record?contactId=ct-1'
}))
jest.mock('@/common/utils/navigationUtils', () => ({ __esModule: true, navigateTo: jest.fn() }))
jest.mock('@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials', () => ({
  __esModule: true,
  AvatarWithInitials: (props: any) => <span data-testid="avatar">{`${props.firstName} ${props.lastName}`}</span>
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/entities/EntityCard', () => ({
  __esModule: true,
  EntityCard: (props: any) => (
    <div data-testid="entity-card" data-loading={String(!!props.isLoading)}>
      <span data-testid="title">{props.title}</span>
      <span data-testid="subtitle">{props.subtitle}</span>
      <ul data-testid="fields">
        {(props.fields ?? []).map((f: any, i: number) => (
          <li key={i}>{`${f.label}=${f.value}`}</li>
        ))}
      </ul>
    </div>
  )
}))

import { ContactReferenceCard } from './ContactReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref: EntityReference = {
  type: 'contact',
  id: 'ct-1',
  href: 'contact://ct-1',
  label: 'Jane Roe',
  category: 'crm'
}

describe('ContactReferenceCard', () => {
  beforeEach(() => mockUseCustomerContact.mockReset())

  it('reads email and phone from communicationChannels, not contact.email', () => {
    mockUseCustomerContact.mockReturnValue({
      loading: false,
      contact: {
        firstName: 'Jane',
        lastName: 'Roe',
        jobPosition: 'CTO',
        // legacy top-level email must be ignored
        email: 'should-not-show@old.com',
        communicationChannels: [
          { value: 'jane@acme.com', communicationChannel: { value: 'Email' } },
          { value: '+49 170 1234567', communicationChannel: { value: 'Mobile' } }
        ],
        opportunityContacts: [{ opportunity: { name: 'Acme renewal' } }],
        account: { name: 'Acme Corp' }
      }
    })

    render(<ContactReferenceCard reference={ref} accessToken="tok" />)

    const fields = screen.getByTestId('fields')
    expect(screen.getByTestId('title')).toHaveTextContent('Jane Roe')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('CTO')
    expect(fields).toHaveTextContent('Account=Acme Corp')
    expect(fields).toHaveTextContent('Email=jane@acme.com')
    expect(fields).toHaveTextContent('Phone=+49 170 1234567')
    expect(fields).toHaveTextContent('Opportunity=Acme renewal')
    expect(fields).not.toHaveTextContent('should-not-show@old.com')
  })

  it('shows a loading card while the fetch is in flight', () => {
    mockUseCustomerContact.mockReturnValue({ loading: true, contact: null })
    render(<ContactReferenceCard reference={ref} accessToken="tok" />)
    expect(screen.getByTestId('entity-card')).toHaveAttribute('data-loading', 'true')
    expect(screen.getByTestId('title')).toHaveTextContent('Jane Roe')
  })
})
