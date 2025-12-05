import { useState, useEffect, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  SALARY_ADJUST_REASON_CATALOG_QUERY
} from '../AdjustEmployeeSalaryReviewQueries'
import type { SalaryAdjustReasonEntry } from '../utils/salaryFormatters'
import type { SalaryChangePayload, ReviewMode } from '../types'

interface UseReviewFormDataParams {
  accessToken: string | undefined
  additionalData: Record<string, unknown> | undefined
  employeeId: string | undefined
}

interface UseReviewFormDataResult {
  employeeName: string
  initiatorName: string
  salaryAdjustReasonEntries: SalaryAdjustReasonEntry[]
  locale: string
  payload: SalaryChangePayload
  reviewMode: ReviewMode
  employeeIdFromPayload: string | undefined
  employee?: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  }
}

interface EmployeeNameResponse {
  firstName: string
  lastName: string
}

function formatFullName(employee: EmployeeNameResponse | undefined): string {
  if (!employee) return ''
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
}

/**
 * Hook to fetch and manage all data needed for the salary review form
 */
export function useReviewFormData({
  accessToken,
  additionalData,
  employeeId
}: UseReviewFormDataParams): UseReviewFormDataResult {
  const graphqlClient = useGraphQLClient(accessToken as any)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const [salaryAdjustReasonEntries, setSalaryAdjustReasonEntries] = useState<SalaryAdjustReasonEntry[]>([])
  const [employee, setEmployee] = useState<
    | {
        firstName?: string
        lastName?: string
        pictureThumbnail?: string
        jobTitle?: string
      }
    | undefined
  >(undefined)

  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Extract payload data
  const payload: SalaryChangePayload = (additionalData as any)?.psi_taskPayload || {}
  const newSalaryData = payload?.employeeSalary || {}
  const oldCompensation = payload?.oldEmployeeSalary

  // Determine review mode based on whether old salary exists
  const reviewMode: ReviewMode = useMemo(() => {
    if (!oldCompensation) return 'assign'
    const hasOldSalary =
      (oldCompensation.annualGrossSalary && oldCompensation.annualGrossSalary > 0) ||
      (oldCompensation.monthlyGrossSalary && oldCompensation.monthlyGrossSalary > 0) ||
      (oldCompensation.hourlyGrossSalary && oldCompensation.hourlyGrossSalary > 0)
    return hasOldSalary ? 'adjust' : 'assign'
  }, [oldCompensation])

  // Determine employee ID with fallback priority
  const employeeIdFromPayload: string | undefined = payload?.employeeId || newSalaryData?.employee || employeeId

  // Initiator employee ID
  const initiatorEmployeeId: string | undefined = payload?.initiatorEmployeeId

  // Reusable function to fetch employee name
  const fetchEmployeeName = useCallback(
    async <T extends Record<string, EmployeeNameResponse | undefined>>(
      id: string | undefined,
      query: string,
      variables: Record<string, string>,
      resultKey: keyof T,
      setter: (name: string) => void,
      isEmployee: boolean = false
    ) => {
      if (!accessToken || !id) return
      try {
        const result = await graphqlClient.request<any>(query, variables)
        setter(formatFullName(result?.[resultKey]))
        if (isEmployee && resultKey === 'employee') {
          const emp = result?.employee
          setEmployee({
            firstName: emp?.firstName,
            lastName: emp?.lastName,
            pictureThumbnail: emp?.pictureThumbnail,
            jobTitle: result?.EmployeePosition?.[0]?.jobPosition?.name
          })
        }
      } catch {
        // ignore
      }
    },
    [accessToken, graphqlClient]
  )

  // Fetch affected employee name
  useEffect(() => {
    fetchEmployeeName<{ employee: EmployeeNameResponse }>(
      employeeIdFromPayload,
      GET_EMPLOYEE_NAME,
      { employeeId: employeeIdFromPayload! },
      'employee',
      setEmployeeName,
      true
    )
  }, [employeeIdFromPayload, fetchEmployeeName])

  // Fetch initiator employee name (who created the request)
  useEffect(() => {
    fetchEmployeeName<{ initiator: EmployeeNameResponse }>(
      initiatorEmployeeId,
      GET_INITIATOR_EMPLOYEE_NAME,
      { initiatorEmployeeId: initiatorEmployeeId! },
      'initiator',
      setInitiatorName
    )
  }, [initiatorEmployeeId, fetchEmployeeName])

  // Fetch salary adjustment reason catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        if (!accessToken) return
        const result = await graphqlClient.request<{
          CatalogEntry: SalaryAdjustReasonEntry[]
        }>(SALARY_ADJUST_REASON_CATALOG_QUERY)
        setSalaryAdjustReasonEntries(result?.CatalogEntry || [])
      } catch {
        // ignore
      }
    }
    fetchCatalog()
  }, [accessToken, graphqlClient])

  return {
    employeeName,
    initiatorName,
    salaryAdjustReasonEntries,
    locale,
    payload,
    reviewMode,
    employeeIdFromPayload,
    employee
  }
}
