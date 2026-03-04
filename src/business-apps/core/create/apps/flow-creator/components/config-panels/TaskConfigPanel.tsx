/**
 * TaskConfigPanel - Configuration for task/approval/system step nodes.
 * Includes General, Form, Assignment, and Rework Actions tabs.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge, useTranslation } from '@newwork/nw-design-system'
import {
  Bot,
  Brain,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  Info,
  Repeat2,
  Settings2,
  UserCheck,
  Users,
  Zap
} from 'lucide-react'
import translations from '../../_i18n'
import { useFlowStudioStore } from '../../hooks/useFlowStudioStore'
import type { TaskNodeConfig, DesignerMode } from '../../types/studioTypes'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { FlowStudioData } from '../../hooks/useFlowStudioData'
import { TaskGeneralTab } from './task/TaskGeneralTab'
import { TaskFormTab } from './task/TaskFormTab'
import { TaskAssignmentTab } from './task/TaskAssignmentTab'
import { TaskEventsTab } from './task/TaskEventsTab'
import { TaskSwitchTypePanel } from './task/TaskSwitchTypePanel'

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
  const [activeTab, setActiveTab] = useState('general')
  const [view, setView] = useState<'config' | 'switchType'>('config')
  const showFormTab = config.kind === 'USER'
  const showAssignmentTab = config.kind === 'USER'
  const showAutomationTab = mode === 'advanced' && config.kind === 'USER'
  const visibleTabs = useMemo(
    () =>
      [
        'general',
        showAssignmentTab ? 'assignment' : null,
        showFormTab ? 'form' : null,
        showAutomationTab ? 'events' : null
      ].filter(Boolean) as string[],
    [showAssignmentTab, showAutomationTab, showFormTab]
  )
  const showTabBar = visibleTabs.length > 1
  const contentPaddingClassName = showTabBar ? 'gba:p-5' : 'gba:px-5 gba:py-4'

  useEffect(() => {
    if (!showFormTab && activeTab === 'form') setActiveTab('general')
    if (!showAssignmentTab && activeTab === 'assignment') setActiveTab('general')
    if (!showAutomationTab && activeTab === 'events') setActiveTab('general')
  }, [activeTab, showAssignmentTab, showAutomationTab, showFormTab])
  const header = useMemo(() => {
    if (config.stepType === FlowStepType.AI_TASK_EXPERT) {
      return { Icon: Bot, bg: 'gba:bg-muted', fg: 'gba:text-foreground', badge: 'AI' }
    }
    if (config.stepType === FlowStepType.AI_AGENT) {
      return { Icon: Brain, bg: 'gba:bg-muted', fg: 'gba:text-foreground', badge: 'AI' }
    }
    if (config.stepType === FlowStepType.FUNCTION) {
      return { Icon: Code2, bg: 'gba:bg-muted', fg: 'gba:text-foreground', badge: 'Automation' }
    }
    if (config.stepType === FlowStepType.APPROVAL) {
      return {
        Icon: UserCheck,
        bg: 'gba:bg-warning-secondary',
        fg: 'gba:text-warning-secondary-foreground',
        badge: 'User'
      }
    }
    if (config.stepType === FlowStepType.INFORMATION) {
      return { Icon: Info, bg: 'gba:bg-muted', fg: 'gba:text-foreground', badge: 'User' }
    }
    if (config.stepType === FlowStepType.ACKNOWLEDGE) {
      return { Icon: CheckCircle2, bg: 'gba:bg-muted', fg: 'gba:text-foreground', badge: 'User' }
    }
    return { Icon: ClipboardList, bg: 'gba:bg-accent', fg: 'gba:text-accent-foreground', badge: 'User' }
  }, [config.stepType])

  const update = useCallback(
    (partial: Partial<TaskNodeConfig>) => {
      updateNodeConfig(nodeId, partial)
    },
    [nodeId, updateNodeConfig]
  )

  const applyStepType = useCallback(
    (nextType: FlowStepType) => {
      const isAutomation = [FlowStepType.FUNCTION, FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT].includes(
        nextType
      )
      update({
        stepType: nextType,
        kind: isAutomation ? 'SYSTEM' : 'USER',
        permissionContext:
          nextType === FlowStepType.AI_AGENT
            ? (config.permissionContext ?? { contextType: 'USER', permissions: ['read', 'write', 'execute'] })
            : undefined,
        ...(mode === 'simple' && nextType === FlowStepType.AI_TASK_EXPERT
          ? { simpleAIConfig: { instruction: config.simpleAIConfig?.instruction ?? '' } }
          : {})
      })
    },
    [config.permissionContext, config.simpleAIConfig?.instruction, mode, update]
  )

  // NOTE: Task-level rework/return is intentionally not configured here.
  // For send-back / return flows, use a Decision node (Approval mode).

  const stepTypeOptions = useMemo(() => {
    const userTypes: FlowStepType[] = [
      FlowStepType.TASK,
      FlowStepType.APPROVAL,
      FlowStepType.INFORMATION,
      FlowStepType.ACKNOWLEDGE
    ]
    const systemTypes: FlowStepType[] =
      mode === 'simple' ? [FlowStepType.AI_AGENT] : [FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT]

    // Signature UX: always show the full set of step types (no "Execution" dropdown).
    // Choosing a type implicitly switches between USER and SYSTEM.
    return [...userTypes, ...systemTypes]
  }, [mode])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-5 gba:py-3 gba:border-b gba:border-border gba:bg-background">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className={`gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md ${header.bg}`}>
            <header.Icon className={`gba:h-4 gba:w-4 ${header.fg}`} />
          </div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">
            {view === 'switchType' ? t('task-switch-type') : 'Task Configuration'}
          </h3>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {view !== 'switchType' && (
            <button
              type="button"
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              onClick={() => {
                setView('switchType')
                setActiveTab('general')
              }}
              data-testid={`${testId}-switch-open`}
            >
              <Repeat2 className="gba:h-4 gba:w-4" />
              {t('task-switch-type')}
            </button>
          )}

          <Badge variant="secondary" data-testid={`${testId}-header-badge`}>
            {header.badge}
          </Badge>
        </div>
      </div>

      {view === 'switchType' ? (
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-5 gba:py-4">
          <TaskSwitchTypePanel
            mode={mode}
            config={config}
            onSwitch={next => {
              applyStepType(next)
              setView('config')
            }}
            t={t}
            data-testid={`${testId}-switch-panel`}
          />
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden"
        >
          {showTabBar && (
            <div className="gba:px-5 gba:pt-3">
              <TabsList className="gba:w-full gba:bg-muted gba:p-1 gba:rounded-lg">
                <TabsTrigger
                  value="general"
                  startIcon={<Settings2 className="gba:h-3.5 gba:w-3.5" />}
                  className={
                    activeTab === 'general'
                      ? 'gba:bg-background gba:text-foreground gba:font-semibold gba:shadow-sm'
                      : 'gba:text-muted-foreground'
                  }
                  data-testid={`${testId}-tab-general`}
                >
                  {t('config-general')}
                </TabsTrigger>
                {showAssignmentTab && (
                  <TabsTrigger
                    value="assignment"
                    startIcon={<Users className="gba:h-3.5 gba:w-3.5" />}
                    className={
                      activeTab === 'assignment'
                        ? 'gba:bg-background gba:text-foreground gba:font-semibold gba:shadow-sm'
                        : 'gba:text-muted-foreground'
                    }
                    data-testid={`${testId}-tab-assignment`}
                  >
                    {t('config-assignment')}
                  </TabsTrigger>
                )}
                {showFormTab && (
                  <TabsTrigger
                    value="form"
                    startIcon={<FileText className="gba:h-3.5 gba:w-3.5" />}
                    className={
                      activeTab === 'form'
                        ? 'gba:bg-background gba:text-foreground gba:font-semibold gba:shadow-sm'
                        : 'gba:text-muted-foreground'
                    }
                    data-testid={`${testId}-tab-form`}
                  >
                    {t('config-form')}
                  </TabsTrigger>
                )}
                {showAutomationTab && (
                  <TabsTrigger
                    value="events"
                    startIcon={<Zap className="gba:h-3.5 gba:w-3.5" />}
                    className={
                      activeTab === 'events'
                        ? 'gba:bg-background gba:text-foreground gba:font-semibold gba:shadow-sm'
                        : 'gba:text-muted-foreground'
                    }
                    data-testid={`${testId}-tab-events`}
                  >
                    {t('config-events')}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          )}

          <div className="gba:flex-1 gba:overflow-y-auto">
            {/* General Tab */}
            <TabsContent
              value="general"
              className={`gba:flex gba:flex-col gba:gap-4 gba:mt-0 ${contentPaddingClassName}`}
            >
              <TaskGeneralTab
                mode={mode}
                config={config}
                accessToken={accessToken}
                studioData={studioData}
                stepTypeOptions={stepTypeOptions}
                update={update}
                onUpdateLabel={title => updateNode(nodeId, { label: title })}
                t={t}
                testId={testId}
              />
            </TabsContent>

            {/* Assignment Tab */}
            {showAssignmentTab && (
              <TabsContent
                value="assignment"
                className={`gba:flex gba:flex-col gba:gap-4 gba:mt-0 ${contentPaddingClassName}`}
              >
                <TaskAssignmentTab
                  mode={mode}
                  config={config}
                  update={update}
                  accessToken={accessToken}
                  testId={testId}
                />
              </TabsContent>
            )}

            {/* Form Tab */}
            {showFormTab && (
              <TabsContent
                value="form"
                className={`gba:flex gba:flex-col gba:gap-4 gba:mt-0 ${contentPaddingClassName}`}
              >
                <TaskFormTab
                  mode={mode}
                  config={config}
                  studioData={studioData}
                  update={update}
                  title={t('config-form')}
                  testId={testId}
                  onFieldKeyRename={({ oldKey, newKey }) =>
                    rewriteExpressionsForTaskFieldRename(nodeId, oldKey, newKey)
                  }
                />
              </TabsContent>
            )}

            {/* Automation Tab (Advanced only, user tasks only) */}
            {showAutomationTab && (
              <TabsContent
                value="events"
                className={`gba:flex gba:flex-col gba:gap-4 gba:mt-0 ${contentPaddingClassName}`}
              >
                <TaskEventsTab
                  config={config}
                  studioData={studioData}
                  update={update}
                  title={t('config-events')}
                  testId={testId}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>
      )}
    </div>
  )
}
