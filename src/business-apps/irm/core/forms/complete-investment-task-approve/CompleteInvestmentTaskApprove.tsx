/**
 * CompleteInvestmentTaskApprove Component
 * Form for approving completed investment tasks from Kogito process
 * Screen key: frm_completeInvestmentTaskApproveTask
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskActionForm } from '@/common/components/task-approval/components/TaskActionForm'

const CompleteInvestmentTaskApprove: React.FC<BusinessAppContextProps> = props => {
  return <TaskActionForm {...props} moduleType="irm" />
}

export default CompleteInvestmentTaskApprove
