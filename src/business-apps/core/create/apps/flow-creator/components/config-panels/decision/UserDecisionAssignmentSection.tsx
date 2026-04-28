import React from 'react'
import { Label } from '@newwork/nw-design-system'
import type { DesignerMode } from '../../../types/studioTypes'
import { AssignmentMode } from '@/common/data/flow/types/flowTemplate'
import type { TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { AssignmentConfigSection } from '../task/AssignmentConfigSection'

interface UserDecisionAssignmentSectionProps {
  mode: DesignerMode
  accessToken: string
  isApproval: boolean
  value: TaskAssignment
  onChange: (next: TaskAssignment) => void
  availableStartFields: Array<{ name: string; label: string }>
  'data-testid': string
}

export const UserDecisionAssignmentSection: React.FC<UserDecisionAssignmentSectionProps> = ({
  mode,
  accessToken,
  isApproval,
  value,
  onChange,
  availableStartFields,
  'data-testid': testId
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
        {isApproval ? 'Approver Assignment' : 'Assignment'}
      </Label>
      <AssignmentConfigSection
        mode={mode}
        accessToken={accessToken}
        value={{
          targets: value.targets ?? null,
          assignmentMode: (value.assignmentMode ?? AssignmentMode.CLAIM) as any,
          allowReassignment: (value as any)?.allowReassignment ?? true
        }}
        onChange={onChange}
        availableStartFields={availableStartFields}
        defaultUserTargets={['{{$orgchart.managerByUserId[$workflow.initiator]}}']}
        defaultStrategyId="REQUESTER_MANAGER"
        allowAssignAtExecution={false}
        disallowedAssignStrategyIds={['REQUESTER_DIRECT_REPORTS']}
        testId={testId}
      />
    </div>
  )
}
