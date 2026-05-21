import React from 'react'
import { FormBuilder } from '../../form-builder'
import type { InputBlock } from '@/common/data/flow/types/flowTemplate'
import type { DesignerMode, FlowStudioUpdateOptions, TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'

interface TaskFormTabProps {
  mode: DesignerMode
  config: TaskNodeConfig
  studioData: FlowStudioData
  update: (partial: Partial<TaskNodeConfig>, options?: FlowStudioUpdateOptions) => void
  title: string
  testId: string
  onFieldKeyRename?: (rename: { oldKey: string; newKey: string }, options?: FlowStudioUpdateOptions) => void
}

export const TaskFormTab: React.FC<TaskFormTabProps> = ({
  mode,
  config,
  studioData,
  update,
  title,
  testId,
  onFieldKeyRename
}) => {
  return (
    <FormBuilder
      fields={config.form ?? []}
      onChange={(fields: InputBlock[], options?: FlowStudioUpdateOptions) => update({ form: fields }, options)}
      onFieldKeyRename={onFieldKeyRename}
      mode={mode}
      catalogs={studioData.catalogs}
      catalogsLoading={studioData.catalogsLoading}
      catalogsError={studioData.catalogsError}
      catalogsQuery={studioData.catalogsQuery}
      catalogsHasMore={studioData.catalogsHasMore}
      searchCatalogs={studioData.searchCatalogs}
      loadMoreCatalogs={studioData.loadMoreCatalogs}
      entities={studioData.entities}
      entitiesLoading={studioData.entitiesLoading}
      entitiesError={studioData.entitiesError}
      title={title}
      description="Define the fields that the assignee fills in when working on this task."
      data-testid={`${testId}-form-builder`}
    />
  )
}
