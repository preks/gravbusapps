import React, { useMemo } from 'react'
import { Label, useTranslation } from '@newwork/nw-design-system'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import translations from '../../../_i18n'
import { useFlowStudioStore } from '../../../hooks/useFlowStudioStore'
import { AssignmentConfigSection } from './AssignmentConfigSection'

interface TaskAssignmentTabProps {
  mode: DesignerMode
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  accessToken: string
  testId: string
}

export const TaskAssignmentTab: React.FC<TaskAssignmentTabProps> = ({ mode, config, update, accessToken, testId }) => {
  const { t } = useTranslation(translations)
  const nodes = useFlowStudioStore(s => s.nodes)

  const availableStartFields = useMemo(() => {
    const start = nodes.find(n => n.type === 'start')
    const form = (start?.config as any)?.form
    if (!Array.isArray(form)) return []

    const isLikelyPersonField = (f: any): boolean => {
      const name = String(f?.name || '').toLowerCase()
      const entity = String(f?.dataSource?.entity || '').toLowerCase()
      if (entity.includes('employee') || entity.includes('user')) return true
      return ['employee', 'user', 'assignee', 'requester', 'approver', 'manager', 'owner', 'responsible'].some(p =>
        name.includes(p)
      )
    }

    return form
      .filter((f: any) => f && typeof f.name === 'string')
      .filter(isLikelyPersonField)
      .map((f: any) => ({
        name: String(f.name),
        label: String(f.label || f.name)
      }))
  }, [nodes])

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
