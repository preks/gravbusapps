import React from 'react'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AlertCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ReadonlyTemplateFlowCanvas } from '../ReadonlyTemplateFlowCanvas'
import { FlowDetailAuditPanel } from './FlowDetailAuditPanel'
import { FlowDetailDataSection } from './FlowDetailDataSection'
import { FlowDetailHeader } from './FlowDetailHeader'
import { FlowTasksSection } from './tasks/FlowTasksSection'
import { useFlowDetailData } from './useFlowDetailData'

export interface FlowDetailViewProps extends BusinessAppContextProps {
  flowId: string
  focusTaskId?: string
  onBack?: () => void
  hiddenTabs?: string[]
  showBackButton?: boolean
  layoutVariant?: 'classic' | 'unified'
}

export const FlowDetailView: React.FC<FlowDetailViewProps> = ({
  flowId,
  focusTaskId,
  onBack,
  hiddenTabs = [],
  showBackButton = true,
  layoutVariant = 'classic',
  accessToken,
  userInfo
}) => {
  const {
    flowData,
    flowSteps,
    stepAssignmentsByStepIndex,
    executionState,
    isLoading,
    isRefreshing,
    error,
    historySummary,
    historyLoading,
    historyError,
    filteredEvents,
    historyEvents,
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
  const isUnified = layoutVariant === 'unified'

  return (
    <div className="gba:flex gba:flex-col gba:bg-background">
      <div className="gba:px-6">
        <FlowDetailHeader
          flowData={flowData}
          flowSteps={flowSteps}
          accessToken={accessToken}
          onBack={onBack}
          showBackButton={showBackButton}
          showFlowId={!isUnified}
          onRefresh={refreshAllData}
          isRefreshing={isRefreshing || historyLoading}
        />
      </div>

      <div className="gba:flex-1 gba:px-6 gba:py-6">
        {isUnified ? (
          <div className="gba:space-y-8">
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
            <FlowTasksSection
              flowData={flowData}
              flowSteps={flowSteps}
              stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
              historyEvents={historyEvents}
              focusTaskId={focusTaskId}
              accessToken={accessToken}
              userId={userInfo?.id}
              onRefreshHistory={refreshAllData}
            />
          </div>
        ) : (
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
              <FlowDetailDataSection
                flowData={flowData}
                flowSteps={flowSteps}
                stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
                accessToken={accessToken}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
