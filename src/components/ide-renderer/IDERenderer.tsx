import React, { useEffect } from 'react'
import { createElement } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { Alert } from '@newwork/nw-design-system'
import { Button } from '@newwork/nw-design-system'
import { useDynamicScreen } from '@/common/hooks/useDynamicScreen'
import { BusinessAppInfo } from '@/components/ide-main-menu'
import { UserInfoProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

// Process event constants
const PSE_ABORT_EVENT = 'pse_abort'
const ABORT_EXIT_STRATEGY = 'abort'

// Dynamic component wrapper that loads components on demand
const DynamicComponentWrapper: React.FC<{
  app: BusinessAppInfo
  userInfo?: UserInfoProps
  accessToken?: string
  additionalData?: { [k: string]: any }
}> = ({ app, userInfo, accessToken, additionalData }) => {
  const { loadScreen, state, getScreenInfo } = useDynamicScreen()

  useEffect(() => {
    loadScreen(app.screenKey)
  }, [app.screenKey, loadScreen])

  if (state.isLoading) {
    const screenInfo = getScreenInfo(app.screenKey)
    const isFromCache = screenInfo?.isCachedGlobally

    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[400px]">
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600 gba:mx-auto"></div>
          <div className="gba:mt-4 gba:text-gray-600">
            {isFromCache ? `Loading ${app.name} from cache...` : `Loading ${app.name}...`}
          </div>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="gba:p-6">
        <Alert className="gba:border-red-200 gba:bg-red-50">
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <h4 className="gba:font-medium gba:text-red-800">Failed to Load Component</h4>
              <div className="gba:mt-2 gba:text-red-700">
                <div>{state.error}</div>
                <div className="gba:mt-2 gba:text-xs gba:text-gray-500">Screen: {app.screenKey}</div>
              </div>
            </div>
            <Button size="sm" onClick={() => loadScreen(app.screenKey)}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  if (state.component) {
    return createElement(state.component, {
      userInfo,
      accessToken,
      additionalData
    })
  }

  return null
}

export interface IDERendererProps {
  selectedApp: BusinessAppInfo | null
  userInfo?: UserInfoProps
  accessToken?: string
  additionalData?: { [k: string]: any }
  onAppSelect: (app: BusinessAppInfo | null) => void
}

export const IDERenderer: React.FC<IDERendererProps> = ({
  selectedApp,
  userInfo,
  accessToken,
  additionalData,
  onAppSelect
}) => {
  // Manage dialog visibility internally based on app type
  const [dialogVisible, setDialogVisible] = React.useState<boolean>(false)

  // Update dialog visibility when selectedApp changes
  React.useEffect(() => {
    if (selectedApp && (selectedApp.type === 'form' || selectedApp.type === 'popup' || selectedApp.type === 'window')) {
      setDialogVisible(true)
    } else {
      setDialogVisible(false)
    }
  }, [selectedApp])

  const handleDialogClose = async () => {
    // Clean up Kogito tasks when dialog closes via X button, ESC, or clicking outside
    // NOTE: This runs on ANY close (X button, ESC, or programmatic)
    // - If form already handled cleanup (via Cancel/Submit), Kogito ignores duplicate requests (idempotent)
    // - If task is completed, abort requests are safely ignored by the platform
    // - If user closed via X/ESC without cleanup, this ensures task cleanup
    // This defensive approach prevents orphaned tasks at the cost of redundant requests
    if (selectedApp && (selectedApp.type === 'form' || selectedApp.type === 'popup' || selectedApp.type === 'window')) {
      try {
        // Extract endpoint from additionalData for Kogito API call
        const processMetadata = additionalData?.psi_processMetadata
        const taskPayload = additionalData?.psi_taskPayload
        const endpoint = processMetadata?.endpoint || taskPayload?.endpoint || (additionalData as any)?.endpoint

        if (endpoint && accessToken) {
          // Extract process instance ID from endpoint
          // Endpoint format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
          // We need: /processes/{domain}/{processName}/{processInstanceId}
          let processInstanceUrl = ''
          const baseUrl = window.location.origin

          try {
            let endpointPath = endpoint
            // Handle full URLs
            if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
              const url = new URL(endpoint)
              endpointPath = url.pathname
            }

            // Split path and extract process instance part
            // /processes/employee/changeCommunication/abc-123-def/Task_1/task-id
            // We want: /processes/employee/changeCommunication/abc-123-def
            const segments = endpointPath.split('/').filter(Boolean)
            if (segments.length >= 4 && segments[0] === 'processes') {
              // Take first 4 segments: processes/{domain}/{processName}/{processInstanceId}
              processInstanceUrl = `/${segments.slice(0, 4).join('/')}`
            } else {
              processInstanceUrl = endpointPath
            }
          } catch {
            // Fallback: use endpoint as is
            processInstanceUrl = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
          }

          const fullUrl = `${baseUrl}${processInstanceUrl}`

          // Make direct HTTP DELETE to abort the Kogito process (same as Cancel button)
          // Fire and forget - don't wait for response to avoid blocking UI close
          fetch(fullUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }).catch(error => {
            // Log error but don't block dialog close
            console.error('Failed to abort Kogito process on dialog close:', error)
          })

          // Also dispatch event for any other listeners (backwards compatibility)
          dispatchProcessContinueEvent(PSE_ABORT_EVENT, {
            event: PSE_ABORT_EVENT,
            pso_exitStrategy: ABORT_EXIT_STRATEGY,
            ...(processMetadata && { psi_processMetadata: processMetadata }),
            ...(taskPayload && { psi_taskPayload: taskPayload }),
            ...(endpoint && { endpoint })
          })
        } else {
          // No endpoint or accessToken - just dispatch event as fallback
          dispatchProcessContinueEvent(PSE_ABORT_EVENT, {
            event: PSE_ABORT_EVENT,
            pso_exitStrategy: ABORT_EXIT_STRATEGY,
            ...(processMetadata && { psi_processMetadata: processMetadata }),
            ...(taskPayload && { psi_taskPayload: taskPayload }),
            ...(endpoint && { endpoint })
          })
        }
      } catch (error) {
        // Log error for observability while still allowing dialog close to proceed
        console.error('Error in handleDialogClose:', error)
      }
    }

    setDialogVisible(false)
    onAppSelect(null) // Clear the selected app when dialog closes
  }

  const renderAppContent = () => {
    if (!selectedApp) return null

    return (
      <DynamicComponentWrapper
        app={selectedApp}
        userInfo={userInfo}
        accessToken={accessToken}
        additionalData={additionalData}
        key={`${selectedApp.screenKey}-${JSON.stringify(userInfo)}-${accessToken}-${JSON.stringify(additionalData)}`}
      />
    )
  }

  // Render app content directly in main area (fills parent)
  if (selectedApp && selectedApp.type === 'app') {
    return <div className="gba:w-full gba:h-full">{renderAppContent()}</div>
  }

  // Render forms and popups in dialog
  if (selectedApp && (selectedApp.type === 'form' || selectedApp.type === 'popup' || selectedApp.type === 'window')) {
    // Window type has wider max-width (553px < window <= 1200px)
    const maxWidth = selectedApp.type === 'window' ? 'gba:max-w-[1200px]' : 'gba:max-w-[553px]'
    const width = selectedApp.type === 'window' ? 'gba:w-[1200px]' : 'gba:w-[553px]'

    return (
      <Dialog open={dialogVisible} onOpenChange={open => !open && handleDialogClose()}>
        <DialogContent
          aria-describedby={undefined}
          className={`${maxWidth} ${width} gba:flex gba:flex-col gba:bg-background`}
          style={{
            height: selectedApp.type === 'form' || selectedApp.type === 'window' ? 'calc(100vh - 120px)' : 'auto',
            overflow: selectedApp.type === 'form' || selectedApp.type === 'window' ? 'auto' : 'visible',
            justifyContent: 'flex-start'
          }}
        >
          <DialogHeader>
            <DialogTitle className="gba:text-lg gba:font-semibold">{selectedApp.name}</DialogTitle>
          </DialogHeader>
          {renderAppContent()}
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
