/**
 * useVacationMetrics Hook
 * Fetches comprehensive vacation data for employee vacation approval
 * Includes entitlement, approved absences, and pending requests
 */

import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

interface UseVacationMetricsProps {
  accessToken: string
  employeeId?: string
  currentAbsenceId?: string
  currentRequestDays?: number
}

interface VacationEntitlement {
  total: number
  approved: number
  pending: number
  available: number
  validFrom: string
  validTo: string
}

interface AbsenceRecord {
  id: string
  startDate: string
  endDate: string
  workingDays: number
  status: string
  typeRef: string
  typeName: string
  description?: string
}

interface VacationMetrics {
  entitlement: VacationEntitlement | null
  approvedAbsences: AbsenceRecord[]
  pendingAbsences: AbsenceRecord[]
  totalApprovedDays: number
  totalPendingDays: number
  remainingBeforeRequest: number // Equals currentBalance
  remainingAfterApproval: number // Equals currentBalance - currentRequestDays
  isLoading: boolean
  error: string | null
}

export const useVacationMetrics = ({
  accessToken,
  employeeId,
  currentAbsenceId,
  currentRequestDays = 0
}: UseVacationMetricsProps): VacationMetrics => {
  const [entitlement, setEntitlement] = useState<VacationEntitlement | null>(null)
  const [approvedAbsences, setApprovedAbsences] = useState<AbsenceRecord[]>([])
  const [pendingAbsences, setPendingAbsences] = useState<AbsenceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  useEffect(() => {
    // Use isMounted flag for cleanup
    let isMounted = true

    const fetchVacationData = async () => {
      if (!accessToken || !employeeId) {
        return
      }

      // Check if still mounted before setting state
      if (!isMounted) return

      setIsLoading(true)
      setError(null)

      try {
        const today = dayjs().format('YYYY-MM-DD')
        const yearStart = dayjs().startOf('year').format('YYYY-MM-DD')
        const yearEnd = dayjs().endOf('year').format('YYYY-MM-DD')

        // Query 1: Fetch vacation entitlement for annual leave (A001)
        const entitlementQuery = `
          query GetEmployeeVacationEntitlement($employeeId: uuid!, $today: timestamp!) {
            EmployeeAbsenceEntitlement(
              where: {
                employeeId: { _eq: $employeeId }
                type: { id: { _ilike: "%A001%" } }
                validFrom: { _lte: $today }
                validTo: { _gte: $today }
                isDeleted: { _eq: false }
              }
              limit: 1
            ) {
              id
              total
              approved
              pending
              available
              validFrom
              validTo
            }
          }
        `

        // Query 2: Fetch approved vacation absences for current year (A001 only)
        const approvedAbsencesQuery = `
          query GetApprovedAbsences($employeeId: uuid!, $yearStart: timestamp!, $yearEnd: timestamp!) {
            EmployeeAbsence(
              where: {
                employeeId: { _eq: $employeeId }
                status: { _eq: "APPROVED" }
                typeRef: { _ilike: "%A001%" }
                startDate: { _gte: $yearStart }
                endDate: { _lte: $yearEnd }
                isDeleted: { _eq: false }
              }
              orderBy: { startDate: DESC }
            ) {
              id
              startDate
              endDate
              workingDays
              status
              typeRef
              description
              type {
                id
                value
                translations {
                  value
                  localeCode
                }
              }
            }
          }
        `

        // Query 3: Fetch pending vacation absences (excluding current request, A001 only)
        const pendingAbsencesQuery = `
          query GetPendingAbsences($employeeId: uuid!, $currentAbsenceId: uuid) {
            EmployeeAbsence(
              where: {
                employeeId: { _eq: $employeeId }
                status: { _in: ["PENDING", "PENDING_APPROVAL"] }
                typeRef: { _ilike: "%A001%" }
                id: { _neq: $currentAbsenceId }
                isDeleted: { _eq: false }
              }
              orderBy: { startDate: ASC }
            ) {
              id
              startDate
              endDate
              workingDays
              status
              typeRef
              description
              type {
                id
                value
                translations {
                  value
                  localeCode
                }
              }
            }
          }
        `

        // Execute all three queries in parallel for better performance
        const [entitlementResponse, approvedResponse, pendingResponse] = await Promise.all([
          graphqlClient.request<{ EmployeeAbsenceEntitlement: any[] }>(entitlementQuery, { employeeId, today }),
          graphqlClient.request<{ EmployeeAbsence: any[] }>(approvedAbsencesQuery, { employeeId, yearStart, yearEnd }),
          graphqlClient.request<{ EmployeeAbsence: any[] }>(pendingAbsencesQuery, { employeeId, currentAbsenceId })
        ])

        // Check if still mounted before updating state
        if (!isMounted) return

        // Process entitlement response
        if (entitlementResponse.EmployeeAbsenceEntitlement?.length > 0) {
          const ent = entitlementResponse.EmployeeAbsenceEntitlement[0]
          setEntitlement({
            total: ent.total || 0,
            approved: ent.approved || 0,
            pending: ent.pending || 0,
            available: ent.available || 0,
            validFrom: ent.validFrom,
            validTo: ent.validTo
          })
        }

        // Process approved absences response
        if (approvedResponse.EmployeeAbsence) {
          const approved = approvedResponse.EmployeeAbsence.map((absence: any) => ({
            id: absence.id,
            startDate: absence.startDate,
            endDate: absence.endDate,
            workingDays: absence.workingDays || 0,
            status: absence.status,
            typeRef: absence.typeRef,
            typeName: absence.type?.value || 'Vacation',
            description: absence.description
          }))
          setApprovedAbsences(approved)
        }

        // Process pending absences response
        if (pendingResponse.EmployeeAbsence) {
          const pending = pendingResponse.EmployeeAbsence.map((absence: any) => ({
            id: absence.id,
            startDate: absence.startDate,
            endDate: absence.endDate,
            workingDays: absence.workingDays || 0,
            status: absence.status,
            typeRef: absence.typeRef,
            typeName: absence.type?.value || 'Vacation',
            description: absence.description
          }))
          setPendingAbsences(pending)
        }
      } catch (err) {
        // Only log and update state for errors if still mounted
        if (isMounted) {
          console.error('Error fetching vacation metrics:', err)
          setError('Failed to load vacation data')
        }
      } finally {
        // Only update loading state if still mounted
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchVacationData()

    // Cleanup function - set isMounted to false to prevent state updates
    return () => {
      isMounted = false
    }
  }, [accessToken, employeeId, currentAbsenceId, graphqlClient])

  // Calculate totals
  const totalApprovedDays = approvedAbsences.reduce((sum, absence) => sum + absence.workingDays, 0)
  const totalPendingDays = pendingAbsences.reduce((sum, absence) => sum + absence.workingDays, 0)

  // Calculate current balance and projections
  // Current balance = Total entitlement - Taken (approved) days ONLY
  // This represents the balance BEFORE considering any pending requests
  const currentBalance = (entitlement?.total ?? 0) - totalApprovedDays

  // Remaining before request = Current balance (same value, for clarity in UI)
  const remainingBeforeRequest = currentBalance

  // After approval = Current balance - This request
  const remainingAfterApproval = currentBalance - currentRequestDays

  return {
    entitlement,
    approvedAbsences,
    pendingAbsences,
    totalApprovedDays,
    totalPendingDays,
    remainingBeforeRequest,
    remainingAfterApproval,
    isLoading,
    error
  }
}
