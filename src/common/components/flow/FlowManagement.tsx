import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowList } from './FlowList'
import { FlowDetailView } from './flow-detail/FlowDetailView'

export interface FlowManagementProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  variant?: 'monitoring' | 'inbox' | 'management'

  // Flow list configuration
  listTitle?: string
  filterType?: 'all' | 'initiated' | 'participated'
  hideFilters?: boolean
  userId?: string

  // Flow detail configuration
  showBackButton?: boolean
  hiddenTabs?: string[]
  showActions?: boolean

  // Callbacks
  onFlowAction?: (action: string, flowId: string) => void
}

export const FlowManagement: React.FC<FlowManagementProps> = ({
  prefixDataTestId = 'flow-management',
  variant = 'monitoring',
  listTitle,
  filterType = 'all',
  hideFilters = false,
  userId,
  showBackButton = true,
  hiddenTabs = [],
  showActions = true,
  onFlowAction,
  accessToken,
  ...context
}) => {
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)

  const handleFlowSelect = (flowId: string) => {
    setSelectedFlowId(flowId)
  }

  const handleBack = () => {
    setSelectedFlowId(null)
  }

  const handleFlowAction = (action: string, flowId: string) => {
    onFlowAction?.(action, flowId)
  }

  // If a flow is selected, show the detail view
  if (selectedFlowId) {
    return (
      <FlowDetailView
        flowId={selectedFlowId}
        variant={variant}
        onBack={showBackButton ? handleBack : undefined}
        onAction={handleFlowAction}
        showActions={showActions}
        hiddenTabs={hiddenTabs}
        showBackButton={showBackButton}
        accessToken={accessToken}
        {...context}
      />
    )
  }

  // Show the flow list
  return (
    <FlowList
      prefixDataTestId={`${prefixDataTestId}-list`}
      title={listTitle}
      filterType={filterType}
      hideFilters={hideFilters}
      onFlowSelect={handleFlowSelect}
      userId={userId}
      accessToken={accessToken}
      {...context}
    />
  )
}
