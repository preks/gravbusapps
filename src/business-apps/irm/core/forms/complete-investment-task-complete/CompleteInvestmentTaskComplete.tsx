/**
 * CompleteInvestmentTaskComplete Component
 * Form for completing investment tasks from Kogito process
 * Screen key: frm_completeInvestmentTaskCompleteTask
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskActionForm } from '@/common/components/task-approval/components/TaskActionForm'

const CompleteInvestmentTaskComplete: React.FC<BusinessAppContextProps> = props => {
  return <TaskActionForm {...props} moduleType="irm" />
}

export default CompleteInvestmentTaskComplete
