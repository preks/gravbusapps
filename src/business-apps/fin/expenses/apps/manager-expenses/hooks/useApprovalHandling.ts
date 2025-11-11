import { useState } from 'react'
import { ApprovalRequest } from '../types'
import { createApprovalPayload } from '../utils/approvalPayloadCreator'
import { getTabByKey } from '../constants/approvalTabs'
import { env } from '@/common/env/EnvUtils'
import { toast } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UseApprovalHandlingProps {
  selectedTasks: ApprovalRequest[]
  setSelectedTasks: (tasks: ApprovalRequest[]) => void
  rawTasks: any[]
  tabKey: string
  userInfo: any
  accessToken: string
  onApprovalSuccess?: () => void // Callback after successful approval
}

export const useApprovalHandling = ({
  selectedTasks,
  setSelectedTasks,
  rawTasks,
  tabKey,
  userInfo,
  accessToken,
  onApprovalSuccess
}: UseApprovalHandlingProps) => {
  const [isApproving, setIsApproving] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>(0)
  const [totalToApprove, setTotalToApprove] = useState<number>(0)

  // Small delay between sequential requests to avoid backend concurrency conflicts
  const sequentialDelayMs = 150
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Helpers to reduce cognitive complexity
  const getDomainForTab = (key: string): string =>
    key === 'transfer-payment' || key === 'handout-payment' ? 'cs-selgros' : 'employee-expense'

  const extractProcessInstanceId = (
    originalTask: any,
    processName: string,
    tabKeyLocal: string
  ): string | undefined => {
    if (originalTask?.processInstanceId) return originalTask.processInstanceId
    if (!originalTask?.endpoint) return undefined
    const parts: string[] = String(originalTask.endpoint).split('/')
    if (tabKeyLocal === 'handout-payment') {
      const idx = parts.indexOf('payAdvancePayment')
      if (idx === -1) return undefined
      return parts[idx + 1]
    }
    const idx = parts.indexOf(processName)
    if (idx === -1) return undefined
    return parts[idx + 1]
  }

  type RequestContext = {
    baseUrl: string
    domain: string
    processName: string
    processInstanceId: string
    taskName: string
    taskInstanceId: string
    userId: string
    tabKeyLocal: string
  }

  const buildGetUrl = (ctx: RequestContext): string => {
    if (ctx.tabKeyLocal === 'handout-payment') {
      return `${ctx.baseUrl}/processes/${ctx.domain}/payAdvancePayment/${ctx.processInstanceId}/${ctx.taskName}/${ctx.taskInstanceId}?user=${ctx.userId}`
    }
    return `${ctx.baseUrl}/processes/${ctx.domain}/${ctx.processName}/${ctx.processInstanceId}/${ctx.taskName}/${ctx.taskInstanceId}?user=${ctx.userId}`
  }

  const buildPostUrl = (ctx: RequestContext): string => {
    if (ctx.tabKeyLocal === 'handout-payment') {
      return `${ctx.baseUrl}/processes/${ctx.domain}/payAdvancePayment/${ctx.processInstanceId}/${ctx.taskName}/${ctx.taskInstanceId}?phase=complete&user=${ctx.userId}`
    }
    return `${ctx.baseUrl}/processes/${ctx.domain}/${ctx.processName}/${ctx.processInstanceId}/${ctx.taskName}/${ctx.taskInstanceId}?phase=complete&user=${ctx.userId}`
  }

  const extractEntityIdFromTaskData = (tabKeyLocal: string, taskData: any): string | undefined => {
    const p = taskData?.parameters
    if (!p) return undefined
    switch (tabKeyLocal) {
      case 'advance-payment':
        return p.advancePayment?.id
      case 'expense-request':
        return p.expenseRequest?.id || p.request?.id || p.expenseRequestId
      case 'expense-plan':
        return p.expensePlan?.id || p.plan?.id || p.expensePlanId
      case 'handout-payment':
        return p.advancePayment?.id
      case 'transfer-payment':
        return p.transferPayment?.id || p.advancePayment?.id // Prefer transferPayment id, fallback for legacy payloads
      default:
        return undefined
    }
  }

  const applyEntityIdToPayload = (tabKeyLocal: string, payload: any, entityId: string) => {
    const updated = { ...payload }
    if (tabKeyLocal === 'advance-payment' && updated.advancePaymentComment) {
      updated.advancePaymentComment.advancePayment = entityId
    } else if (tabKeyLocal === 'expense-request' && updated.expenseRequestComment) {
      updated.expenseRequestComment.expenseRequest = entityId
    } else if (tabKeyLocal === 'expense-plan' && updated.expensePlanComment) {
      updated.expensePlanComment.expensePlan = entityId
    } else if (tabKeyLocal === 'handout-payment' && updated.handoutPaymentComment) {
      updated.handoutPaymentComment.handoutPayment = entityId
    } else if (tabKeyLocal === 'transfer-payment' && updated.transferPaymentComment) {
      updated.transferPaymentComment.transferPayment = entityId
    }
    return updated
  }

  const fetchEntityIdIfNeeded = async (
    selectedTask: ApprovalRequest | undefined,
    ctx: RequestContext
  ): Promise<string> => {
    if (selectedTask?.entityId) return selectedTask.entityId

    const getUrl = buildGetUrl(ctx)

    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    })
    if (!getResponse.ok) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:network.get_failed',
          `GET request failed: ${getResponse.status} ${getResponse.statusText}`
        )
      )
    }
    const taskData = await getResponse.json()
    const entityId = extractEntityIdFromTaskData(ctx.tabKeyLocal, taskData)
    if (!entityId) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:approvals.entity_id_missing',
          `Could not find entity ID in task data for ${ctx.tabKeyLocal}`
        )
      )
    }
    return entityId
  }

  const approveSingleTask = async (
    task: ApprovalRequest,
    tabConfig: any,
    approvalPayload: any
  ): Promise<{ ok: boolean; error?: string }> => {
    const originalTask = rawTasks.find(t => t.id === task.id)
    if (!originalTask) {
      return {
        ok: false,
        error: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approvals.could_not_find_task_data',
          `Could not find original task data for ${task.id}`
        )
      }
    }

    const domain = getDomainForTab(tabConfig.key)
    const processName = tabConfig.processName
    const taskInstanceId = task.id
    const taskName = originalTask.name || 'approveTask'
    const userId = userInfo?.id
    if (!userId)
      return {
        ok: false,
        error: getTranslationFromI18nKeyAndLabel('lowcoder:common.user_id_not_available', 'User ID not available')
      }

    let processInstanceId = extractProcessInstanceId(originalTask, processName, tabConfig.key)
    if (!processInstanceId) processInstanceId = task.id
    if (!processInstanceId)
      return {
        ok: false,
        error: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approvals.process_instance_missing',
          'Process instance ID not available'
        )
      }

    const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
    const selectedTask = selectedTasks.find(t => t.id === taskInstanceId)
    const ctx: RequestContext = {
      baseUrl,
      domain,
      processName,
      processInstanceId,
      taskName,
      taskInstanceId,
      userId,
      tabKeyLocal: tabConfig.key
    }
    const entityId = await fetchEntityIdIfNeeded(selectedTask, ctx)

    const updatedPayload = applyEntityIdToPayload(tabConfig.key, approvalPayload, entityId)
    const postUrl = buildPostUrl(ctx)

    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(updatedPayload)
    })
    if (!postResponse.ok) {
      const responseText = await postResponse.text()
      return {
        ok: false,
        error: getTranslationFromI18nKeyAndLabel(
          'lowcoder:network.post_failed',
          `POST request failed: ${postResponse.status} - ${postResponse.statusText} - ${responseText}`
        )
      }
    }
    await postResponse.json()
    await delay(sequentialDelayMs)
    return { ok: true }
  }

  // --- Small helpers to reduce cognitive complexity in handleApproveClick ---
  const validatePreconditions = (tasks: ApprovalRequest[], key: string, user: any) => {
    if (tasks.length === 0) {
      return {
        error: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expenses_landing_page.select_task_to_approve',
          'Please select at least one task to approve'
        )
      } as const
    }

    const cfg = getTabByKey(key)
    if (!cfg || !user) {
      return {
        error: getTranslationFromI18nKeyAndLabel(
          'lowcoder:common.configuration_missing',
          'Missing configuration or user information'
        )
      } as const
    }
    return { tabConfig: cfg } as const
  }

  const showSummaryToasts = (approvedCount: number, failedTasks: Array<{ id: string; error: string }>) => {
    if (approvedCount > 0 && failedTasks.length === 0) {
      toast.success(getTranslationFromI18nKeyAndLabel('lowcoder:approvals.approval_completed', 'Approval completed'), {
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approvals.approved_successfully_count',
          `${approvedCount} task${approvedCount > 1 ? 's' : ''} approved successfully`
        ),
        duration: 4000
      })
      return
    }

    if (approvedCount > 0 && failedTasks.length > 0) {
      toast.success(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:approvals.partial_approval_completed',
          'Partial approval completed'
        ),
        {
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:approvals.partial_approval_summary',
            `${approvedCount} approved · ${failedTasks.length} failed`
          ),
          duration: 5000
        }
      )
      return
    }

    if (approvedCount === 0 && failedTasks.length > 0) {
      const first = failedTasks[0]
      const more = failedTasks.length - 1
      const details = more > 0 ? `${first.error} (+${more} more)` : first.error
      setApprovalError(details)
      toast.error(getTranslationFromI18nKeyAndLabel('lowcoder:approvals.all_failed', 'All approvals failed'), {
        description: getTranslationFromI18nKeyAndLabel('lowcoder:approvals.error_details', details),
        duration: 6000
      })
    }
  }

  // Helper: Process all selected tasks sequentially
  const processSelectedTasks = async (
    tasks: ApprovalRequest[],
    tabConfig: any,
    approvalPayload: any
  ): Promise<{ approvedCount: number; failedTasks: Array<{ id: string; error: string }> }> => {
    let approvedCount = 0
    const failedTasks: Array<{ id: string; error: string }> = []

    for (const task of tasks) {
      try {
        const result = await approveSingleTask(task, tabConfig, approvalPayload)
        if (result.ok) {
          approvedCount += 1
        } else {
          failedTasks.push({ id: task.id, error: result.error || 'Unknown error' })
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('lowcoder:approvals.unknown_error', 'Unknown error')
        failedTasks.push({ id: task.id, error: errorMessage })
      } finally {
        setCurrentProgressIndex(prev => prev + 1)
      }
    }

    return { approvedCount, failedTasks }
  }

  // Helper: Handle post-approval cleanup and refresh
  const handlePostApproval = async (approvedCount: number) => {
    setSelectedTasks([])
    setApprovalError(null)

    if (approvedCount > 0 && onApprovalSuccess) {
      // Add delay for transfer-payment to allow backend processing time
      if (tabKey === 'transfer-payment') {
        await delay(500)
      }
      onApprovalSuccess()
    }
  }

  const handleApproveClick = async () => {
    const validation = validatePreconditions(selectedTasks, tabKey, userInfo)
    if ('error' in validation) return { error: validation.error }
    const tabConfig = validation.tabConfig

    setIsApproving(true)
    setApprovalError(null)

    try {
      const approvalPayload = createApprovalPayload(
        selectedTasks,
        tabConfig,
        '', // No message since we removed the dialog
        userInfo,
        rawTasks
      )
      setTotalToApprove(selectedTasks.length)
      setCurrentProgressIndex(0)

      const { approvedCount, failedTasks } = await processSelectedTasks(selectedTasks, tabConfig, approvalPayload)

      await handlePostApproval(approvedCount)
      showSummaryToasts(approvedCount, failedTasks)

      return { success: true, approvedCount, failedCount: failedTasks.length }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('lowcoder:approvals.failed_to_approve', 'Failed to approve tasks')
      setApprovalError(errorMessage)

      toast.error(getTranslationFromI18nKeyAndLabel('lowcoder:approvals.approval_failed', 'Approval failed'), {
        description: getTranslationFromI18nKeyAndLabel('lowcoder:approvals.error_details', errorMessage),
        duration: 5000
      })

      return { error: errorMessage }
    } finally {
      setIsApproving(false)
      setCurrentProgressIndex(0)
      setTotalToApprove(0)
    }
  }

  return {
    isApproving,
    approvalError,
    setApprovalError,
    handleApproveClick,
    progress: { current: currentProgressIndex, total: totalToApprove }
  }
}
