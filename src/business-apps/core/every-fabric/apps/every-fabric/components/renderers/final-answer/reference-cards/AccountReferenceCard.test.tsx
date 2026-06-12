/**
 * AccountReferenceCard: extracts name/industry/priority/owner from the
 * catalog-ref shaped useCustomerAccount result.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const mockUseCustomerAccount = jest.fn()

jest.mock('@/common/data/customer/hooks/useCustomerAccount', () => ({
  __esModule: true,
  useCustomerAccount: (...args: any[]) => mockUseCustomerAccount(...args)
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  getEntityUrl: () => '/platform/crm/account-record?accountId=acc-1'
}))
jest.mock('@/common/utils/navigationUtils', () => ({ __esModule: true, navigateTo: jest.fn() }))

jest.mock('@/business-apps/platform/apps/every-ai/components/entities/EntityCard', () => ({
  __esModule: true,
  EntityCard: (props: any) => (
    <div data-testid="entity-card" data-loading={String(!!props.isLoading)}>
      <span data-testid="title">{props.title}</span>
      <span data-testid="subtitle">{props.subtitle}</span>
      <span data-testid="status">{props.status}</span>
      <ul data-testid="fields">
        {(props.fields ?? []).map((f: any, i: number) => (
          <li key={i}>{`${f.label}=${f.value}`}</li>
        ))}
      </ul>
    </div>
  )
}))

import { AccountReferenceCard } from './AccountReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref: EntityReference = {
  type: 'account',
  id: 'acc-1',
  href: 'account://acc-1',
  label: 'Acme',
  category: 'crm'
}

describe('AccountReferenceCard', () => {
  beforeEach(() => mockUseCustomerAccount.mockReset())

  it('renders name, industry, priority badge and owner', () => {
    mockUseCustomerAccount.mockReturnValue({
      loading: false,
      account: {
        name: 'Acme Corp',
        industryClass: { value: 'Manufacturing' },
        accountPriority: { value: 'High' },
        ownerEmployee: { firstName: 'Dana', lastName: 'Lee' },
        website: 'acme.com'
      }
    })

    render(<AccountReferenceCard reference={ref} accessToken="tok" />)

    expect(screen.getByTestId('title')).toHaveTextContent('Acme Corp')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Manufacturing')
    expect(screen.getByTestId('status')).toHaveTextContent('High')
    expect(screen.getByTestId('fields')).toHaveTextContent('Owner=Dana Lee')
    expect(screen.getByTestId('fields')).toHaveTextContent('Website=acme.com')
  })

  it('falls back to the reference label before data loads', () => {
    mockUseCustomerAccount.mockReturnValue({ loading: true, account: null })
    render(<AccountReferenceCard reference={ref} accessToken="tok" />)
    expect(screen.getByTestId('entity-card')).toHaveAttribute('data-loading', 'true')
    expect(screen.getByTestId('title')).toHaveTextContent('Acme')
  })
})
