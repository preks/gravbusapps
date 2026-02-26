import React from 'react'
import { FormBuilder } from '../../form-builder'
import type { InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'

interface TaskFormTabProps {
  mode: DesignerMode
  config: TaskNodeConfig
  studioData: FlowStudioData
  update: (partial: Partial<TaskNodeConfig>) => void
  title: string
  testId: string
}

export const TaskFormTab: React.FC<TaskFormTabProps> = ({ mode, config, studioData, update, title, testId }) => {
  return (
    <FormBuilder
      fields={config.form ?? []}
      onChange={(fields: InputBlock[]) => update({ form: fields })}
      mode={mode}
      catalogs={studioData.catalogs}
      title={title}
      description="Define the fields that the assignee fills in when working on this task."
      data-testid={`${testId}-form-builder`}
    />
  )
}
