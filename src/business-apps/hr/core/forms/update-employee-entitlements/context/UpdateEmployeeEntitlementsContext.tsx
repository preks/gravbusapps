import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ALL_EMPLOYEE_DATA_QUERY, EMPLOYEE_DATA_QUERY } from '../UpdateEmployeeEntitlementsQueries'
import {
  getCurrentActiveStructureId,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'

export interface EmployeeLite {
  id: string
  firstName?: string
  lastName?: string
}

export interface UpdateEmployeeEntitlementsContextState {
  employees: EmployeeLite[]
  selectedEmployeeId: string
  setSelectedEmployeeId: (id: string) => void
  activeEmployeeId: string
  isFixedEmployeeId: boolean
  fixedEmployeeName?: string
  entitlements: any[]
  absenceTypes: Array<{ id: string; value?: string; code?: string; translations?: any[] }>
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const UpdateEmployeeEntitlementsContext = createContext<UpdateEmployeeEntitlementsContextState | undefined>(undefined)

export const useUpdateEmployeeEntitlementsContext = () => {
  const ctx = useContext(UpdateEmployeeEntitlementsContext)
  if (!ctx)
    throw new Error('useUpdateEmployeeEntitlementsContext must be used within UpdateEmployeeEntitlementsProvider')
  return ctx
}

export interface UpdateEmployeeEntitlementsProviderProps {
  accessToken: string
  userInfo?: BusinessAppContextProps['userInfo']
  employeeId?: string
  children: React.ReactNode
}

export function UpdateEmployeeEntitlementsProvider({
  accessToken,
  employeeId,
  children
}: UpdateEmployeeEntitlementsProviderProps) {
  const graphql = useGraphqlClient(accessToken)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<EmployeeLite[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [fixedEmployeeName, setFixedEmployeeName] = useState<string>('')
  const [entitlements, setEntitlements] = useState<any[]>([])
  const [absenceTypes, setAbsenceTypes] = useState<
    Array<{ id: string; value?: string; code?: string; translations?: any[] }>
  >([])

  const activeEmployeeId = useMemo(() => employeeId || selectedEmployeeId, [employeeId, selectedEmployeeId])
  const isFixedEmployeeId = useMemo(() => Boolean(employeeId && String(employeeId).trim().length > 0), [employeeId])

  const loadEmployees = useCallback(async () => {
    try {
      // If employeeId is fixed, skip loading all employees
      if (isFixedEmployeeId) return
      const res: any = await graphql.request(ALL_EMPLOYEE_DATA_QUERY as any, {
        structureId: getCurrentActiveStructureId(),
        activeUserLocale: getCurrentActiveUserLocale()
      })
      const list: EmployeeLite[] = (res?.Employee || []).map((e: any) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName
      }))
      setEmployees(list)
      // Preselect when we have an activeEmployeeId provided; match by Employee.id
      if (!selectedEmployeeId && activeEmployeeId) {
        if (list.some(e => e.id === activeEmployeeId)) setSelectedEmployeeId(activeEmployeeId)
      }
    } catch {
      setEmployees([])
    }
  }, [graphql, isFixedEmployeeId, selectedEmployeeId, activeEmployeeId])

  const loadEmployeeEntitlements = useCallback(async () => {
    if (!activeEmployeeId) return
    try {
      setLoading(true)
      setError(null)
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      const res: any = await graphql.request(EMPLOYEE_DATA_QUERY as any, {
        employeeId: activeEmployeeId,
        activeUserLocale: getCurrentActiveUserLocale(),
        firstDayOfCurrentYear: firstDay.toISOString(),
        lastDayOfCurrentYear: lastDay.toISOString()
      })
      setEntitlements(res?.EmployeeAbsenceEntitlement || [])
      setAbsenceTypes(res?.absenceType || [])
      // Capture fixed employee name if available
      if (isFixedEmployeeId) {
        const emp = res?.Employee?.[0]
        if (emp) {
          const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
          ;(setFixedEmployeeName as any)?.(fullName)
        }
      }
    } catch (e: any) {
      setError(
        e?.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.error_load_title', 'Error Loading Employee')
      )
    } finally {
      setLoading(false)
    }
  }, [activeEmployeeId, graphql])

  // ensure initial data logic runs once on mount
  const hasLoadedEmployeesRef = useRef(false)
  useEffect(() => {
    if (hasLoadedEmployeesRef.current) return
    hasLoadedEmployeesRef.current = true
    loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    if (employeeId) {
      // when fixed employee is provided, prefer it
      setSelectedEmployeeId(employeeId)
    }
  }, [employeeId])

  useEffect(() => {
    if (activeEmployeeId) {
      loadEmployeeEntitlements()
    } else {
      setLoading(false)
    }
  }, [activeEmployeeId, loadEmployeeEntitlements])

  // Preselect when activeEmployeeId becomes available after employees are loaded
  useEffect(() => {
    const canPreselect = activeEmployeeId && !selectedEmployeeId && employees.some(e => e.id === activeEmployeeId)
    if (canPreselect) setSelectedEmployeeId(activeEmployeeId)
  }, [activeEmployeeId, selectedEmployeeId, employees])

  const reload = useCallback(async () => {
    await loadEmployeeEntitlements()
  }, [loadEmployeeEntitlements])

  return (
    <UpdateEmployeeEntitlementsContext.Provider
      value={{
        employees,
        selectedEmployeeId,
        setSelectedEmployeeId,
        activeEmployeeId,
        isFixedEmployeeId,
        fixedEmployeeName,
        entitlements,
        absenceTypes,
        loading,
        error,
        reload
      }}
    >
      {children}
    </UpdateEmployeeEntitlementsContext.Provider>
  )
}
