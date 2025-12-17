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

  const handleDialogClose = () => {
    // Dispatch abort event to clean up Kogito tasks when dialog closes via X button or ESC
    // NOTE: This runs on ANY close (X button, ESC, or programmatic)
    // - If form already handled cleanup (via Cancel/Submit), Kogito ignores duplicate events
    // - If task is completed, abort events are safely ignored by the platform
    // - If user closed via X/ESC without cleanup, this ensures task cleanup
    // This defensive approach prevents orphaned tasks at the cost of redundant events
    if (selectedApp && (selectedApp.type === 'form' || selectedApp.type === 'popup' || selectedApp.type === 'window')) {
      try {
        dispatchProcessContinueEvent(PSE_ABORT_EVENT, {
          event: PSE_ABORT_EVENT,
          pso_exitStrategy: ABORT_EXIT_STRATEGY
        })
      } catch (error) {
        // Log error for observability while still allowing dialog close to proceed
        console.error('Failed to dispatch pse_abort event on dialog close:', error)
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
