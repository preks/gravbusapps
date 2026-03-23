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
  /** Debounced query from the filter sheet employee search field (any non-empty text triggers API search). */
  employeeListSearchQuery: string
}

export const useExpenseRequestFilters = ({
  searchEmployees,
  handleEmployeeFilter,
  handleStatusFilter,
  handleAmountFilter,
  amountMinFilter,
  amountMaxFilter,
  employeeListSearchQuery
}: UseExpenseRequestFiltersProps) => {
  // Employee filter state
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([])

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string[]>(['BOOKED'])

  // Amount filter state
  const [localAmountMin, setLocalAmountMin] = useState(amountMinFilter)
  const [localAmountMax, setLocalAmountMax] = useState(amountMaxFilter)

  // Debounced values using useDebounce hook
  const debouncedAmountMin = useDebounce(localAmountMin, 500)
  const debouncedAmountMax = useDebounce(localAmountMax, 500)

  // Employee list options (filter sheet): driven by debounced search query from parent
  useEffect(() => {
    const run = async () => {
      const q = employeeListSearchQuery.trim()
      if (q.length === 0) {
        setEmployeeSearchResults([])
        return
      }
      setEmployeeSearchLoading(true)
      try {
        const results = await searchEmployees(q)
        setEmployeeSearchResults(results)
      } catch (searchError) {
        console.error('Error searching employees:', searchError instanceof Error ? searchError.message : searchError)
        setEmployeeSearchResults([])
      } finally {
        setEmployeeSearchLoading(false)
      }
    }

    void run()
  }, [employeeListSearchQuery, searchEmployees])

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
    employeeSearchResults,
    employeeSearchLoading,
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
