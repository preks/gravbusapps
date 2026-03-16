import React from 'react'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'

interface UserDecisionApprovalSectionProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  branchEdges: Array<{ id: string; source: string; target: string; label?: string }>
}

export const UserDecisionApprovalSection: React.FC<UserDecisionApprovalSectionProps> = ({ testId }) => {
  return (
    <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-user-approval-hint`}>
      This decision will create an approval task (Approve / Reject). Configure outcomes and optional reject behavior
      above.
    </p>
  )
}
