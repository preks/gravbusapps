import React, { useEffect, useMemo, useReducer, useState } from 'react'
import { Alert, Spinner } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowDetailView } from '@/common/components/flow/flow-detail'
import {
  isRealFlowTaskId,
  parseSyntheticTriggerFlowId
} from '@/common/components/flow/flow-detail/flowDetailShareLinks'
import { useFlowProgressClient } from '@/common/network/flows/useFlowProgressClient'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

interface FlowDetailProps extends BusinessAppContextProps {
  'data-testid'?: string
}

function getFlowDetailUrlParams(): { flowId: string | null; taskId: string | null } {
  if (typeof window === 'undefined') {
    return { flowId: null, taskId: null }
  }

  const urlParams = new URLSearchParams(window.location.search)
  const flowId = urlParams.get('flowId')?.trim() ?? ''
  const taskId = urlParams.get('taskId')?.trim() ?? ''

  return {
    flowId: flowId || null,
    taskId: taskId || null
  }
}

function resolveFlowIdFromTask(task: { flowId?: string; workflowMeta?: { rootWorkflowId?: string } }): string | null {
  return task.flowId?.trim() || task.workflowMeta?.rootWorkflowId?.trim() || null
}

export const FlowDetail: React.FC<FlowDetailProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-detail'
}) => {
  const [urlTick, bumpUrl] = useReducer((n: number) => n + 1, 0)
  const [resolvedFlowId, setResolvedFlowId] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolvingFlowId, setIsResolvingFlowId] = useState(false)
  const { getTask } = useFlowProgressClient({ accessToken, userInfo })

  useEffect(() => {
    const onPopState = () => bumpUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const { flowId: urlFlowId, taskId: focusTaskId } = useMemo(() => {
    void urlTick
    return getFlowDetailUrlParams()
  }, [urlTick])

  useEffect(() => {
    if (urlFlowId) {
      setResolvedFlowId(null)
      setResolveError(null)
      setIsResolvingFlowId(false)
      return
    }

    if (!focusTaskId) {
      setResolvedFlowId(null)
      setResolveError(null)
      setIsResolvingFlowId(false)
      return
    }

    const syntheticFlowId = parseSyntheticTriggerFlowId(focusTaskId)
    if (syntheticFlowId) {
      setResolvedFlowId(syntheticFlowId)
      setResolveError(null)
      setIsResolvingFlowId(false)
      return
    }

    if (!isRealFlowTaskId(focusTaskId)) {
      setResolvedFlowId(null)
      setResolveError('The task ID in the URL is not valid.')
      setIsResolvingFlowId(false)
      return
    }

    const userId = userInfo?.id?.trim()
    if (!userId) {
      setResolvedFlowId(null)
      setResolveError('User information is missing. Cannot resolve the flow for this task.')
      setIsResolvingFlowId(false)
      return
    }

    let cancelled = false
    setIsResolvingFlowId(true)
    setResolveError(null)
    setResolvedFlowId(null)

    void getTask(focusTaskId, userId)
      .then(task => {
        if (cancelled) return
        const flowId = resolveFlowIdFromTask(task)
        if (!flowId) {
          setResolveError('Could not determine the flow for this task.')
          return
        }
        setResolvedFlowId(flowId)
      })
      .catch(() => {
        if (cancelled) return
        setResolveError('Could not load the task. It may not exist or you may not have access.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingFlowId(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [focusTaskId, getTask, urlFlowId, userInfo?.id])

  const flowId = urlFlowId ?? resolvedFlowId

  const handleBack = () => {
    navigateTo(buildPlatformUrl(Navigation.FLOW_LAUNCHER, { tab: 'my-launches' }))
  }

  if (!accessToken) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:p-6">
        <Alert variant="destructive" data-testid={`${testId}-no-token`}>
          <div className="gba:space-y-2">
            <div className="gba:font-medium">Access token missing</div>
            <div className="gba:text-sm">You must be authenticated to view flow details.</div>
          </div>
        </Alert>
      </div>
    )
  }

  if (isResolvingFlowId) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:gap-2 gba:p-6 gba:text-sm gba:text-muted-foreground">
        <Spinner className="gba:h-5 gba:w-5" />
        Loading flow details...
      </div>
    )
  }

  if (resolveError) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:p-6">
        <Alert variant="destructive" data-testid={`${testId}-resolve-error`}>
          <div className="gba:space-y-2">
            <div className="gba:font-medium">Could not open this link</div>
            <div className="gba:text-sm">{resolveError}</div>
          </div>
        </Alert>
      </div>
    )
  }

  if (!flowId) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:p-6">
        <Alert variant="destructive" data-testid={`${testId}-no-flow-id`}>
          <div className="gba:space-y-2">
            <div className="gba:font-medium">Flow ID missing</div>
            <div className="gba:text-sm">Provide a flow ID or a task ID in the URL.</div>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <FlowDetailView
      flowId={flowId}
      focusTaskId={focusTaskId ?? undefined}
      accessToken={accessToken}
      userInfo={userInfo}
      showBackButton={true}
      layoutVariant="unified"
      onBack={handleBack}
      data-testid={testId}
    />
  )
}

export default FlowDetail
