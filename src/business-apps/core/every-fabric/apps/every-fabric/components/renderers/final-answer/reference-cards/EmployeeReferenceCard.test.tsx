/**
 * EmployeeReferenceCard: extracts name/role/team/manager from useEmployeeDetails,
 * uses reference.data while loading, and surfaces the intent context label.
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

  it('renders the fetched name, job title, and manager', () => {
    mockUseEmployeeDetails.mockReturnValue({
      state: {
        state: 'success',
        employee: {
          firstName: 'Anna',
          lastName: 'Müller',
          jobPositionName: 'Engineer',
          pictureThumbnail: null
        },
        manager: { firstName: 'Bob', lastName: 'Stone' }
      }
    })

    render(<EmployeeReferenceCard reference={ref({ data: { team: 'Platform' } })} accessToken="tok" />)

    expect(screen.getByTestId('title')).toHaveTextContent('Anna Müller')
    expect(screen.getByTestId('subtitle')).toHaveTextContent('Engineer')
    expect(screen.getByTestId('fields')).toHaveTextContent('Team=Platform')
    expect(screen.getByTestId('fields')).toHaveTextContent('Manager=Bob Stone')
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
    expect(screen.getByTestId('fields')).toHaveTextContent('Team=Brand')
    expect(screen.getByTestId('fields')).toHaveTextContent('Email=a@x.com')
  })
})
