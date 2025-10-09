import React, { useState, useEffect } from 'react'
import { Card, Button, Select, Space, Alert, Divider, Tag, Spin } from 'antd'
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { WorkflowsStatusModal } from './WorkflowsStatusModal'
import { WorkflowStatusService } from '../services/WorkflowStatusService'
import {
  getStageTransitionConditions,
  hasStageTransitionConditions,
  StageTransitionCondition
} from '../config/stageTransitionConditions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const { Option } = Select

interface StageTransitionWorkflowCardProps {
  opportunityId: string
  opportunityData: any
  accessToken: string
  currentStage: string
  stages: any[]
}

export const StageTransitionWorkflowCard: React.FC<StageTransitionWorkflowCardProps> = ({
  opportunityId,
  opportunityData,
  accessToken,
  currentStage,
  stages
}) => {
  const [selectedFromStage, setSelectedFromStage] = useState<string>(currentStage)
  const [selectedToStage, setSelectedToStage] = useState<string>('')
  const [transitionConditions, setTransitionConditions] = useState<StageTransitionCondition[]>([])
  const [workflowsModalVisible, setWorkflowsModalVisible] = useState(false)
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reset to stage when current stage changes
  useEffect(() => {
    setSelectedFromStage(currentStage)
    setSelectedToStage('')
    setTransitionConditions([])
  }, [currentStage])

  const handleStageSelection = () => {
    if (!selectedToStage) {
      setError(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.selectTargetStage', 'Please select a target stage')
      )
      return
    }

    if (selectedFromStage === selectedToStage) {
      setError(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.sameStage', 'From and To stages cannot be the same')
      )
      return
    }

    setError(null)
    setSuccess(null)

    // Check for transition conditions
    const conditions = getStageTransitionConditions(
      selectedFromStage,
      selectedToStage,
      opportunityData?.salesPipelineRef || 'SalesPipeline:v1:STANDARD',
      opportunityData?.estimatedAmount
    )

    setTransitionConditions(conditions)

    if (conditions.length > 0) {
      setSuccess(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.workflow.conditionsFound',
          `Found ${conditions.length} approval condition(s) for this transition`
        )
      )
    } else {
      setSuccess(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.workflow.noConditions',
          'No approval conditions required for this transition'
        )
      )
    }
  }

  const handleStartWorkflows = async () => {
    if (transitionConditions.length === 0) {
      setError(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.workflow.noConditionsToStart',
          'No conditions to start workflows for'
        )
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Start workflows for each condition
      for (const condition of transitionConditions) {
        await WorkflowStatusService.startStageTransitionWorkflow(opportunityId, condition, opportunityData, accessToken)
      }

      // Get active workflows
      const workflows = await WorkflowStatusService.getStageTransitionWorkflows(
        opportunityId,
        selectedFromStage,
        selectedToStage,
        accessToken
      )

      setActiveWorkflows(workflows)
      setWorkflowsModalVisible(true)
      setSuccess(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.workflow.started',
          'Workflows started successfully! Check the modal for status.'
        )
      )
    } catch (error) {
      console.error('Error starting workflows:', error)
      setError(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.workflow.startError',
          'Failed to start workflows. Please try again.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCheckExistingWorkflows = async () => {
    if (!selectedToStage) {
      setError(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.selectTargetStage', 'Please select a target stage')
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      const workflows = await WorkflowStatusService.getStageTransitionWorkflows(
        opportunityId,
        selectedFromStage,
        selectedToStage,
        accessToken
      )

      if (workflows.length > 0) {
        setActiveWorkflows(workflows)
        setWorkflowsModalVisible(true)
        setSuccess(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflow.existingFound',
            `Found ${workflows.length} active workflow(s) for this transition`
          )
        )
      } else {
        setSuccess(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflow.noExisting',
            'No active workflows found for this transition'
          )
        )
      }
    } catch (error) {
      console.error('Error checking workflows:', error)
      setError(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.checkError', 'Failed to check existing workflows')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleWorkflowsCompleted = () => {
    setWorkflowsModalVisible(false)
    setSuccess(
      getTranslationFromI18nKeyAndLabel(
        'crm:opportunity.workflow.completed',
        'All workflows completed! Stage transition can proceed.'
      )
    )
  }

  const handleCancelWorkflowsModal = () => {
    setWorkflowsModalVisible(false)
  }

  const getConditionSummary = () => {
    if (transitionConditions.length === 0) return null

    return (
      <div className="gba:mt-4">
        <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.requiredApprovals', 'Required Approvals')}
        </h4>
        <div className="gba:space-y-4">
          {transitionConditions.map((condition, conditionIndex) => (
            <div key={condition.id} className="gba:border gba:border-gray-200 gba:rounded-lg gba:p-3">
              {/* Condition Header */}
              <div className="gba:flex gba:items-center gba:space-x-2 gba:mb-3">
                <Tag color={conditionIndex === 0 ? 'blue' : 'gold'}>
                  {conditionIndex === 0 ? 'Default' : 'High-Value'}
                </Tag>
                <span className="gba:text-sm gba:font-medium gba:text-gray-900">{condition.description}</span>
              </div>

              {/* Tasks within this condition */}
              <div className="gba:space-y-2 gba:ml-4">
                {condition.conditions.map((task, taskIndex) => (
                  <div key={`${condition.id}-${taskIndex}`} className="gba:flex gba:items-start gba:space-x-2">
                    <Tag color="green" className="gba:mt-0.5">
                      {taskIndex + 1}
                    </Tag>
                    <div className="gba:flex gba:flex-col gba:flex-1">
                      <span className="gba:text-sm gba:font-medium gba:text-gray-900">{task.title}</span>
                      <span className="gba:text-xs gba:text-gray-500">{task.description}</span>
                      <div className="gba:flex gba:items-center gba:space-x-2 gba:mt-1">
                        <span className="gba:text-xs gba:text-gray-400">Timeout: {task.timeoutMinutes / 60}h</span>
                        <span className="gba:text-xs gba:text-gray-400">
                          Auto-assign: {task.autoAssign ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isHighValueOpportunity = opportunityData?.estimatedAmount >= 100000

  return (
    <>
      <Card
        title={
          <div className="gba:flex gba:items-center gba:space-x-2">
            <PlayCircleOutlined className="gba:text-blue-500" />
            <span>
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.cardTitle', 'Stage Transition Workflows')}
            </span>
            {isHighValueOpportunity && (
              <Tag color="gold">
                {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.highValue', 'High Value')}
              </Tag>
            )}
          </div>
        }
        className="gba:mb-6"
        data-testid="stage-transition-workflow-card"
      >
        <div className="gba:space-y-4">
          {/* Current Stage Info */}
          <div className="gba:bg-gray-50 gba:p-3 gba:rounded">
            <p className="gba:text-sm gba:text-gray-600 gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.currentStage', 'Current Stage')}
            </p>
            <p className="gba:font-medium gba:text-gray-900">{currentStage}</p>
            {isHighValueOpportunity && (
              <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'crm:opportunity.workflow.highValueNote',
                  'High-value opportunity: Additional approvals may be required'
                )}
              </p>
            )}
          </div>

          {/* Stage Selection */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.fromStage', 'From Stage')}
              </label>
              <Select
                value={selectedFromStage}
                onChange={setSelectedFromStage}
                className="gba:w-full"
                data-testid="from-stage-select"
              >
                {stages.map(stage => (
                  <Option key={stage.value} value={stage.value}>
                    {stage.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.toStage', 'To Stage')}
              </label>
              <Select
                value={selectedToStage}
                onChange={setSelectedToStage}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'crm:opportunity.workflow.selectTarget',
                  'Select target stage'
                )}
                className="gba:w-full"
                data-testid="to-stage-select"
              >
                {stages
                  .filter(stage => stage.value !== selectedFromStage)
                  .map(stage => (
                    <Option key={stage.value} value={stage.value}>
                      {stage.label}
                    </Option>
                  ))}
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:space-x-2">
            <Button
              type="primary"
              onClick={handleStageSelection}
              icon={<CheckCircleOutlined />}
              data-testid="check-conditions-button"
            >
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.checkConditions', 'Check Conditions')}
            </Button>

            <Button
              onClick={handleCheckExistingWorkflows}
              icon={<ClockCircleOutlined />}
              loading={loading}
              data-testid="check-workflows-button"
            >
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.checkExisting', 'Check Existing')}
            </Button>

            {transitionConditions.length > 0 && (
              <Button
                type="primary"
                onClick={handleStartWorkflows}
                icon={<PlayCircleOutlined />}
                loading={loading}
                data-testid="start-workflows-button"
              >
                {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.startWorkflows', 'Start Workflows')}
              </Button>
            )}
          </div>

          {/* Conditions Summary */}
          {getConditionSummary()}

          {/* Status Messages */}
          {error && (
            <Alert
              message={getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.error', 'Error')}
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {success && (
            <Alert
              message={getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.success', 'Success')}
              description={success}
              type="success"
              showIcon
              closable
              onClose={() => setSuccess(null)}
            />
          )}

          {/* Loading State */}
          {loading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-4">
              <Spin size="small" />
              <span className="gba:ml-2 gba:text-gray-600">
                {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflow.loading', 'Processing...')}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Workflows Status Modal */}
      <WorkflowsStatusModal
        visible={workflowsModalVisible}
        workflows={activeWorkflows}
        opportunityId={opportunityId}
        fromStage={selectedFromStage}
        toStage={selectedToStage}
        opportunityData={opportunityData}
        accessToken={accessToken}
        onWorkflowsCompleted={handleWorkflowsCompleted}
        onCancel={handleCancelWorkflowsModal}
      />
    </>
  )
}
