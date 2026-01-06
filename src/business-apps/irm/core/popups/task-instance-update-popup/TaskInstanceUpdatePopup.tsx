import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskInstanceUpdatePopup as CommonTaskInstanceUpdatePopup } from '@/common/components/common-relations/popups/task-instance-update-popup'

/**
 * IRM-specific props (omits entityType that is hardcoded here)
 */
export interface IRMTaskInstanceUpdatePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  taskAssigneeId?: string
  taskId?: string
  onSuccess?: () => void
  onError?: (error: any) => void
  'data-testid'?: string
}

/**
 * IRM TaskInstanceUpdatePopup - Investment Task Instance Status Update
 * Configures the generic popup with IRM-specific settings:
 * - entityType: 'investment'
 * - Uses InvestmentTask and InvestmentTaskAssignee tables
 */
const TaskInstanceUpdatePopup: React.FC<IRMTaskInstanceUpdatePopupProps> = props => (
  <CommonTaskInstanceUpdatePopup
    {...props}
    entityType="investment"
    isOpen={props.isOpen ?? true}
    onClose={props.onClose ?? (() => {})}
    data-testid={props['data-testid'] ?? 'irm-task-instance-update-popup'}
  />
)

export { TaskInstanceUpdatePopup }
export type { IRMTaskInstanceUpdatePopupProps as TaskInstanceUpdatePopupProps }
export default TaskInstanceUpdatePopup
