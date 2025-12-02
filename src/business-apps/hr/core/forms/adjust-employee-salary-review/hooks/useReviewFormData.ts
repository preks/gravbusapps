import { useState, useEffect, useMemo } from 'react'
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

  // Fetch affected employee name
  useEffect(() => {
    const fetchName = async () => {
      try {
        if (!accessToken || !employeeIdFromPayload) return
        const result = await graphqlClient.request<{ employee: { firstName: string; lastName: string } }>(
          GET_EMPLOYEE_NAME,
          { employeeId: employeeIdFromPayload }
        )
        const emp = result?.employee
        if (emp) {
          setEmployeeName(`${emp.firstName || ''} ${emp.lastName || ''}`.trim())
        }
      } catch {
        // ignore
      }
    }
    fetchName()
  }, [accessToken, employeeIdFromPayload, graphqlClient])

  // Fetch initiator employee name (who created the request)
  useEffect(() => {
    const fetchInitiatorName = async () => {
      try {
        if (!accessToken || !initiatorEmployeeId) return
        const result = await graphqlClient.request<{ initiator: { firstName: string; lastName: string } }>(
          GET_INITIATOR_EMPLOYEE_NAME,
          { initiatorEmployeeId }
        )
        const initiator = result?.initiator
        if (initiator) {
          setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
        }
      } catch {
        // ignore
      }
    }
    fetchInitiatorName()
  }, [accessToken, initiatorEmployeeId, graphqlClient])

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
    employeeIdFromPayload
  }
}
