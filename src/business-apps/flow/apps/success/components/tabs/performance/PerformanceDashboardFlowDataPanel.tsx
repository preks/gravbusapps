import React, { useEffect } from 'react'
import { Alert, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { FlowDetailDataSection } from '@/common/components/flow/flow-detail/FlowDetailDataSection'
import { useFlowDetailData } from '@/common/components/flow/flow-detail/useFlowDetailData'
import translations from '../../../_i18n'

interface PerformanceDashboardFlowDataPanelProps {
  flowId: string
  accessToken: string
  onBack: () => void
  'data-testid'?: string
}

export const PerformanceDashboardFlowDataPanel: React.FC<PerformanceDashboardFlowDataPanelProps> = ({
  flowId,
  accessToken,
  onBack,
  'data-testid': testId = 'flow-success-performance-flow-data'
}) => {
  const { t } = useTranslation(translations)
  const { flowData, flowSteps, stepAssignmentsByStepIndex, isLoading, error } = useFlowDetailData({
    flowId,
    accessToken
  })

  useEffect(() => {
    const element = document.getElementById('performance-flow-data')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [flowId])

  return (
    <div id="performance-flow-data" className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          onClick={onBack}
          data-testid={`${testId}-back`}
        >
          <ArrowLeft className="gba:h-4 gba:w-4" />
          {t('action-back')}
        </Button>
        {flowData ? (
          <span className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-flow-name`}>
            {flowData.flowName}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-10">
          <Spinner className="gba:h-8 gba:w-8" />
        </div>
      ) : null}

      {error || (!isLoading && !flowData) ? (
        <Alert variant="destructive" data-testid={`${testId}-error`}>
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">{t('state-error-title')}</h4>
            <p className="gba:mt-1 gba:text-sm">{error || 'Flow not found'}</p>
          </div>
        </Alert>
      ) : null}

      {flowData ? (
        <FlowDetailDataSection
          flowData={flowData}
          flowSteps={flowSteps}
          stepAssignmentsByStepIndex={stepAssignmentsByStepIndex}
          accessToken={accessToken}
          defaultOpen
        />
      ) : null}
    </div>
  )
}
