import React, { useEffect, useMemo, useReducer } from 'react'
import { Alert } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowDetailView } from '@/common/components/flow/flow-detail'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

interface FlowDetailProps extends BusinessAppContextProps {
  'data-testid'?: string
}

function getFlowIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get('flowId')?.trim() ?? ''
  return id || null
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

  const flowId = useMemo(() => {
    void urlTick
    return getFlowIdFromUrl()
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
      accessToken={accessToken}
      userInfo={userInfo}
      showBackButton={true}
      onBack={handleBack}
      data-testid={testId}
    />
  )
}

export default FlowDetail
