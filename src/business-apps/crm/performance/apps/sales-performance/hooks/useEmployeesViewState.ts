import { useState, useEffect, useCallback } from 'react'
import type { EmployeesTabKey } from '../types/employeeTypes'
import { getInitialEmployeesTab, updateEmployeesTabUrl, initializeEmployeesTabUrl } from '../utils/employeesViewHelpers'

export interface EmployeesViewState {
  activeTab: EmployeesTabKey
  handleTabChange: (tab: EmployeesTabKey) => void
}

export function useEmployeesViewState(): EmployeesViewState {
  const [activeTab, setActiveTab] = useState<EmployeesTabKey>(getInitialEmployeesTab)

  const handleTabChange = useCallback((tab: EmployeesTabKey) => {
    setActiveTab(tab)
    updateEmployeesTabUrl(tab)
  }, [])

  useEffect(() => {
    initializeEmployeesTabUrl(activeTab)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialEmployeesTab())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    activeTab,
    handleTabChange
  }
}
