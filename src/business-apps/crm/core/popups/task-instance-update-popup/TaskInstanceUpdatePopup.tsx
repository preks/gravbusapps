import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskInstanceUpdatePopup as CommonTaskInstanceUpdatePopup } from '@/common/components/common-relations/popups/task-instance-update-popup'

/**
 * CRM-specific props (omits entityType that is hardcoded here)
 */
export interface CRMTaskInstanceUpdatePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  taskAssigneeId?: string
  taskId?: string
  onSuccess?: () => void
  onError?: (error: any) => void
  'data-testid'?: string
}

/**
 * CRM TaskInstanceUpdatePopup - Customer Task Instance Status Update
 * Configures the generic popup with CRM-specific settings:
 * - entityType: 'customer'
 * - Uses Task and TaskAssignee tables
 */
const TaskInstanceUpdatePopup: React.FC<CRMTaskInstanceUpdatePopupProps> = props => (
  <CommonTaskInstanceUpdatePopup
    {...props}
    entityType="customer"
    isOpen={props.isOpen ?? true}
    onClose={props.onClose ?? (() => {})}
    data-testid={props['data-testid'] ?? 'crm-task-instance-update-popup'}
  />
)

export { TaskInstanceUpdatePopup }
export type { CRMTaskInstanceUpdatePopupProps as TaskInstanceUpdatePopupProps }
export default TaskInstanceUpdatePopup
