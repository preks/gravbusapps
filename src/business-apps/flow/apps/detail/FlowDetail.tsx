import React, { useEffect, useMemo, useReducer } from 'react'
import { Alert } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowDetailView } from '@/common/components/flow/flow-detail'
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

export const FlowDetail: React.FC<FlowDetailProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-detail'
}) => {
  const [urlTick, bumpUrl] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const onPopState = () => bumpUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const { flowId, taskId: focusTaskId } = useMemo(() => {
    void urlTick
    return getFlowDetailUrlParams()
  }, [urlTick])

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

  if (!flowId) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center gba:p-6">
        <Alert variant="destructive" data-testid={`${testId}-no-flow-id`}>
          <div className="gba:space-y-2">
            <div className="gba:font-medium">Flow ID missing</div>
            <div className="gba:text-sm">No flow ID was provided in the URL.</div>
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
