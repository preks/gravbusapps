import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { FlowRenderer } from '@/business-apps/flow/common/components/flow-renderer'
import { FlowStepType, AssignmentMode } from '@/business-apps/flow/apps/creator/types/flowTemplate'

interface FlowPreviewProps {
  template: FlowTemplate | null
  'data-testid'?: string
}

/**
 * Component for previewing flow templates using the unified FlowRenderer
 */
export const FlowPreview: React.FC<FlowPreviewProps> = ({ template, 'data-testid': testId = 'flow-preview' }) => {
  if (!template) {
    return (
      <Card className="gba:h-full" data-testid={testId}>
        <CardHeader>
          <CardTitle>Flow Preview</CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-[400px] gba:text-gray-500">
          No template selected for preview
        </CardContent>
      </Card>
    )
  }

  // Convert template steps to FlowRenderer format
  const steps =
    template.steps?.length > 0
      ? template.steps.map(step => ({
          title: step.title || 'Untitled Step',
          type: step.type || FlowStepType.TASK,
          message: step.message || 'Describe the task to be performed.',
          assignment: step.assignment || { assignmentMode: AssignmentMode.CLAIM, targets: null }
        }))
      : [
          {
            title: 'Demo Task',
            type: FlowStepType.TASK,
            message: 'This is a demo task to show the flow structure.',
            assignment: { assignmentMode: AssignmentMode.CLAIM, targets: null }
          }
        ]

  // Calculate summary fields count from template level
  const summaryFieldsCount = React.useMemo(() => {
    return template.summaryFields?.length || 0
  }, [template.summaryFields])

  return (
    <Card className="gba:h-full" data-testid={testId}>
      <CardHeader>
        <CardTitle>Flow Preview - {template.name}</CardTitle>
      </CardHeader>
      <CardContent className="gba:h-[calc(100%-80px)]">
        <FlowRenderer
          steps={steps}
          mode="view"
          showSummaryNode={true}
          summaryFieldsCount={summaryFieldsCount}
          data-testid={`${testId}-renderer`}
        />
      </CardContent>
    </Card>
  )
}
