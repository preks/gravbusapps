import React from 'react'
import { Typography } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PreviousStepData } from '../../creator/components/shared/PreviousStepData'

const { Text, Title } = Typography

interface Task {
  id: string
  flowId: string
  workflowMeta?: {
    rootWorkflowId: string
  }
}

interface DataTabProps extends BusinessAppContextProps {
  task: Task
  prefixDataTestId?: string
}

export const FlowDataTab: React.FC<DataTabProps> = ({ task, prefixDataTestId = 'flow-data-tab', ...context }) => {
  const flowId = task.workflowMeta?.rootWorkflowId || task.flowId

  return (
    <div data-testid={prefixDataTestId} style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={5}>Flow Data</Title>
        <Text type="secondary">Previous step data and workflow context information</Text>
      </div>

      <PreviousStepData
        flowId={flowId}
        currentStepIndex={2} // Show data for previous steps
        {...context}
      />
    </div>
  )
}
