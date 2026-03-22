import React from 'react'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ReadonlyTemplateFlowCanvas } from '../ReadonlyTemplateFlowCanvas'
import { FlowDetailAuditPanel } from './FlowDetailAuditPanel'
import { FlowDetailDataSection } from './FlowDetailDataSection'
import { FlowDetailHeader } from './FlowDetailHeader'
import { useFlowDetailData } from './useFlowDetailData'

export interface FlowDetailViewProps extends BusinessAppContextProps {
  flowId: string
  onBack?: () => void
  hiddenTabs?: string[]
  showBackButton?: boolean
}

export const FlowDetailView: React.FC<FlowDetailViewProps> = ({
  flowId,
  onBack,
  hiddenTabs = [],
  showBackButton = true,
  accessToken
}) => {
  const {
    flowData,
    flowSteps,
    executionState,
    isLoading,
    isRefreshing,
    error,
    historySummary,
    historyLoading,
    historyError,
    filteredEvents,
    activeFilters,
    refreshAllData,
    toggleFilter,
    clearAllFilters
  } = useFlowDetailData({
    flowId,
    accessToken
  })

  if (isLoading) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center">
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-sm gba:text-muted-foreground">
          <Spinner />
          Loading flow details...
        </div>
      </div>
    )
  }

  if (error || !flowData) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">Error loading flow</h4>
            <p className="gba:mt-1 gba:text-sm">{error || 'Flow not found'}</p>
          </div>
        </Alert>
      </div>
    )
  }

  const showAuditPanel = !hiddenTabs.includes('audit')
  const showDataSection = !hiddenTabs.includes('data')

  return (
    <div className="gba:flex gba:flex-col gba:bg-background">
      <div className="gba:px-6">
        <FlowDetailHeader
          flowData={flowData}
          flowSteps={flowSteps}
          accessToken={accessToken}
          onBack={onBack}
          showBackButton={showBackButton}
          onRefresh={refreshAllData}
          isRefreshing={isRefreshing || historyLoading}
        />
      </div>

      <div className="gba:flex-1 gba:px-6 gba:py-6">
        <div className="gba:space-y-8">
          <div className={showAuditPanel ? 'gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2' : 'gba:block'}>
            <div className="gba:space-y-4">
              <ReadonlyTemplateFlowCanvas
                accessToken={accessToken || ''}
                templateId={flowData.templateId}
                templateVersion={flowData.templateVersion}
                title="Flow"
                description="This flow view reflects completed and in-progress steps directly on the graph."
                emptyTitle="No flow definition available"
                emptyDescription="The selected workflow does not have a definition that can be rendered yet."
                executionState={executionState}
                showControls={false}
                data-testid="flow-detail-definition-canvas"
              />
            </div>

            {showAuditPanel ? (
              <div className="gba:space-y-4">
                <FlowDetailAuditPanel
                  events={filteredEvents}
                  summary={historySummary}
                  isLoading={historyLoading}
                  error={historyError}
                  activeFilters={activeFilters}
                  onToggleFilter={toggleFilter}
                  onClearFilters={clearAllFilters}
                  accessToken={accessToken}
                />
              </div>
            ) : null}
          </div>

          {showDataSection ? (
            <FlowDetailDataSection flowData={flowData} flowSteps={flowSteps} accessToken={accessToken} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
