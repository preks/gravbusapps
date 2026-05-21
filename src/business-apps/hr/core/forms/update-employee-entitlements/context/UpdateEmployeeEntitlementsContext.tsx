import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ALL_EMPLOYEE_DATA_QUERY, EMPLOYEE_DATA_QUERY } from '../UpdateEmployeeEntitlementsQueries'
import {
  getCurrentActiveStructureId,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import { EmployeeInfo } from '../../components/FormHeader'

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
  employeeHeaderInfo?: EmployeeInfo
  employeeHireDate?: string
  entitlements: any[]
  absenceTypes: Array<{ id: string; value?: string; code?: string; translations?: any[] }>
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  accessToken: string
}

const UpdateEmployeeEntitlementsContext = createContext<UpdateEmployeeEntitlementsContextState | undefined>(undefined)

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function dateKeyFromGraphQLValue(value: string): string {
  return value.slice(0, 10)
}

function getActiveWorkingCondition<T extends { activeFrom?: string | null; activeTo?: string | null }>(
  workingConditions: T[] | undefined,
  targetDate = new Date()
): T | undefined {
  if (!workingConditions?.length) {
    return undefined
  }

  if (workingConditions.length === 1) {
    return workingConditions[0]
  }

  const targetDateKey = formatLocalDate(targetDate)

  return workingConditions.find(condition => {
    const activeFromKey = condition.activeFrom ? dateKeyFromGraphQLValue(condition.activeFrom) : ''
    const activeToKey = condition.activeTo ? dateKeyFromGraphQLValue(condition.activeTo) : ''

    if (!activeFromKey) {
      return false
    }

    return activeFromKey <= targetDateKey && (!activeToKey || activeToKey >= targetDateKey)
  })
}

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
  const [employeesLoading, setEmployeesLoading] = useState(!employeeId)
  const [entitlementsLoading, setEntitlementsLoading] = useState(Boolean(employeeId))
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<EmployeeLite[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [fixedEmployeeName, setFixedEmployeeName] = useState<string>('')
  const [employeeHeaderInfo, setEmployeeHeaderInfo] = useState<EmployeeInfo | undefined>(undefined)
  const [employeeHireDate, setEmployeeHireDate] = useState<string | undefined>(undefined)
  const [entitlements, setEntitlements] = useState<any[]>([])
  const [absenceTypes, setAbsenceTypes] = useState<
    Array<{ id: string; value?: string; code?: string; translations?: any[] }>
  >([])

  const activeEmployeeId = useMemo(() => employeeId || selectedEmployeeId, [employeeId, selectedEmployeeId])
  const isFixedEmployeeId = useMemo(() => Boolean(employeeId && String(employeeId).trim().length > 0), [employeeId])
  const loading = employeesLoading || entitlementsLoading

  const loadEmployees = useCallback(async () => {
    try {
      // If employeeId is fixed, skip loading all employees
      if (isFixedEmployeeId) {
        setEmployeesLoading(false)
        return
      }
      setEmployeesLoading(true)
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
    } finally {
      setEmployeesLoading(false)
    }
  }, [graphql, isFixedEmployeeId, selectedEmployeeId, activeEmployeeId])

  const loadEmployeeEntitlements = useCallback(async () => {
    if (!activeEmployeeId) return
    try {
      setEntitlementsLoading(true)
      setError(null)
      const res: any = await graphql.request(EMPLOYEE_DATA_QUERY as any, {
        employeeId: activeEmployeeId,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      setEntitlements(res?.EmployeeAbsenceEntitlement || [])
      setAbsenceTypes(res?.absenceType || [])
      // Capture employee header info
      const emp = res?.Employee?.[0]
      if (emp) {
        const fullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
        setFixedEmployeeName(fullName)
        // employeePosition is an array, get the first one
        const position = Array.isArray(emp.employeePosition) ? emp.employeePosition[0] : emp.employeePosition
        const workingCondition = Array.isArray(emp.workingCondition)
          ? getActiveWorkingCondition(emp.workingCondition)
          : emp.workingCondition
        setEmployeeHeaderInfo({
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobTitle: position?.jobPosition?.name
        })
        setEmployeeHireDate(workingCondition?.hireDate || position?.hireDate || undefined)
      } else {
        setEmployeeHireDate(undefined)
      }
    } catch (e: any) {
      setError(
        e?.message ||
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_termination.error_load_title', 'Error Loading Employee')
      )
    } finally {
      setEntitlementsLoading(false)
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
      setEntitlementsLoading(false)
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
        employeeHeaderInfo,
        employeeHireDate,
        entitlements,
        absenceTypes,
        loading,
        error,
        reload,
        accessToken
      }}
    >
      {children}
    </UpdateEmployeeEntitlementsContext.Provider>
  )
}
