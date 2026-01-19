import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpensePlanVsRequest from './plan-vs-request/ExpensePlanVsRequest'

interface PlanVsRequestTabProps extends BusinessAppContextProps {
  isActive?: boolean // ⚡ PERFORMANCE: Only fetch data when tab is active
}

const PlanVsRequestTab: React.FC<PlanVsRequestTabProps> = props => {
  return (
    <div data-testid="plan-vs-request-tab-container">
      <ExpensePlanVsRequest {...props} />
    </div>
  )
}

export default PlanVsRequestTab
