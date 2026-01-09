/**
 * CompleteCustomerTaskComplete Component
 * Form for completing customer tasks from Kogito process
 * Screen key: frm_completeCustomerTaskCompleteTask
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskActionForm } from '@/common/components/task-approval/components/TaskActionForm'

const CompleteCustomerTaskComplete: React.FC<BusinessAppContextProps> = props => {
  return <TaskActionForm {...props} moduleType="crm" />
}

export default CompleteCustomerTaskComplete
