import React from 'react'
import { render, screen } from '@testing-library/react'
import MultiEmployeeSelect from '../MultiEmployeeSelect'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'

void React

let mockEmployees: EmployeeLiteOption[] = []
let mockComboboxProps: any

jest.mock('@newwork/nw-design-system', () => ({
  Avatar: ({ children }: any) => <span>{children}</span>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: (props: any) => <img {...props} />,
  Combobox: (props: any) => {
    mockComboboxProps = props
    return (
      <div data-testid={props['data-testid']}>
        {props.options.map((option: any) => (
          <div key={option.value}>{option.label}</div>
        ))}
      </div>
    )
  }
}))

jest.mock('lucide-react', () => ({
  Building2: () => <span />,
  Briefcase: () => <span />
}))

jest.mock('@/common/data/employee/useEmployeeSearch', () => ({
  useEmployeeSearch: () => ({
    employees: mockEmployees,
    loading: false,
    hasMore: false,
    search: jest.fn(),
    loadMore: jest.fn()
  })
}))

describe('MultiEmployeeSelect', () => {
  beforeEach(() => {
    mockEmployees = []
    mockComboboxProps = undefined
  })

  it('uses a neutral fallback for unresolved selected employees', () => {
    render(<MultiEmployeeSelect value={['employee-1']} />)

    expect(screen.getByText('Unknown employee')).toBeInTheDocument()
    expect(screen.queryByText('employee-1')).not.toBeInTheDocument()
  })

  it('keeps resolved selected employee labels after search results change', () => {
    const onEmployeesChange = jest.fn()
    mockEmployees = [{ id: 'employee-1', displayName: 'Alex Morgan' }]
    const { rerender } = render(<MultiEmployeeSelect value={[]} onEmployeesChange={onEmployeesChange} />)

    mockComboboxProps.onValueChange(['employee-1'])
    mockEmployees = []
    rerender(<MultiEmployeeSelect value={['employee-1']} onEmployeesChange={onEmployeesChange} />)

    expect(onEmployeesChange).toHaveBeenCalledWith([expect.objectContaining({ displayName: 'Alex Morgan' })])
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.queryByText('employee-1')).not.toBeInTheDocument()
  })
})
