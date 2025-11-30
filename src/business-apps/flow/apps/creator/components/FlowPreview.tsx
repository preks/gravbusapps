import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { FlowRenderer } from '@/business-apps/flow/common/components/flow-renderer'
import { FlowStepType, AssignmentMode } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { Eye, Layers } from 'lucide-react'

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
      <Card className="gba:h-full gba:border-border" data-testid={testId}>
        <CardContent className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-[400px] gba:text-center gba:p-8">
          <div className="gba:w-12 gba:h-12 gba:rounded-xl gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-4">
            <Eye className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
          </div>
          <h3 className="gba:font-medium gba:text-card-foreground gba:mb-1">No Preview</h3>
          <p className="gba:text-sm gba:text-muted-foreground">Select a workflow to see its preview</p>
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
    <Card className="gba:h-full gba:border-border" data-testid={testId}>
      <CardHeader className="gba:border-b gba:border-border gba:pb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:text-lg gba:font-medium gba:text-card-foreground">{template.name}</CardTitle>
            {template.description && (
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-2">{template.description}</p>
            )}
          </div>
          <Badge variant="secondary">
            <Layers className="gba:h-3 gba:w-3 gba:mr-1" />
            {steps.length} steps
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="gba:h-[calc(100%-100px)] gba:p-4">
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
