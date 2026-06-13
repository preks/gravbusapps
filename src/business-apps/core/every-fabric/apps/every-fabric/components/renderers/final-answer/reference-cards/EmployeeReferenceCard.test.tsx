/**
 * EmployeeReferenceCard: extracts name/role/org context/manager from
 * useEmployeeDetails, uses reference.data while loading, and surfaces the
 * intent context label.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

const mockUseEmployeeDetails = jest.fn()

jest.mock('@/business-apps/platform/apps/every-ai/queries/employeeQueries', () => ({
  __esModule: true,
  useEmployeeDetails: (...args: any[]) => mockUseEmployeeDetails(...args)
}))
jest.mock('@/business-apps/platform/apps/every-ai/components/links/EntityLink', () => ({
  __esModule: true,
  getEntityUrl: () => '/platform/employee-record?employeeId=emp-1'
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
      <div data-testid="footer">{props.footer}</div>
    </div>
  )
}))

import { EmployeeReferenceCard } from './EmployeeReferenceCard'
import type { EntityReference } from '../../../../types/enterpriseAgent'

const ref = (over: Partial<EntityReference> = {}): EntityReference => ({
  type: 'employee',
  id: 'emp-1',
  href: 'employee://emp-1',
  label: 'Anna Müller',
  category: 'person',
  ...over
})

describe('EmployeeReferenceCard', () => {
  beforeEach(() => mockUseEmployeeDetails.mockReset())

  it('renders fetched name, job title, org-chart fields, and manager person-row', () => {
    mockUseEmployeeDetails.mockReturnValue({
      state: {
        state: 'success',
        employee: {
          firstName: 'Anna',
          lastName: 'Müller',
          jobPositionName: 'Engineer',
          pictureThumbnail: null,
          department: 'Platform',
          location: 'Hamburg',
          company: 'NEW WORK SE',
          hireDate: '2021-04-01T00:00:00Z'
        },
        manager: { id: 'mgr-1', firstName: 'Bob', lastName: 'Stone', jobPositionName: 'Lead' }
      }
    })

    render(<EmployeeReferenceCard reference={ref()} accessToken="tok" />)

    expect(screen.getByTestId('title')).toHaveTextContent('Anna Müller')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Engineer')
    const fields = screen.getByTestId('fields')
    expect(fields).toHaveTextContent('Department=Platform')
    expect(fields).toHaveTextContent('Location=Hamburg')
    expect(fields).toHaveTextContent('Company=NEW WORK SE')
    expect(fields).toHaveTextContent('Joined=2021')
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveTextContent('Reports to')
    expect(footer).toHaveTextContent('Bob Stone')
    expect(footer).toHaveTextContent('Lead')
  })

  it('prepends the intent context label to the subtitle', () => {
    mockUseEmployeeDetails.mockReturnValue({
      state: {
        state: 'success',
        employee: { firstName: 'Anna', lastName: 'Müller', jobPositionName: 'Engineer' },
        manager: null
      }
    })

    render(<EmployeeReferenceCard reference={ref({ intent: 'manager' })} accessToken="tok" />)
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Manager · Engineer')
  })

  it('shows a loading card while the fetch is in flight', () => {
    mockUseEmployeeDetails.mockReturnValue({ state: { state: 'loading' } })
    render(<EmployeeReferenceCard reference={ref()} accessToken="tok" />)
    expect(screen.getByTestId('entity-card')).toHaveAttribute('data-loading', 'true')
  })

  it('falls back to reference.data when the fetch errors', () => {
    mockUseEmployeeDetails.mockReturnValue({ state: { state: 'error', message: 'boom' } })
    render(
      <EmployeeReferenceCard
        reference={ref({ data: { role: 'Designer', team: 'Brand', work_email: 'a@x.com' } })}
        accessToken="tok"
      />
    )
    expect(screen.getByTestId('title')).toHaveTextContent('Anna Müller')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Designer')
    expect(screen.getByTestId('fields')).toHaveTextContent('Department=Brand')
  })

  it('shows the work email as a fallback field when no org-chart data exists', () => {
    mockUseEmployeeDetails.mockReturnValue({ state: { state: 'error', message: 'boom' } })
    render(<EmployeeReferenceCard reference={ref({ data: { work_email: 'a@x.com' } })} accessToken="tok" />)
    expect(screen.getByTestId('fields')).toHaveTextContent('Email=a@x.com')
  })
})
