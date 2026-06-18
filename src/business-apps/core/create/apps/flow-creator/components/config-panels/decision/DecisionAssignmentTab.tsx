import React, { useMemo } from 'react'
import type { DecisionNodeConfig, DesignerMode, FlowStudioUpdateOptions } from '../../../types/studioTypes'
import { AssignmentMode } from '@/common/data/flow/types/flowTemplate'
import type { TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { isApprovalUserDecision } from '../../step-picker/decisionUserKind'
import { UserDecisionAssignmentSection } from './UserDecisionAssignmentSection'

interface DecisionAssignmentTabProps {
  config: DecisionNodeConfig
  mode: DesignerMode
  testId: string
  accessToken: string
  availableStartFields: Array<{ name: string; label: string }>
  update: (partial: Partial<DecisionNodeConfig>, options?: FlowStudioUpdateOptions) => void
}

export const DecisionAssignmentTab: React.FC<DecisionAssignmentTabProps> = ({
  config,
  mode,
  testId,
  accessToken,
  availableStartFields,
  update
}) => {
  const isApproval = isApprovalUserDecision(config)

  const baseUserConfig = useMemo(() => {
    return (
      config.userConfig ?? {
        userDecisionType: isApproval ? 'APPROVAL' : 'CUSTOM',
        options: [],
        assignment: {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }
    )
  }, [config.userConfig, isApproval])

  const assignmentValue: TaskAssignment = useMemo(() => {
    return {
      targets: baseUserConfig.assignment?.targets ?? null,
      assignmentMode: (baseUserConfig.assignment?.assignmentMode ?? AssignmentMode.CLAIM) as any,
      allowReassignment: (baseUserConfig.assignment as any)?.allowReassignment ?? true
    }
  }, [baseUserConfig.assignment])

  return (
    <UserDecisionAssignmentSection
      mode={mode}
      accessToken={accessToken}
      isApproval={isApproval}
      value={assignmentValue}
      onChange={next =>
        update({
          userConfig: {
            ...baseUserConfig,
            assignment: next as any,
            options: baseUserConfig.options ?? []
          } as any
        })
      }
      availableStartFields={availableStartFields}
      data-testid={`${testId}-user-assignment`}
    />
  )
}
