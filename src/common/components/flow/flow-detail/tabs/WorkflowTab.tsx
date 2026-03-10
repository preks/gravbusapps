import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { FlowRenderer } from '@/business-apps/flow/common/components/flow-renderer'
import { AssignmentMode, FlowStepType, TaskAssignment } from '@/common/network/flows/FlowTemplateClient'

interface FlowStep {
  id: string
  title: string
  status: string
  assignedTo?: string
  assignmentMode?: string
  dueDate?: string
  completedAt?: string
  completionTimeMinutes?: number
}

interface WorkflowTabProps {
  flowSteps: FlowStep[]
}

export const WorkflowTab: React.FC<WorkflowTabProps> = ({ flowSteps }) => {
  const currentStepIndex = useMemo(() => {
    const idx = flowSteps.findIndex(s => String(s.status).toUpperCase() === 'IN_PROGRESS')
    return idx >= 0 ? idx : null
  }, [flowSteps])

  const steps = useMemo(() => {
    return flowSteps.map(step => {
      const normalizedAssignmentMode = String(step.assignmentMode || '').toUpperCase()
      const assignmentMode =
        normalizedAssignmentMode === 'ASSIGN_SINGLE'
          ? AssignmentMode.ASSIGN_SINGLE
          : normalizedAssignmentMode === 'ASSIGN'
            ? AssignmentMode.ASSIGN
            : AssignmentMode.CLAIM

      const assignment: TaskAssignment = {
        assignmentMode,
        targets: null
      }

      return {
        title: step.title,
        type: FlowStepType.TASK,
        assignment
      }
    })
  }, [flowSteps])

  return (
    <Card className="gba:h-[800px]" data-testid="flow-detail-workflow-tab">
      <CardHeader>
        <CardTitle className="gba:text-base">Flow Definition</CardTitle>
      </CardHeader>
      <CardContent className="gba:h-[calc(800px-64px)] gba:p-0">
        <FlowRenderer
          steps={steps as any}
          selectedStepIndex={currentStepIndex}
          mode="view"
          showSummaryNode={false}
          data-testid="flow-detail-flow-renderer"
        />
      </CardContent>
    </Card>
  )
}
