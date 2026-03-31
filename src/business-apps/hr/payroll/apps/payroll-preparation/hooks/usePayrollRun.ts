import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { GET_PAYROLL_RUN } from '../queries/payrollQueries'
import type { PayrollRun, PayrollRunStatus, PayrollCountry, SignOffData, AuditEvent } from '../types/payrollTypes'
import type { CreatePayrollRunParams } from '../components/shared/CreatePayrollRunDialog'

const SAVE_PROCESS_PATH = '/employee/savePayrollRun'

function getUserDisplayName(userInfo?: UserInfoProps): string {
  if (!userInfo) return 'System'
  const empDetails = userInfo.employeeDetails
  if (empDetails?.displayName) return empDetails.displayName
  if (empDetails?.firstName && empDetails?.lastName) return `${empDetails.firstName} ${empDetails.lastName}`
  if (userInfo.givenName && userInfo.familyName) return `${userInfo.givenName} ${userInfo.familyName}`
  return userInfo.userName || 'Unknown'
}

export interface UsePayrollRunResult {
  payrollRun: PayrollRun | null
  loading: boolean
  error: Error | null
  saving: boolean
  auditEvents: AuditEvent[]
  createRun: (params: CreatePayrollRunParams) => Promise<PayrollRun | null>
  updateStatus: (status: PayrollRunStatus) => Promise<void>
  signOff: (data: SignOffData) => Promise<void>
  recordExport: (mode: string, count: number) => void
  refetch: () => Promise<void>
}

function createAuditEvent(eventType: string, description: string, userInfo?: UserInfoProps): AuditEvent {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventType,
    description,
    userId: userInfo?.id || 'system',
    userName: getUserDisplayName(userInfo),
    timestamp: new Date().toISOString()
  }
}

export function usePayrollRun(
  accessToken: string,
  companyId: string | null,
  companyName: string | null,
  country: PayrollCountry | null,
  activeRun: PayrollRun | null,
  userInfo?: UserInfoProps
): UsePayrollRunResult {
  const gqlClient = useGraphqlClient(accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(activeRun)
  const [loading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])

  useEffect(() => {
    setPayrollRun(activeRun)
    setAuditEvents([])
    if (activeRun) {
      setAuditEvents([createAuditEvent('payroll_run_loaded', `Loaded payroll run (${activeRun.status})`, userInfo)])
    }
  }, [activeRun?.id])

  const addAuditEvent = useCallback(
    (eventType: string, description: string) => {
      setAuditEvents(prev => [createAuditEvent(eventType, description, userInfo), ...prev])
    },
    [userInfo]
  )

  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const refetchRun = useCallback(async () => {
    if (!payrollRun || !companyId) return
    try {
      const result = await gqlClient.request<{ PayrollRun: PayrollRun[] }>(GET_PAYROLL_RUN, {
        year: payrollRun.year,
        month: payrollRun.month,
        legalEntityId: companyId
      })
      const updated = result.PayrollRun?.[0] ?? null
      if (updated) setPayrollRun(updated)
    } catch {
      // best-effort
    }
  }, [gqlClient, payrollRun, companyId])

  const createRun = useCallback(
    async (params: CreatePayrollRunParams): Promise<PayrollRun | null> => {
      if (!accessToken || !companyId) return null
      setSaving(true)
      setError(null)

      const payload = {
        payrollRun: {
          month: params.month,
          year: params.year,
          country: country || 'DE',
          legalEntityId: companyId,
          legalEntityName: companyName || '',
          cutOffDate: new Date(params.cutOffDate + 'T00:00:00.000Z').toISOString(),
          paymentDate: new Date(params.paymentDate + 'T00:00:00.000Z').toISOString(),
          status: 'PAYROLL_IN_PROGRESS'
        },
        changeMode: 'INSERT'
      }

      try {
        const response = await restClient.post<{ payrollRun: PayrollRun }>(SAVE_PROCESS_PATH, payload, {
          headers: authHeaders
        })
        const created = response.payrollRun
        setPayrollRun(created)
        addAuditEvent(
          'payroll_run_created',
          `Payroll run created for ${companyName} — ${params.year}-${String(params.month).padStart(2, '0')}`
        )
        return created
      } catch (err) {
        console.error('[usePayrollRun] Failed to create payroll run:', err)
        setError(err instanceof Error ? err : new Error('Failed to create payroll run'))
        return null
      } finally {
        setSaving(false)
      }
    },
    [accessToken, restClient, companyId, companyName, country, addAuditEvent]
  )

  const updateStatus = useCallback(
    async (status: PayrollRunStatus) => {
      if (!payrollRun) return
      setSaving(true)
      setError(null)

      const payload = {
        payrollRun: {
          ...payrollRun,
          status,
          updatedBy: getUserDisplayName(userInfo)
        },
        changeMode: 'UPDATE'
      }

      try {
        await restClient.post(SAVE_PROCESS_PATH, payload, { headers: authHeaders })
        addAuditEvent('status_changed', `Status changed to ${status}`)
        await refetchRun()
      } catch (err) {
        console.error('[usePayrollRun] Failed to update status:', err)
        setError(err instanceof Error ? err : new Error('Failed to update payroll run status'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, restClient, accessToken, userInfo, addAuditEvent, refetchRun]
  )

  const signOff = useCallback(
    async (data: SignOffData) => {
      if (!payrollRun) return
      setSaving(true)
      setError(null)

      const displayName = getUserDisplayName(userInfo)
      const updatedRun: Record<string, unknown> = {
        ...payrollRun,
        updatedBy: displayName
      }

      if (data.preparedBy) {
        updatedRun.preparedBy = data.preparedBy
        updatedRun.preparedAt = data.preparedAt || new Date().toISOString()
      }
      if (data.reviewedBy) {
        updatedRun.reviewedBy = data.reviewedBy
        updatedRun.reviewedAt = data.reviewedAt || new Date().toISOString()
      }
      if (data.comments) {
        updatedRun.reviewComment = data.comments
      }
      if (data.approvalDecision) {
        updatedRun.approvalDecision = data.approvalDecision
        if (data.approvalDecision === 'approved') {
          updatedRun.status = 'PAYROLL_APPROVED_FOR_EXPORT'
        }
      }

      const payload = {
        payrollRun: updatedRun,
        changeMode: 'UPDATE'
      }

      try {
        await restClient.post(SAVE_PROCESS_PATH, payload, { headers: authHeaders })
        addAuditEvent(
          'signoff_completed',
          `Sign-off by ${data.reviewedBy || data.preparedBy}: ${data.approvalDecision || 'prepared'}`
        )
        await refetchRun()
      } catch (err) {
        console.error('[usePayrollRun] Failed to sign off:', err)
        setError(err instanceof Error ? err : new Error('Failed to complete sign-off'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, restClient, accessToken, userInfo, addAuditEvent, refetchRun]
  )

  const recordExport = useCallback(
    (mode: string, count: number) => {
      addAuditEvent('export_generated', `Export generated: ${mode}, ${count} employees`)
    },
    [addAuditEvent]
  )

  return {
    payrollRun,
    loading,
    error,
    saving,
    auditEvents,
    createRun,
    updateStatus,
    signOff,
    recordExport,
    refetch: refetchRun
  }
}
