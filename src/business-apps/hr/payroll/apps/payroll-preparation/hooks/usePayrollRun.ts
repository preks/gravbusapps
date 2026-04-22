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

function isPresentString(value: string | undefined): value is string {
  return Boolean(value)
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

function resolveCreatedByDisplayName(createdBy: string, userInfo?: UserInfoProps): string {
  if (!userInfo) {
    return createdBy
  }

  const currentUserIdentifiers = [userInfo.id, userInfo.userName, userInfo.employeeDetails?.employeeId].filter(
    isPresentString
  )

  if (currentUserIdentifiers.includes(createdBy)) {
    return getUserDisplayName(userInfo)
  }

  return createdBy
}

function resolveBackendUserDisplayName(userIdentifier: string | null | undefined, userInfo?: UserInfoProps): string {
  if (!userIdentifier) {
    return DEFAULT_AUDIT_USER_SYSTEM_NAME
  }

  return resolveCreatedByDisplayName(userIdentifier, userInfo)
}

function resolveCreatedUserName(
  activeRun: PayrollRun,
  userInfo?: UserInfoProps,
  locallyCreatedRunMeta?: { runId: string; userName: string; createdAt: string } | null
): string {
  if (activeRun.createdBy) {
    return resolveCreatedByDisplayName(activeRun.createdBy, userInfo)
  }

  if (locallyCreatedRunMeta?.runId === activeRun.id) {
    return locallyCreatedRunMeta.userName
  }

  return DEFAULT_AUDIT_USER_SYSTEM_NAME
}

function buildCreatedAuditEvent(
  activeRun: PayrollRun,
  userInfo?: UserInfoProps,
  locallyCreatedRunMeta?: { runId: string; userName: string; createdAt: string } | null
): AuditEvent | null {
  const localCreatedAt = locallyCreatedRunMeta?.runId === activeRun.id ? locallyCreatedRunMeta.createdAt : null
  const createdTimestamp = activeRun.createdAt || localCreatedAt

  if (!createdTimestamp) {
    return null
  }

  return {
    id: `audit-created-${activeRun.id}`,
    eventType: 'payroll_run_created',
    description: `Payroll run created`,
    userId: '',
    userName: resolveCreatedUserName(activeRun, userInfo, locallyCreatedRunMeta),
    timestamp: createdTimestamp
  }
}

function buildPreparedAuditEvent(activeRun: PayrollRun): AuditEvent | null {
  if (!activeRun.preparedBy || !activeRun.preparedAt) {
    return null
  }

  return {
    id: `audit-prepared-${activeRun.id}`,
    eventType: 'marked_ready',
    description: `Marked as ready for review`,
    userId: '',
    userName: activeRun.preparedBy,
    timestamp: activeRun.preparedAt
  }
}

function buildReviewedAuditEvent(activeRun: PayrollRun): AuditEvent | null {
  if (!activeRun.reviewedBy || !activeRun.reviewedAt) {
    return null
  }

  const decision = activeRun.approvalDecision || ''
  const comment = activeRun.reviewComment ? `: ${activeRun.reviewComment}` : ''

  return {
    id: `audit-reviewed-${activeRun.id}`,
    eventType: decision === 'APPROVED' ? 'review_approved' : 'review_rejected',
    description: `${decision}${comment}`,
    userId: '',
    userName: activeRun.reviewedBy,
    timestamp: activeRun.reviewedAt
  }
}

function buildExportAuditEvent(activeRun: PayrollRun, userInfo?: UserInfoProps): AuditEvent | null {
  const hasExportedStatus = activeRun.status === 'PAYROLL_EXPORTED' || activeRun.status === 'PAYROLL_CLOSED'
  if (!hasExportedStatus || !activeRun.updatedAt) {
    return null
  }

  return {
    id: `audit-export-${activeRun.id}`,
    eventType: 'export_generated',
    description: 'Export generated',
    userId: '',
    userName: resolveBackendUserDisplayName(activeRun.updatedBy ?? null, userInfo),
    timestamp: activeRun.updatedAt
  }
}

function isAuditEvent(event: AuditEvent | null): event is AuditEvent {
  return event !== null
}

function buildPersistedAuditEvents(
  activeRun: PayrollRun,
  userInfo?: UserInfoProps,
  locallyCreatedRunMeta?: { runId: string; userName: string; createdAt: string } | null
): AuditEvent[] {
  const persisted = [
    buildCreatedAuditEvent(activeRun, userInfo, locallyCreatedRunMeta),
    buildPreparedAuditEvent(activeRun),
    buildReviewedAuditEvent(activeRun),
    buildExportAuditEvent(activeRun, userInfo)
  ].filter(isAuditEvent)

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
  const [locallyCreatedRunMeta, setLocallyCreatedRunMeta] = useState<{
    runId: string
    userName: string
    createdAt: string
  } | null>(null)

  useEffect(() => {
    setPayrollRun(activeRun)
    if (activeRun) {
      setAuditEvents(buildPersistedAuditEvents(activeRun, userInfo, locallyCreatedRunMeta))
    } else {
      setAuditEvents([])
    }
  }, [activeRun, userInfo, locallyCreatedRunMeta])

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
        setLocallyCreatedRunMeta({
          runId: created.id,
          userName: getUserDisplayName(userInfo),
          createdAt: created.createdAt || new Date().toISOString()
        })
        return created
      } catch (err) {
        console.error('[usePayrollRun] Failed to create payroll run:', err)
        setError(err instanceof Error ? err : new Error('Failed to create payroll run'))
        return null
      } finally {
        setSaving(false)
      }
    },
    [accessToken, restClient, companyId, country, userInfo]
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
        await refetchRun()
      } catch (err) {
        console.error('[usePayrollRun] Failed to update status:', err)
        setError(err instanceof Error ? err : new Error('Failed to update payroll run status'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, restClient, accessToken, userInfo, refetchRun]
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
      await refetchRun()
    } catch (err) {
      console.error('[usePayrollRun] Failed to mark ready:', err)
      setError(err instanceof Error ? err : new Error('Failed to mark ready for review'))
    } finally {
      setSaving(false)
    }
  }, [payrollRun, restClient, userInfo, refetchRun])

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
        await refetchRun()
      } catch (err) {
        console.error('[usePayrollRun] Failed to submit review:', err)
        setError(err instanceof Error ? err : new Error('Failed to submit review'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, restClient, userInfo, refetchRun]
  )

  const recordExport = useCallback(() => {}, [])

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
