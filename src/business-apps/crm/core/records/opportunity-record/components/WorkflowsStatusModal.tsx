import React, { useState, useEffect } from 'react'
import { Modal, Button, Spin, Alert, Divider, Empty } from 'antd'
import { ReloadOutlined, CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons'
import { WorkflowStatusItem } from './WorkflowStatusItem'
import { WorkflowStatusService } from '../services/WorkflowStatusService'
import { WorkflowStatus, StageTransitionCondition } from '../types/stageTransition'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface WorkflowsStatusModalProps {
  visible: boolean
  workflows: WorkflowStatus[]
  opportunityId: string
  fromStage: string
  toStage: string
  opportunityData: any
  accessToken: string
  onWorkflowsCompleted: () => void
  onCancel: () => void
  onStartWorkflows?: (conditions: StageTransitionCondition[]) => void
}

export const WorkflowsStatusModal: React.FC<WorkflowsStatusModalProps> = ({
  visible,
  workflows,
  opportunityId,
  fromStage,
  toStage,
  accessToken,
  onWorkflowsCompleted,
  onCancel,
  onStartWorkflows
}) => {
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check completion status when workflows change
  useEffect(() => {
    if (workflows.length > 0) {
      const allCompleted = checkAllCompleted()
      if (allCompleted) {
        // Small delay to show completion state
        setTimeout(() => {
          onWorkflowsCompleted()
        }, 1000)
      }
    }
  }, [workflows, onWorkflowsCompleted])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      // Trigger a refresh by calling the parent component's refresh function
      // This will be handled by the parent component that manages the workflows
      if (onStartWorkflows) {
        // For now, just trigger a page reload to refresh the data
        // In a real implementation, this would call the parent's refresh function
        window.location.reload()
      }
    } catch (error) {
      console.error('Error refreshing workflows:', error)
      setError(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.refreshError', 'Failed to refresh workflows')
      )
    } finally {
      setRefreshing(false)
    }
  }

  const checkAllCompleted = () => {
    return workflows.every(workflow => workflow.status === 'COMPLETED')
  }

  const getCompletedCount = () => {
    return workflows.filter(workflow => workflow.status === 'COMPLETED').length
  }

  const getPendingCount = () => {
    return workflows.filter(workflow => workflow.status === 'RUNNING').length
  }

  const getFailedCount = () => {
    return workflows.filter(workflow => workflow.status === 'FAILED' || workflow.status === 'TERMINATED').length
  }

  const handleCancelWorkflows = async () => {
    try {
      await WorkflowStatusService.cancelStageTransitionWorkflows(opportunityId, fromStage, toStage, accessToken)
      onCancel()
    } catch (error) {
      console.error('Error canceling workflows:', error)
      setError(
        getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.cancelError', 'Failed to cancel workflows')
      )
    }
  }

  const renderHeader = () => (
    <div className="gba:flex gba:items-center gba:justify-between">
      <div>
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
          {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.title', 'Stage Transition Approvals')}
        </h3>
        <p className="gba:text-sm gba:text-gray-600">
          {fromStage} → {toStage}
        </p>
      </div>
      <Button
        icon={<ReloadOutlined />}
        onClick={handleRefresh}
        loading={refreshing}
        size="small"
        data-testid="refresh-workflows-button"
      >
        {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.refresh', 'Refresh')}
      </Button>
    </div>
  )

  const renderSummary = () => {
    const completed = getCompletedCount()
    const pending = getPendingCount()
    const failed = getFailedCount()
    const total = workflows.length

    if (total === 0) return null

    return (
      <div className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.summary', 'Approval Summary')}
          </span>
          <span className="gba:text-sm gba:text-gray-500">
            {completed}/{total}{' '}
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.completed', 'completed')}
          </span>
        </div>

        <div className="gba:flex gba:space-x-4 gba:text-sm">
          <div className="gba:flex gba:items-center">
            <CheckCircleFilled className="gba:text-green-500 gba:mr-1" />
            <span className="gba:text-green-700">
              {completed} {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.approved', 'Approved')}
            </span>
          </div>
          {pending > 0 && (
            <div className="gba:flex gba:items-center">
              <ExclamationCircleFilled className="gba:text-blue-500 gba:mr-1" />
              <span className="gba:text-blue-700">
                {pending} {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.pending', 'Pending')}
              </span>
            </div>
          )}
          {failed > 0 && (
            <div className="gba:flex gba:items-center">
              <ExclamationCircleFilled className="gba:text-red-500 gba:mr-1" />
              <span className="gba:text-red-700">
                {failed} {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.failed', 'Failed')}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    // Debug logging
    console.log('WorkflowsStatusModal - workflows:', workflows)
    console.log('WorkflowsStatusModal - workflows.length:', workflows.length)

    if (refreshing) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <Spin size="large" />
          <span className="gba:ml-3 gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.refreshing', 'Refreshing workflows...')}
          </span>
        </div>
      )
    }

    if (error) {
      return (
        <Alert
          message={getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.error', 'Error')}
          description={error}
          type="error"
          showIcon
          className="gba:mb-4"
        />
      )
    }

    if (workflows.length === 0) {
      return (
        <div className="gba:py-8">
          <Empty
            description={getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowStatus.noWorkflows',
              'No workflows found for this stage transition.'
            )}
          />
          <div className="gba:mt-4 gba:text-center gba:text-sm gba:text-gray-500">
            Debug: workflows.length = {workflows.length}
          </div>
        </div>
      )
    }

    return (
      <div className="gba:space-y-4">
        {renderSummary()}
        <Divider />

        <div className="gba:space-y-3">
          {workflows.map(workflow => (
            <WorkflowStatusItem
              key={workflow.id}
              workflow={workflow}
              accessToken={accessToken}
              onStepCompleted={handleRefresh}
            />
          ))}
        </div>

        {checkAllCompleted() && (
          <Alert
            message={getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowStatus.allCompleted',
              'All Approvals Completed!'
            )}
            description={getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowStatus.canProceed',
              'You can now proceed with the stage change.'
            )}
            type="success"
            showIcon
            className="gba:mt-4"
          />
        )}
      </div>
    )
  }

  const renderFooter = () => {
    const allCompleted = checkAllCompleted()
    const hasFailed = getFailedCount() > 0

    return (
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          {!allCompleted && (
            <Button onClick={handleCancelWorkflows} danger size="small" data-testid="cancel-workflows-button">
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.cancel', 'Cancel Workflows')}
            </Button>
          )}
        </div>
        <div className="gba:flex gba:space-x-2">
          <Button onClick={onCancel}>
            {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.close', 'Close')}
          </Button>
          {allCompleted && !hasFailed && (
            <Button type="primary" onClick={onWorkflowsCompleted} data-testid="proceed-stage-change-button">
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.workflowStatus.proceed', 'Proceed with Stage Change')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Modal
      title={renderHeader()}
      open={visible}
      onCancel={onCancel}
      footer={renderFooter()}
      width={800}
      className="gba:workflows-status-modal"
      data-testid="workflows-status-modal"
    >
      {renderContent()}
    </Modal>
  )
}
