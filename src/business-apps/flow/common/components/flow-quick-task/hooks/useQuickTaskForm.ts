import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useEmployeeSearch } from './useEmployeeSearch'
import { UseQuickTaskFormOptions, UseQuickTaskFormResult, QuickTaskFormData, AssigneeOption } from '../types'

// Constants
const SEARCH_DEBOUNCE_DELAY_MS = 300

/**
 * Custom hook for managing Blink form state and logic
 * Handles employee search, form initialization, and submission
 */
export function useQuickTaskForm(options: UseQuickTaskFormOptions): UseQuickTaskFormResult {
  const { accessToken, currentUserId, config = {}, defaultValues, onSubmit } = options

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with default values
  const form = useForm<QuickTaskFormData>({
    defaultValues: {
      title: '',
      message: '',
      documents: [],
      assignedUserIds: [],
      dueDate: '',
      ...defaultValues
    }
  })

  // Employee search logic (only if using employee-search mode)
  const assigneeMode = config.assigneeSelector?.mode || 'employee-search'
  const { employees, loading: employeesLoading, searchEmployees } = useEmployeeSearch({ accessToken, currentUserId })

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search handler
  const handleEmployeeSearch = useCallback(
    (query: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new timer for debounced search
      debounceTimerRef.current = setTimeout(() => {
        if (assigneeMode === 'employee-search') {
          searchEmployees(query)
        } else if (config.assigneeSelector?.searchFunction) {
          // Use custom search function if provided
          config.assigneeSelector.searchFunction(query)
        }
      }, SEARCH_DEBOUNCE_DELAY_MS)
    },
    [assigneeMode, searchEmployees, config.assigneeSelector]
  )

  // Trigger initial search on mount ONCE (for employee-search mode)
  const hasInitialLoadedRef = useRef(false)
  useEffect(() => {
    if (assigneeMode === 'employee-search' && !hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true
      searchEmployees('') // Load initial results with empty search - only once
    }
  }, [assigneeMode, searchEmployees])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Convert employees to combobox options
  const employeeOptions: AssigneeOption[] = useMemo(() => {
    if (assigneeMode !== 'employee-search') {
      return []
    }
    return employees
      .filter(employee => employee.userId && employee.fullName)
      .map(employee => ({
        value: employee.userId,
        label: employee.fullName,
        displayName: employee.displayName,
        avatar: employee.pictureThumbnail
      }))
  }, [employees, assigneeMode])

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: QuickTaskFormData) => {
      setIsSubmitting(true)
      try {
        await onSubmit(data)
      } finally {
        setIsSubmitting(false)
      }
    },
    [onSubmit]
  )

  return {
    form,
    handleSubmit,
    isSubmitting,
    employeeOptions,
    employeesLoading,
    handleEmployeeSearch
  }
}
