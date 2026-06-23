import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'

interface Employee {
  id: string
  name: string
}

interface UseExpenseRequestFiltersProps {
  searchEmployees: (searchText: string) => Promise<Employee[]>
  handleEmployeeFilter: (filter: string) => void
  handleStatusFilter: (filter: string) => void
  handleAmountFilter: (min: string, max: string) => void
  amountMinFilter: string
  amountMaxFilter: string
}

function mergeEmployeeOptions(...employeeGroups: Employee[][]): Employee[] {
  const employeeById = new Map<string, Employee>()

  for (const employeeGroup of employeeGroups) {
    for (const employee of employeeGroup) {
      employeeById.set(employee.id, employee)
    }
  }

  return Array.from(employeeById.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const useExpenseRequestFilters = ({
  searchEmployees,
  handleEmployeeFilter,
  handleStatusFilter,
  handleAmountFilter,
  amountMinFilter,
  amountMaxFilter
}: UseExpenseRequestFiltersProps) => {
  // Employee filter state
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([])

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string[]>(['BOOKED'])

  // Amount filter state
  const [localAmountMin, setLocalAmountMin] = useState(amountMinFilter)
  const [localAmountMax, setLocalAmountMax] = useState(amountMaxFilter)

  // Debounced values using useDebounce hook
  const debouncedAmountMin = useDebounce(localAmountMin, 500)
  const debouncedAmountMax = useDebounce(localAmountMax, 500)

  useEffect(() => {
    let isCancelled = false

    const loadAvailableEmployees = async () => {
      const employees = await searchEmployees('')
      if (!isCancelled) {
        setAvailableEmployees(employees)
      }
    }

    void loadAvailableEmployees()

    return () => {
      isCancelled = true
    }
  }, [searchEmployees])

  const employeeFilterOptions = useMemo(
    () => mergeEmployeeOptions(availableEmployees, selectedEmployees),
    [availableEmployees, selectedEmployees]
  )

  // Handle debounced amount filter
  useEffect(() => {
    handleAmountFilter(debouncedAmountMin, debouncedAmountMax)
  }, [debouncedAmountMin, debouncedAmountMax, handleAmountFilter])

  // Update local amount filters when props change
  useEffect(() => {
    setLocalAmountMin(amountMinFilter)
    setLocalAmountMax(amountMaxFilter)
  }, [amountMinFilter, amountMaxFilter])

  // Status filter change handler
  const handleStatusFilterChange = useCallback(
    (status: string, selected: boolean) => {
      const newStatusFilter = selected ? [...statusFilter, status] : statusFilter.filter(s => s !== status)

      setStatusFilter(newStatusFilter)
      handleStatusFilter(newStatusFilter.join(','))
    },
    [statusFilter, handleStatusFilter]
  )

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setEmployeeFilter('')
    setSelectedEmployees([])
    setStatusFilter([])
    setLocalAmountMin('')
    setLocalAmountMax('')

    handleEmployeeFilter('')
    handleStatusFilter('')
    handleAmountFilter('', '')
  }, [handleEmployeeFilter, handleStatusFilter, handleAmountFilter])

  return {
    // Employee filter
    employeeFilter,
    setEmployeeFilter,
    employeeSearchResults: employeeFilterOptions,
    selectedEmployees,
    setSelectedEmployees,

    // Status filter
    statusFilter,
    setStatusFilter,
    handleStatusFilterChange,

    // Amount filter
    localAmountMin,
    setLocalAmountMin,
    localAmountMax,
    setLocalAmountMax,
    debouncedAmountFilter: (min: string, max: string) => {
      setLocalAmountMin(min)
      setLocalAmountMax(max)
    },

    // Clear filters
    clearAllFilters
  }
}
