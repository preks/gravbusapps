import dayjs from 'dayjs'
import { Employee } from '../hooks/useGetEmployeesReport'
import { getCatalogValue } from '@/common/utils/windowUtils'

const filterBySearch = (employees: Employee[], search: string): Employee[] => {
  if (!search) return employees
  const searchLower = search.toLowerCase()
  return employees.filter(
    employee =>
      employee.firstName.toLowerCase().includes(searchLower) ||
      employee.lastName.toLowerCase().includes(searchLower) ||
      employee.jobPosition?.toLowerCase().includes(searchLower) ||
      employee.location?.toLowerCase().includes(searchLower)
  )
}

const filterBySelectedFilters = (employees: Employee[], selectedFilters: string[]): Employee[] => {
  if (selectedFilters.length === 0) return employees

  const TENURE_OPTIONS = ['0-1y', '1-3y', '3-5y', '5-10y', '10+y']
  const tenureFilters = selectedFilters.filter(f => TENURE_OPTIONS.includes(f))
  const standardFilters = selectedFilters.filter(f => f.includes(':'))

  let filtered = [...employees]

  if (tenureFilters.length > 0) {
    filtered = filtered.filter(employee => {
      if (!employee.startDate) return false

      const startDate = dayjs(employee.startDate)
      if (!startDate.isValid()) return false

      const endDate = employee.exitDate ? dayjs(employee.exitDate) : dayjs()
      if (!endDate.isValid()) return false

      const tenureYears = endDate.diff(startDate, 'year', true)

      return tenureFilters.some(tenureFilter => {
        switch (tenureFilter) {
          case '0-1y':
            return tenureYears >= 0 && tenureYears < 1
          case '1-3y':
            return tenureYears >= 1 && tenureYears < 3
          case '3-5y':
            return tenureYears >= 3 && tenureYears < 5
          case '5-10y':
            return tenureYears >= 5 && tenureYears < 10
          case '10+y':
            return tenureYears >= 10
          default:
            return false
        }
      })
    })
  }

  if (standardFilters.length > 0) {
    const groupedFilters = standardFilters.reduce(
      (acc, filter) => {
        const [key, value] = filter.split(':', 2)
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(value)
        return acc
      },
      {} as Record<string, string[]>
    )

    filtered = filtered.filter(employee =>
      Object.entries(groupedFilters).every(([key, values]) => {
        if (values.length === 0) return true
        switch (key) {
          case 'position':
            return values.includes(employee.jobPosition || '')
          case 'location':
            return values.includes(employee.location || '')
          case 'employmentType': {
            const value = employee.employmentType ? getCatalogValue(employee.employmentType) : ''
            return values.includes(value)
          }
          case 'contractType': {
            const value = employee.contractType ? getCatalogValue(employee.contractType) : ''
            return values.includes(value)
          }
          default:
            return true
        }
      })
    )
  }

  return filtered
}

export const applyEmployeeFilters = (
  employees: Employee[],
  search: string,
  selectedFilters: string[],
  matchesKpi: (employee: Employee) => boolean
): Employee[] => {
  const searched = filterBySearch(employees, search)
  const kpiFiltered = searched.filter(matchesKpi)
  const standardFiltered = filterBySelectedFilters(kpiFiltered, selectedFilters)
  return standardFiltered
}
