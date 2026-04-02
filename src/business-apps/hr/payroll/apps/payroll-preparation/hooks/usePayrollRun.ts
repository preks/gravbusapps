import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { GET_PAYROLL_RUN } from '../queries/payrollQueries'
import type { PayrollRun, PayrollRunStatus, PayrollCountry, ApprovalDecision, AuditEvent } from '../types/payrollTypes'
import type { CreatePayrollRunParams } from '../components/shared/CreatePayrollRunDialog'
import {
  DEFAULT_AUDIT_USER_SYSTEM_NAME,
  DEFAULT_AUDIT_USER_UNKNOWN_NAME,
  DEFAULT_PAYROLL_COUNTRY
} from '../utils/payrollDefaults'

const SAVE_PROCESS_PATH = '/employee/savePayrollRun'

const PAYROLL_RUN_FIELDS = [
  'id',
  'version',
  'month',
  'year',
  'country',
  'legalEntityId',
  'legalEntityName',
  'cutOffDate',
  'paymentDate',
  'status',
  'preparedBy',
  'preparedAt',
  'reviewedBy',
  'reviewedAt',
  'reviewComment',
  'approvalDecision'
] as const

const DATE_FIELDS = new Set(['cutOffDate', 'paymentDate', 'preparedAt', 'reviewedAt'])

function toISOTimestamp(value: unknown): string | null {
  if (!value || typeof value !== 'string') return value as string | null
  if (value.includes('T')) return value
  return new Date(value + 'T00:00:00.000Z').toISOString()
}

function toKogitoPayload(run: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key of PAYROLL_RUN_FIELDS) {
    if (key in run && run[key] !== null && run[key] !== undefined) {
      payload[key] = DATE_FIELDS.has(key) ? toISOTimestamp(run[key]) : run[key]
    }
  }
  return payload
}

function getUserDisplayName(userInfo?: UserInfoProps): string {
  if (!userInfo) return DEFAULT_AUDIT_USER_SYSTEM_NAME
  const empDetails = userInfo.employeeDetails
  if (empDetails?.displayName) return empDetails.displayName
  if (empDetails?.firstName && empDetails?.lastName) return `${empDetails.firstName} ${empDetails.lastName}`
  if (userInfo.givenName && userInfo.familyName) return `${userInfo.givenName} ${userInfo.familyName}`
  return userInfo.userName || DEFAULT_AUDIT_USER_UNKNOWN_NAME
}

function generateAuditEventId(): string {
  const cryptoApi = globalThis.crypto

  if (cryptoApi?.randomUUID) {
    return `audit-${cryptoApi.randomUUID()}`
  }

  if (cryptoApi?.getRandomValues) {
    const randomBytes = new Uint8Array(8)
    cryptoApi.getRandomValues(randomBytes)
    const suffix = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    return `audit-${Date.now()}-${suffix}`
  }

  return `audit-${Date.now()}`
}

export interface UsePayrollRunResult {
  payrollRun: PayrollRun | null
  loading: boolean
  error: Error | null
  saving: boolean
  auditEvents: AuditEvent[]
  createRun: (params: CreatePayrollRunParams) => Promise<PayrollRun | null>
  updateStatus: (status: PayrollRunStatus) => Promise<void>
  markReadyForReview: () => Promise<void>
  submitReview: (decision: ApprovalDecision, comment: string) => Promise<void>
  recordExport: (mode: string, count: number) => void
  refetch: () => Promise<void>
}

function createAuditEvent(eventType: string, description: string, userInfo?: UserInfoProps): AuditEvent {
  return {
    id: generateAuditEventId(),
    eventType,
    description,
    userId: userInfo?.id || 'system',
    userName: getUserDisplayName(userInfo),
    timestamp: new Date().toISOString()
  }
}

function buildPersistedAuditEvents(activeRun: PayrollRun): AuditEvent[] {
  const persisted: AuditEvent[] = []

  if (activeRun.createdBy && activeRun.createdAt) {
    persisted.push({
      id: `audit-created-${activeRun.id}`,
      eventType: 'payroll_run_created',
      description: `Payroll run created`,
      userId: '',
      userName: activeRun.createdBy,
      timestamp: activeRun.createdAt
    })
  }

  if (activeRun.preparedBy && activeRun.preparedAt) {
    persisted.push({
      id: `audit-prepared-${activeRun.id}`,
      eventType: 'marked_ready',
      description: `Marked ready for review`,
      userId: '',
      userName: activeRun.preparedBy,
      timestamp: activeRun.preparedAt
    })
  }

  if (activeRun.reviewedBy && activeRun.reviewedAt) {
    const decision = activeRun.approvalDecision || ''
    const comment = activeRun.reviewComment ? `: ${activeRun.reviewComment}` : ''
    persisted.push({
      id: `audit-reviewed-${activeRun.id}`,
      eventType: decision === 'APPROVED' ? 'review_approved' : 'review_rejected',
      description: `${decision}${comment}`,
      userId: '',
      userName: activeRun.reviewedBy,
      timestamp: activeRun.reviewedAt
    })
  }

  persisted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  return persisted
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
    if (activeRun) {
      setAuditEvents(buildPersistedAuditEvents(activeRun))
    } else {
      setAuditEvents([])
    }
  }, [activeRun?.id, activeRun?.status, activeRun?.preparedBy, activeRun?.reviewedBy])

  const addAuditEvent = useCallback(
    (eventType: string, description: string) => {
      setAuditEvents(prev => [createAuditEvent(eventType, description, userInfo), ...prev])
    },
    [userInfo]
  )

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

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
          version: 0,
          month: params.month,
          year: params.year,
          country: country || DEFAULT_PAYROLL_COUNTRY,
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
          ...toKogitoPayload(payrollRun as unknown as Record<string, unknown>),
          status
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

  const markReadyForReview = useCallback(async () => {
    if (!payrollRun) return
    setSaving(true)
    setError(null)

    const cleanRun = toKogitoPayload(payrollRun as unknown as Record<string, unknown>)
    cleanRun.status = 'PAYROLL_READY_FOR_REVIEW'
    cleanRun.preparedBy = getUserDisplayName(userInfo)
    cleanRun.preparedAt = new Date().toISOString()

    try {
      await restClient.post(SAVE_PROCESS_PATH, { payrollRun: cleanRun, changeMode: 'UPDATE' }, { headers: authHeaders })
      addAuditEvent('marked_ready', `Marked ready for review by ${cleanRun.preparedBy}`)
      await refetchRun()
    } catch (err) {
      console.error('[usePayrollRun] Failed to mark ready:', err)
      setError(err instanceof Error ? err : new Error('Failed to mark ready for review'))
    } finally {
      setSaving(false)
    }
  }, [payrollRun, restClient, userInfo, addAuditEvent, refetchRun])

  const submitReview = useCallback(
    async (decision: ApprovalDecision, comment: string) => {
      if (!payrollRun) return
      setSaving(true)
      setError(null)

      const cleanRun = toKogitoPayload(payrollRun as unknown as Record<string, unknown>)
      cleanRun.reviewedBy = getUserDisplayName(userInfo)
      cleanRun.reviewedAt = new Date().toISOString()
      cleanRun.reviewComment = comment
      cleanRun.approvalDecision = decision
      cleanRun.status = decision === 'APPROVED' ? 'PAYROLL_APPROVED_FOR_EXPORT' : 'PAYROLL_IN_PROGRESS'

      try {
        await restClient.post(
          SAVE_PROCESS_PATH,
          { payrollRun: cleanRun, changeMode: 'UPDATE' },
          { headers: authHeaders }
        )
        addAuditEvent(
          decision === 'APPROVED' ? 'review_approved' : 'review_rejected',
          `${decision} by ${cleanRun.reviewedBy}: ${comment}`
        )
        await refetchRun()
      } catch (err) {
        console.error('[usePayrollRun] Failed to submit review:', err)
        setError(err instanceof Error ? err : new Error('Failed to submit review'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, restClient, userInfo, addAuditEvent, refetchRun]
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
    markReadyForReview,
    submitReview,
    recordExport,
    refetch: refetchRun
  }
}
