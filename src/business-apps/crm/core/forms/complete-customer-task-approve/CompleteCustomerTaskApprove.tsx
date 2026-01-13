/**
 * CompleteCustomerTaskApprove Component
 * Form for approving completed customer tasks from Kogito process
 * Screen key: frm_completeCustomerTaskApproveTask
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskActionForm } from '@/common/components/task-approval/components/TaskActionForm'

const CompleteCustomerTaskApprove: React.FC<BusinessAppContextProps> = props => {
  return <TaskActionForm {...props} moduleType="crm" />
}

export default CompleteCustomerTaskApprove
