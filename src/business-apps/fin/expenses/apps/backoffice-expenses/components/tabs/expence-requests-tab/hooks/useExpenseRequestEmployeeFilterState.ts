import { useState } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'

export function useExpenseRequestEmployeeFilterState() {
  const [employeeSheetSearchQuery, setEmployeeSheetSearchQuery] = useState('')
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)
  const employeeListSearchQuery = useDebounce(employeeSheetSearchQuery, 300)

  return {
    employeeSheetSearchQuery,
    setEmployeeSheetSearchQuery,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    employeeListSearchQuery
  }
}
