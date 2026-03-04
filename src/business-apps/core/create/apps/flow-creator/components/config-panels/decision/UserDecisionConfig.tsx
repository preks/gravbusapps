import React, { useEffect, useMemo } from 'react'
import { Separator } from '@newwork/nw-design-system'
import { useFlowStudioStore } from '../../../hooks/useFlowStudioStore'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import type { DecisionNodeConfig, DesignerMode } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { AssignmentMode } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { UserDecisionApprovalSection } from './UserDecisionApprovalSection'
import { UserDecisionHeaderSection } from './UserDecisionHeaderSection'
import { UserDecisionAssignmentSection } from './UserDecisionAssignmentSection'
import { UserDecisionDueSection } from './UserDecisionDueSection'

interface UserDecisionConfigProps {
  config: DecisionNodeConfig
  update: (partial: Partial<DecisionNodeConfig>) => void
  mode: DesignerMode
  testId: string
  accessToken: string
  studioData: FlowStudioData
  /** Edge management for syncing branches with options */
  branchEdges: Array<{ id: string; source: string; target: string; label?: string }>
  nodeId: string
  availableStartFields: Array<{ name: string; label: string }>
}

export const UserDecisionConfig: React.FC<UserDecisionConfigProps> = ({
  config,
  update,
  mode,
  testId,
  branchEdges,
  nodeId,
  accessToken,
  studioData,
  availableStartFields
}) => {
  const expressionSuggestions = useStudioExpressionSuggestions()
  const decisionType = config.userConfig?.userDecisionType ?? 'APPROVAL'
  const isApproval = decisionType === 'APPROVAL'
  const nodes = useFlowStudioStore(s => s.nodes)
  const dataSources = useMemo(
    () => ({
      catalogs: studioData.catalogs,
      catalogsLoading: studioData.catalogsLoading,
      catalogsError: studioData.catalogsError,
      catalogsQuery: studioData.catalogsQuery,
      catalogsHasMore: studioData.catalogsHasMore,
      searchCatalogs: studioData.searchCatalogs,
      loadMoreCatalogs: studioData.loadMoreCatalogs,
      entities: studioData.entities,
      entitiesLoading: studioData.entitiesLoading,
      entitiesError: studioData.entitiesError
    }),
    [
      studioData.catalogs,
      studioData.catalogsError,
      studioData.catalogsHasMore,
      studioData.catalogsLoading,
      studioData.catalogsQuery,
      studioData.entities,
      studioData.entitiesError,
      studioData.entitiesLoading,
      studioData.loadMoreCatalogs,
      studioData.searchCatalogs
    ]
  )

  const defaultDecisionTitle = useMemo(() => {
    const node = nodes.find(n => n.id === nodeId)
    return String(node?.label || 'Decision').trim() || 'Decision'
  }, [nodeId, nodes])

  useEffect(() => {
    if (config.userConfig) return
    update({
      userConfig: {
        userDecisionType: 'APPROVAL',
        title: defaultDecisionTitle,
        message: 'Please select an outcome.',
        options: [],
        assignment: {
          targets: { users: ['{{$orgchart.managerByUserId[$workflow.initiator]}}'] },
          assignmentMode: AssignmentMode.ASSIGN_DEFERRED,
          allowReassignment: true
        }
      }
    })
  }, [config.userConfig, defaultDecisionTitle, update])

  const baseUserConfig = useMemo(() => {
    return (
      config.userConfig ?? {
        userDecisionType: decisionType,
        options: [],
        assignment: {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }
    )
  }, [config.userConfig, decisionType, isApproval])

  const assignmentValue: TaskAssignment = useMemo(() => {
    return {
      targets: baseUserConfig.assignment?.targets ?? null,
      assignmentMode: (baseUserConfig.assignment?.assignmentMode ?? AssignmentMode.CLAIM) as any,
      allowReassignment: (baseUserConfig.assignment as any)?.allowReassignment ?? true
    }
  }, [baseUserConfig.assignment])

  return (
    <>
      <UserDecisionHeaderSection
        title={config.userConfig?.title ?? ''}
        message={config.userConfig?.message ?? ''}
        defaultDecisionTitle={defaultDecisionTitle}
        onChangeTitle={value => update({ userConfig: { ...(config.userConfig as any), title: value } })}
        onChangeMessage={value => update({ userConfig: { ...(config.userConfig as any), message: value } })}
        suggestions={expressionSuggestions}
        dataSources={dataSources}
        testId={testId}
      />

      {isApproval ? (
        <UserDecisionApprovalSection
          config={config}
          update={update}
          mode={mode}
          testId={testId}
          branchEdges={branchEdges}
        />
      ) : (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-user-custom-outcomes-hint`}>
          Custom choices are defined in the Outcomes section above.
        </p>
      )}

      <Separator />

      <UserDecisionAssignmentSection
        mode={mode}
        accessToken={accessToken}
        isApproval={isApproval}
        value={assignmentValue}
        onChange={next =>
          update({
            userConfig: {
              ...baseUserConfig,
              assignment: next as any,
              options: baseUserConfig.options ?? []
            } as any
          })
        }
        availableStartFields={availableStartFields}
        data-testid={`${testId}-user-assignment`}
      />

      {mode === 'advanced' && (
        <UserDecisionDueSection
          timeoutMinutes={config.userConfig?.timeoutMinutes}
          onChangeTimeoutMinutes={timeoutMinutes => update({ userConfig: { ...config.userConfig!, timeoutMinutes } })}
          data-testid={`${testId}-user-due`}
        />
      )}
    </>
  )
}
