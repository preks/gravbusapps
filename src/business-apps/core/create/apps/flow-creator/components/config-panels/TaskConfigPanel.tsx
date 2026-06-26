/**
 * TaskConfigPanel - Configuration for task/approval/system step nodes.
 * Includes General, Form, Assignment, and Rework Actions tabs.
 */

import React, { useCallback, useMemo } from 'react'
import { Eye, FileText, Settings2, Users, Zap } from 'lucide-react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { TaskNodeConfig, DesignerMode, FlowStudioUpdateOptions } from '../../types/studioTypes'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import { TaskGeneralTab } from './task/TaskGeneralTab'
import { TaskFormTab } from './task/TaskFormTab'
import { TaskAssignmentTab } from './task/TaskAssignmentTab'
import { TaskEventsTab } from './task/TaskEventsTab'
import { TaskResultDisplayTab } from './task/TaskResultDisplayTab'
import { StepConfigTabShell, type StepConfigTabItem } from './shared/StepConfigTabShell'

interface TaskConfigPanelProps {
  nodeId: string
  config: TaskNodeConfig
  mode: DesignerMode
  accessToken: string
  studioData: FlowStudioData
  'data-testid'?: string
}

export const TaskConfigPanel: React.FC<TaskConfigPanelProps> = ({
  nodeId,
  config,
  mode,
  accessToken,
  studioData,
  'data-testid': testId = 'flow-studio-task-config'
}) => {
  const { t } = useTranslation(translations)
  const updateNodeConfig = useFlowStudioStore(s => s.updateNodeConfig)
  const updateNode = useFlowStudioStore(s => s.updateNode)
  const rewriteExpressionsForTaskFieldRename = useFlowStudioStore(s => s.rewriteExpressionsForTaskFieldRename)
  const showFormTab = config.kind === 'USER'
  const showAssignmentTab = config.kind === 'USER'
  const showResultDisplayTab = config.kind === 'USER' && config.stepType === FlowStepType.APPROVAL
  const showAutomationTab = mode === 'advanced' && config.kind === 'USER'

  const update = useCallback(
    (partial: Partial<TaskNodeConfig>, options?: FlowStudioUpdateOptions) => {
      updateNodeConfig(nodeId, partial, options)
    },
    [nodeId, updateNodeConfig]
  )

  const tabs = useMemo((): StepConfigTabItem[] => {
    const items: StepConfigTabItem[] = [
      {
        id: 'general',
        label: t('config-general'),
        icon: Settings2,
        content: (
          <TaskGeneralTab
            nodeId={nodeId}
            mode={mode}
            config={config}
            accessToken={accessToken}
            studioData={studioData}
            update={update}
            onUpdateLabel={title => updateNode(nodeId, { label: title })}
            t={t}
            testId={testId}
          />
        )
      }
    ]

    if (showAssignmentTab) {
      items.push({
        id: 'assignment',
        label: t('config-assignment'),
        icon: Users,
        content: (
          <TaskAssignmentTab
            nodeId={nodeId}
            mode={mode}
            config={config}
            update={update}
            accessToken={accessToken}
            testId={testId}
          />
        )
      })
    }

    if (showFormTab) {
      items.push({
        id: 'form',
        label: t('config-form'),
        icon: FileText,
        content: (
          <TaskFormTab
            mode={mode}
            config={config}
            studioData={studioData}
            update={update}
            title={t('config-form')}
            testId={testId}
            onFieldKeyRename={({ oldKey, newKey }, options) =>
              rewriteExpressionsForTaskFieldRename(nodeId, oldKey, newKey, options)
            }
          />
        )
      })
    }

    if (showResultDisplayTab) {
      items.push({
        id: 'result-display',
        label: t('config-result-display'),
        icon: Eye,
        content: <TaskResultDisplayTab config={config} update={update} t={t} testId={testId} />
      })
    }

    if (showAutomationTab) {
      items.push({
        id: 'events',
        label: t('config-events'),
        icon: Zap,
        content: (
          <TaskEventsTab
            config={config}
            studioData={studioData}
            update={update}
            title={t('config-events')}
            testId={testId}
          />
        )
      })
    }

    return items
  }, [
    accessToken,
    config,
    mode,
    nodeId,
    rewriteExpressionsForTaskFieldRename,
    showAssignmentTab,
    showAutomationTab,
    showFormTab,
    showResultDisplayTab,
    studioData,
    t,
    testId,
    update,
    updateNode
  ])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <StepConfigTabShell tabs={tabs} testId={testId} defaultTabId="general" />
    </div>
  )
}
