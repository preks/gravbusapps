import { useCallback, useMemo, useState } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver'
import { env } from '@/common/env/EnvUtils'
import type { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import type { SkillFormValues } from '../types'

type SkillApprovalDecision = 'approved' | 'rejected'

function resolveSkillVersion(version?: number | null): number {
  if (typeof version === 'number') {
    return version
  }

  return 0
}

function buildSkillUpdatePayload(id: string, values: Partial<SkillFormValues>) {
  const skillPayload: Record<string, unknown> = {
    id,
    version: resolveSkillVersion(values.version),
    name: values.name,
    description: values.description,
    levelScale: values.levelScale,
    mandatory: values.mandatory
  }

  if ('activeFrom' in values) {
    skillPayload.activeFrom = values.activeFrom
  }

  if ('activeTo' in values) {
    skillPayload.activeTo = values.activeTo
  }

  if ('categoryId' in values) {
    skillPayload.category = values.categoryId ? { id: values.categoryId } : null
  }

  return skillPayload
}

function buildTaskCompletionUrl(task: FlowExecutionTask, userId?: string): string {
  const taskWithSourceMetadata = task as FlowExecutionTask & { sourceMetadata?: { endpoint?: string | null } }
  const taskEndpoint = task.endpoint ?? taskWithSourceMetadata.sourceMetadata?.endpoint

  if (!taskEndpoint) {
    throw new Error('Approval task endpoint is missing')
  }

  const origin =
    typeof globalThis !== 'undefined' && globalThis.location?.origin ? globalThis.location.origin : 'http://localhost'
  const configuredBaseUrl = env('NEXT_PUBLIC_BASE_URL') || origin
  const baseUrl = configuredBaseUrl.startsWith('/') ? `${origin}${configuredBaseUrl}` : configuredBaseUrl
  let taskPath = taskEndpoint
  if (!taskEndpoint.startsWith('http') && !taskEndpoint.startsWith('/')) {
    taskPath = `/${taskEndpoint}`
  }

  const completionUrl = taskEndpoint.startsWith('http') ? new URL(taskEndpoint) : new URL(taskPath, baseUrl)

  completionUrl.searchParams.set('phase', 'complete')

  if (userId) {
    completionUrl.searchParams.set('user', userId)
  }

  return completionUrl.toString()
}

export function useSkillMutations(accessToken: string) {
  const restClient = useRestClient(EMPLOYEES_API_URL)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)

  const getHeaders = useCallback(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const createSkill = useCallback(
    async (values: SkillFormValues) => {
      setCatalogLoading(true)
      try {
        const result = await restClient.post(
          '/saveSkill',
          {
            changeMode: 'INSERT',
            skill: {
              name: values.name,
              description: values.description || null,
              mandatory: values.mandatory ?? false,
              category: values.categoryId ? { id: values.categoryId } : null
            }
          },
          { headers: getHeaders() }
        )
        return result
      } finally {
        setCatalogLoading(false)
      }
    },
    [restClient, getHeaders]
  )

  const updateSkill = useCallback(
    async (id: string, values: Partial<SkillFormValues>) => {
      setCatalogLoading(true)
      try {
        const result = await restClient.post(
          '/saveSkill',
          {
            changeMode: 'UPDATE',
            skill: buildSkillUpdatePayload(id, values)
          },
          { headers: getHeaders() }
        )
        return result
      } finally {
        setCatalogLoading(false)
      }
    },
    [restClient, getHeaders]
  )

  const deleteSkill = useCallback(
    async (id: string, version?: number | null) => {
      setCatalogLoading(true)
      try {
        const result = await restClient.post(
          '/saveSkill',
          { changeMode: 'DELETE', skill: { id, version: resolveSkillVersion(version) } },
          { headers: getHeaders() }
        )
        return result
      } finally {
        setCatalogLoading(false)
      }
    },
    [restClient, getHeaders]
  )

  const completeEmployeeSkillApproval = useCallback(
    async (task: FlowExecutionTask, approval: SkillApprovalDecision, userId?: string) => {
      setApprovalLoading(true)
      try {
        const response = await fetch(buildTaskCompletionUrl(task, userId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getHeaders()
          },
          body: JSON.stringify({ approval })
        })

        if (!response.ok) {
          const responseText = await response.text()
          throw new Error(
            `Failed to complete skill approval task: ${response.status} ${response.statusText} ${responseText}`
          )
        }

        return response.status === 204 ? null : response.json()
      } finally {
        setApprovalLoading(false)
      }
    },
    [getHeaders]
  )

  const approveEmployeeSkill = useCallback(
    (task: FlowExecutionTask, userId?: string) => completeEmployeeSkillApproval(task, 'approved', userId),
    [completeEmployeeSkillApproval]
  )

  const rejectEmployeeSkill = useCallback(
    (task: FlowExecutionTask, userId?: string) => completeEmployeeSkillApproval(task, 'rejected', userId),
    [completeEmployeeSkillApproval]
  )

  return useMemo(
    () => ({
      createSkill,
      updateSkill,
      deleteSkill,
      approveEmployeeSkill,
      rejectEmployeeSkill,
      isLoading: catalogLoading || approvalLoading,
      isCatalogLoading: catalogLoading,
      isApprovalLoading: approvalLoading
    }),
    [createSkill, updateSkill, deleteSkill, approveEmployeeSkill, rejectEmployeeSkill, catalogLoading, approvalLoading]
  )
}
