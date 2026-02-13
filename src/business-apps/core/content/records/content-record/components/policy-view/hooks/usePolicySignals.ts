import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlowTemplateClient } from '@/common/network/flows/FlowTemplateClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export type PolicySignals = {
  experts: number
  flows: number
  acknowledgementCampaigns: number
  approvalCampaigns: number
  latestApprovalStatus: 'none' | 'pending' | 'approved' | 'rejected'
  /** Total approval tasks in the latest approval flow (= number of assignees) */
  approvalTaskCount: number
  /** How many of those approval tasks are already completed */
  approvalCompletedCount: number
  executions: number
}

export const usePolicySignals = (params: { accessToken: string; userId?: string; policyRootId: string }) => {
  const { accessToken, userId, policyRootId } = params
  const promptClient = usePromptManagerClient(accessToken)

  const [signals, setSignals] = useState<PolicySignals>({
    experts: 0,
    flows: 0,
    acknowledgementCampaigns: 0,
    approvalCampaigns: 0,
    latestApprovalStatus: 'none',
    approvalTaskCount: 0,
    approvalCompletedCount: 0,
    executions: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const policyTag = useMemo(() => `policy:${policyRootId}`, [policyRootId])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [expertsRes, flowsRes, acks, execStats] = await Promise.all([
        promptClient.getEveryAIExperts({ tags: [policyTag], limit: 1, offset: 0, returnTotalRecords: true }),
        new FlowTemplateClient(accessToken).getTemplatesList({
          limit: 1,
          offset: 0,
          includeDrafts: true,
          tags: { policyRootId: String(policyRootId) }
        }),
        (async () => {
          if (!userId) return { acks: 0, approvals: 0, approvalTaskCount: 0, approvalCompletedCount: 0 }
          const apiBase = getFlowEngineApiBaseUrl()
          const url = `${apiBase}/flows/user/${userId}/initiated?limit=50&offset=0`
          const response = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            }
          })
          if (!response.ok)
            return {
              acks: 0,
              approvals: 0,
              latestApprovalStatus: 'none' as const,
              approvalTaskCount: 0,
              approvalCompletedCount: 0
            }
          const data = await response.json()
          // Flow Engine response: { status, data: { flows: [...] } }
          const flows: any[] = data?.data?.flows || data?.flows || []
          const policyFlows = flows.filter(f => {
            const tags = f.tags && typeof f.tags === 'object' ? f.tags : {}
            return String(tags.policyRootId || '') === String(policyRootId)
          })
          const acks = policyFlows.filter(f => {
            const tags = f.tags && typeof f.tags === 'object' ? f.tags : {}
            return tags.app === 'policy'
          }).length
          const approvalFlows = policyFlows.filter(f => {
            const tags = f.tags && typeof f.tags === 'object' ? f.tags : {}
            return tags.app === 'policy-approval'
          })
          const approvals = approvalFlows.length

          const mostRecentApproval = approvalFlows.slice().sort((a, b) => {
            const at = new Date(String(a?.updateTime || a?.startTime || a?.updatedAt || a?.createdAt || 0)).getTime()
            const bt = new Date(String(b?.updateTime || b?.startTime || b?.updatedAt || b?.createdAt || 0)).getTime()
            return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0)
          })[0]

          const flowStatus = String(mostRecentApproval?.status || '').toUpperCase()
          const latestApprovalStatus =
            flowStatus === 'RUNNING'
              ? ('pending' as const)
              : flowStatus === 'COMPLETED'
                ? ('approved' as const)
                : flowStatus === 'FAILED'
                  ? ('rejected' as const)
                  : ('none' as const)

          const approvalTaskCount = Number(mostRecentApproval?.totalTasks ?? mostRecentApproval?.stepStatus?.total ?? 0)
          const approvalCompletedCount = Number(
            mostRecentApproval?.completedTasks ?? mostRecentApproval?.stepStatus?.completed ?? 0
          )

          return { acks, approvals, latestApprovalStatus, approvalTaskCount, approvalCompletedCount }
        })(),
        promptClient.getExecutionStats({ policyRootId })
      ])

      setSignals({
        experts: expertsRes.paging?.totalRecords ?? expertsRes.data.length,
        flows: flowsRes.totalCount ?? flowsRes.templates.length,
        acknowledgementCampaigns: acks.acks,
        approvalCampaigns: acks.approvals,
        latestApprovalStatus: acks.latestApprovalStatus ?? 'none',
        approvalTaskCount: acks.approvalTaskCount ?? 0,
        approvalCompletedCount: acks.approvalCompletedCount ?? 0,
        executions: execStats?.total ?? 0
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, policyRootId, policyTag, promptClient, userId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  return { signals, isLoading, error, reload: load }
}
