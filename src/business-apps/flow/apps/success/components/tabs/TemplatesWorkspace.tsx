import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { FlowSuccessDrilldownTarget, FlowSuccessPerformanceView } from '../../shellState'
import { PerformanceWorkspace } from './PerformanceWorkspace'
import type { SuccessTimeframe } from '../../utils/timeframe'

interface TemplatesWorkspaceProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe: SuccessTimeframe
  templateId: string
  subView: FlowSuccessPerformanceView
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
}

export const TemplatesWorkspace: React.FC<TemplatesWorkspaceProps> = props => {
  return <PerformanceWorkspace {...props} selectedFlowName="" hasAnalyticsData />
}
