import { useEffect, useCallback, useState, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { GET_PAYROLL_RUN, INSERT_PAYROLL_RUN, UPDATE_PAYROLL_RUN } from '../queries/payrollQueries'
import type { PayrollRun, PayrollRunStatus, PayrollCountry, SignOffData, AuditEvent } from '../types/payrollTypes'

function getUserDisplayName(userInfo?: UserInfoProps): string {
  if (!userInfo) return 'System'
  const empDetails = userInfo.employeeDetails
  if (empDetails?.displayName) return empDetails.displayName
  if (empDetails?.firstName && empDetails?.lastName) return `${empDetails.firstName} ${empDetails.lastName}`
  if (userInfo.givenName && userInfo.familyName) return `${userInfo.givenName} ${userInfo.familyName}`
  return userInfo.userName || 'Unknown'
}

interface UsePayrollRunResult {
  payrollRun: PayrollRun | null
  loading: boolean
  error: Error | null
  saving: boolean
  auditEvents: AuditEvent[]
  createRun: () => Promise<PayrollRun | null>
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
  month: number,
  year: number,
  country: PayrollCountry | null,
  userInfo?: UserInfoProps
): UsePayrollRunResult {
  const client = useGraphqlClient(accessToken)
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [saving, setSaving] = useState(false)
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const fetchedKeyRef = useRef<string>('')

  const addAuditEvent = useCallback(
    (eventType: string, description: string) => {
      setAuditEvents(prev => [createAuditEvent(eventType, description, userInfo), ...prev])
    },
    [userInfo]
  )

  const fetchRun = useCallback(async () => {
    if (!accessToken || !companyId) {
      setPayrollRun(null)
      setLoading(false)
      return
    }

    const key = `${year}-${month}-${companyId}`
    if (fetchedKeyRef.current === key && payrollRun) return
    fetchedKeyRef.current = key

    setLoading(true)
    setError(null)
    setAuditEvents([])

    try {
      const result = await client.request<{ PayrollRun: PayrollRun[] }>(GET_PAYROLL_RUN, {
        year,
        month,
        legalEntityId: companyId
      })
      const existing = result.PayrollRun?.[0] ?? null
      setPayrollRun(existing)
      if (existing) {
        addAuditEvent('payroll_run_loaded', `Loaded existing payroll run (${existing.status})`)
      }
    } catch (err) {
      console.warn('[usePayrollRun] Failed to fetch payroll run, entity may not be tracked yet:', err)
      setPayrollRun(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, companyId, month, year, addAuditEvent, payrollRun])

  useEffect(() => {
    fetchedKeyRef.current = ''
    setPayrollRun(null)
    setAuditEvents([])
    fetchRun()
  }, [companyId, month, year])

  const createRun = useCallback(async (): Promise<PayrollRun | null> => {
    if (!accessToken || !companyId) return null
    setSaving(true)

    const cutOffDate = new Date(year, month - 1, 25).toISOString().split('T')[0]
    const paymentDate = new Date(year, month, 0).toISOString().split('T')[0]
    const displayName = getUserDisplayName(userInfo)

    const input = {
      month,
      year,
      country: country || 'DE',
      legalEntityId: companyId,
      legalEntityName: companyName || '',
      cutOffDate,
      paymentDate,
      status: 'PAYROLL_IN_PROGRESS' as PayrollRunStatus,
      createdBy: displayName
    }

    try {
      const result = await client.request<{ insert_PayrollRun_one: PayrollRun }>(INSERT_PAYROLL_RUN, { run: input })
      const created = result.insert_PayrollRun_one
      setPayrollRun(created)
      addAuditEvent(
        'payroll_run_created',
        `Payroll run created for ${companyName} — ${year}-${String(month).padStart(2, '0')}`
      )
      return created
    } catch (err) {
      console.error('[usePayrollRun] Failed to create payroll run:', err)
      setError(err instanceof Error ? err : new Error('Failed to create payroll run'))
      return null
    } finally {
      setSaving(false)
    }
  }, [accessToken, client, companyId, companyName, month, year, country, userInfo, addAuditEvent])

  const updateStatus = useCallback(
    async (status: PayrollRunStatus) => {
      if (!payrollRun) return
      setSaving(true)

      try {
        const result = await client.request<{ update_PayrollRun: { returning: PayrollRun[] } }>(UPDATE_PAYROLL_RUN, {
          id: payrollRun.id,
          version: payrollRun.version,
          changes: {
            status,
            updatedBy: getUserDisplayName(userInfo),
            updatedAt: new Date().toISOString()
          }
        })
        const updated = result.update_PayrollRun.returning[0]
        if (updated) {
          setPayrollRun(updated)
          addAuditEvent('status_changed', `Status changed to ${status}`)
        }
      } catch (err) {
        console.error('[usePayrollRun] Failed to update status:', err)
        setError(err instanceof Error ? err : new Error('Failed to update payroll run status'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, client, userInfo, addAuditEvent]
  )

  const signOff = useCallback(
    async (data: SignOffData) => {
      if (!payrollRun) return
      setSaving(true)

      const displayName = getUserDisplayName(userInfo)
      const changes: Record<string, unknown> = {
        updatedBy: displayName,
        updatedAt: new Date().toISOString()
      }

      if (data.preparedBy) {
        changes.preparedBy = data.preparedBy
        changes.preparedAt = data.preparedAt || new Date().toISOString()
      }
      if (data.reviewedBy) {
        changes.reviewedBy = data.reviewedBy
        changes.reviewedAt = data.reviewedAt || new Date().toISOString()
      }
      if (data.comments) {
        changes.reviewComment = data.comments
      }
      if (data.approvalDecision) {
        changes.approvalDecision = data.approvalDecision
        if (data.approvalDecision === 'approved') {
          changes.status = 'PAYROLL_APPROVED_FOR_EXPORT'
        }
      }

      try {
        const result = await client.request<{ update_PayrollRun: { returning: PayrollRun[] } }>(UPDATE_PAYROLL_RUN, {
          id: payrollRun.id,
          version: payrollRun.version,
          changes
        })
        const updated = result.update_PayrollRun.returning[0]
        if (updated) {
          setPayrollRun(updated)
          addAuditEvent(
            'signoff_completed',
            `Sign-off by ${data.reviewedBy || data.preparedBy}: ${data.approvalDecision || 'prepared'}`
          )
        }
      } catch (err) {
        console.error('[usePayrollRun] Failed to sign off:', err)
        setError(err instanceof Error ? err : new Error('Failed to complete sign-off'))
      } finally {
        setSaving(false)
      }
    },
    [payrollRun, client, userInfo, addAuditEvent]
  )

  const recordExport = useCallback(
    (mode: string, count: number) => {
      addAuditEvent('export_generated', `Export generated: ${mode}, ${count} employees`)
    },
    [addAuditEvent]
  )

  const refetch = useCallback(async () => {
    fetchedKeyRef.current = ''
    await fetchRun()
  }, [fetchRun])

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
    refetch
  }
}
