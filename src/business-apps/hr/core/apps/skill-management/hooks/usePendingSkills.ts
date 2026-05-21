import { useState, useEffect, useCallback } from 'react'
import { FlowExecutionTask, FlowMetricsClient } from '@/common/network/flow-metrics/FlowMetricsClient'
import type { EmployeeSkillRecord } from '../types'

function isOpenTask(task: FlowExecutionTask): boolean {
  const state = (task.state || task.status || '').toUpperCase()
  return state !== 'COMPLETED' && state !== 'CLOSED' && state !== 'CANCELLED' && state !== 'ABORTED'
}

function getNewSkillNames(task: FlowExecutionTask): string[] {
  const sourceMetadata = task as FlowExecutionTask & {
    sourceMetadata?: { inputs?: { employeeSkillAssignmentRequest?: { newSkills?: Array<{ name?: string | null }> } } }
  }
  const inputs = task.inputs as
    | {
        employeeSkills?: { newSkills?: Array<{ name?: string | null }> }
        employeeSkillAssignmentRequest?: { newSkills?: Array<{ name?: string | null }> }
      }
    | undefined
  const variables = task.variables as
    | {
        employeeSkills?: { newSkills?: Array<{ name?: string | null }> }
        employeeSkillAssignmentRequest?: { newSkills?: Array<{ name?: string | null }> }
      }
    | undefined
  const newSkills =
    inputs?.employeeSkillAssignmentRequest?.newSkills ??
    inputs?.employeeSkills?.newSkills ??
    variables?.employeeSkillAssignmentRequest?.newSkills ??
    variables?.employeeSkills?.newSkills ??
    sourceMetadata.sourceMetadata?.inputs?.employeeSkillAssignmentRequest?.newSkills ??
    []

  return newSkills
    .map(skill => skill.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

function mapApproveNewSkillTaskToPendingSkill(task: FlowExecutionTask): EmployeeSkillRecord {
  const skillName = getNewSkillNames(task).join(', ') || task.referenceName || task.name || 'Approve new skill'
  const sourceMetadata = task as FlowExecutionTask & {
    sourceMetadata?: {
      creatorName?: string | null
      creatorUserId?: string | null
      endpoint?: string | null
      lastUpdate?: string | null
    }
  }
  const requesterName =
    task.creatorName || sourceMetadata.sourceMetadata?.creatorName || task.ownerName || task.actualOwner || '-'
  const creatorUserId = task.creatorUserId || sourceMetadata.sourceMetadata?.creatorUserId || null
  const normalizedTask = {
    ...task,
    endpoint: task.endpoint ?? sourceMetadata.sourceMetadata?.endpoint ?? undefined,
    creatorName: task.creatorName ?? sourceMetadata.sourceMetadata?.creatorName ?? undefined,
    creatorUserId: task.creatorUserId ?? sourceMetadata.sourceMetadata?.creatorUserId ?? undefined,
    lastUpdate: task.lastUpdate ?? sourceMetadata.sourceMetadata?.lastUpdate ?? undefined
  }

  return {
    id: task.id,
    businessKey: task.customFlowId ?? task.processInstanceId ?? null,
    processInstanceId: task.processInstanceId ?? null,
    flowTask: normalizedTask,
    flowTaskLookupStatus: 'found',
    employeeSkillStatus: 'PENDING_SKILL_STATUS',
    isDeleted: false,
    createdAt: task.started ?? task.createdAt ?? normalizedTask.lastUpdate ?? null,
    employee: {
      id: creatorUserId ?? task.actualOwner ?? task.id,
      displayName: requesterName,
      firstName: requesterName,
      lastName: null,
      pictureThumbnail: null,
      userId: creatorUserId ?? task.actualOwner ?? null
    },
    skill: {
      id: task.id,
      name: skillName,
      description: task.description ?? null
    }
  }
}

export function usePendingSkills(accessToken?: string, userId?: string) {
  const [pendingSkills, setPendingSkills] = useState<EmployeeSkillRecord[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPending = useCallback(async () => {
    if (!accessToken) return
    setError(null)
    try {
      const flowMetricsClient = new FlowMetricsClient(accessToken)
      const response = await flowMetricsClient.getFlowExecutionTasks({
        cockpitPage: 'INBOX',
        size: 50,
        page: 0,
        field: 'CREATION_DATE',
        direction: 'DESC',
        filterTaskName: 'approveNewSkills',
        ...(userId ? { userId } : {})
      })

      const tasks = (response.processingStates ?? response.content ?? []).filter(isOpenTask)
      const pendingSkills = tasks.map(mapApproveNewSkillTaskToPendingSkill)

      setPendingSkills(pendingSkills)
      setTotalPending(pendingSkills.length)
    } catch (err) {
      console.error('[usePendingSkills] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to load pending skills'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, userId])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  return {
    pendingSkills,
    totalPending,
    isLoading,
    error,
    refetch: fetchPending
  }
}
