import { useState, useEffect, useCallback } from 'react'
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
  const [employeeSearchText, setEmployeeSearchText] = useState('')
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([])

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string[]>(['BOOKED'])

  // Amount filter state
  const [localAmountMin, setLocalAmountMin] = useState(amountMinFilter)
  const [localAmountMax, setLocalAmountMax] = useState(amountMaxFilter)

  // Debounced values using useDebounce hook
  const debouncedEmployeeSearchText = useDebounce(employeeSearchText, 300)
  const debouncedAmountMin = useDebounce(localAmountMin, 500)
  const debouncedAmountMax = useDebounce(localAmountMax, 500)

  // Handle debounced employee search
  useEffect(() => {
    const searchEmployeesDebounced = async () => {
      if (debouncedEmployeeSearchText.trim().length >= 2) {
        setEmployeeSearchLoading(true)
        try {
          const results = await searchEmployees(debouncedEmployeeSearchText)
          setEmployeeSearchResults(results)
        } catch {
          console.error('Error searching employees:', error)
          setEmployeeSearchResults([])
        } finally {
          setEmployeeSearchLoading(false)
        }
      } else {
        setEmployeeSearchResults([])
      }
    }

    searchEmployeesDebounced()
  }, [debouncedEmployeeSearchText, searchEmployees])

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
    setEmployeeSearchText('')
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
    employeeSearchText,
    setEmployeeSearchText,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    employeeSearchResults,
    employeeSearchLoading,
    selectedEmployees,
    setSelectedEmployees,
    debouncedSearchEmployees: setEmployeeSearchText,

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
