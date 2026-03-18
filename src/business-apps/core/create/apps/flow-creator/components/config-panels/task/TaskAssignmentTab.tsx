import React, { useMemo } from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import translations from '../../../_i18n'
import { useFlowStudioStore } from '../../../hooks/useFlowStudioStore'
import { collectAssignmentPersonFieldOptions } from '../../../utils/assignmentPersonFieldUtils'
import { AssignmentConfigSection } from './AssignmentConfigSection'

interface TaskAssignmentTabProps {
  nodeId: string
  mode: DesignerMode
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  accessToken: string
  testId: string
}

export const TaskAssignmentTab: React.FC<TaskAssignmentTabProps> = ({
  nodeId,
  mode,
  config,
  update,
  accessToken,
  testId
}) => {
  const { t } = useTranslation(translations)
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)

  const availableStartFields = useMemo(() => {
    return collectAssignmentPersonFieldOptions({ nodes, edges: edges as any, currentNodeId: nodeId })
  }, [edges, nodeId, nodes])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('assignment-mode-label')}</Label>
      <AssignmentConfigSection
        mode={mode}
        accessToken={accessToken}
        value={config.assignment as any}
        onChange={next => update({ assignment: next as any })}
        availableStartFields={availableStartFields}
        defaultUserTargets={['{{$workflow.initiator}}']}
        defaultStrategyId="REQUESTER"
        testId={`${testId}-assignment`}
      />
    </div>
  )
}
