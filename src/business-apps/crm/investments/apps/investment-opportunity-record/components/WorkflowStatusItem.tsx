import React from 'react';
import { Card, Progress, Tag, Tooltip, Space, Typography, Divider, Button, Modal, Input, message } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, PlayCircleOutlined, PauseCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { WorkflowStatus, WorkflowStep } from '../types/stageTransition';
import { WorkflowStatusService } from '../services/WorkflowStatusService';
import { useState } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text, Title } = Typography;

interface WorkflowStatusItemProps {
  workflow: WorkflowStatus;
  accessToken: string;
  onStepCompleted?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'RUNNING':
      return 'processing';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'TERMINATED':
      return 'default';
    default:
      return 'default';
  }
};

const getStepStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'processing';
    case 'SCHEDULED':
      return 'warning';
    case 'QUEUED':
      return 'default';
    case 'FAILED':
      return 'error';
    default:
      return 'default';
  }
};

const getStepStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'IN_PROGRESS':
      return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
    case 'SCHEDULED':
      return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    case 'QUEUED':
      return <PauseCircleOutlined style={{ color: '#d9d9d9' }} />;
    default:
      return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
};

const getAssignmentTargetsText = (targets: any) => {
  if (!targets) return '';
  
  const parts = [];
  if (targets.organizationalUnits?.length) {
    parts.push(`Units: ${targets.organizationalUnits.join(', ')}`);
  }
  if (targets.capabilities?.length) {
    parts.push(`Capabilities: ${targets.capabilities.join(', ')}`);
  }
  if (targets.users?.length) {
    parts.push(`Users: ${targets.users.join(', ')}`);
  }
  
  return parts.join(' | ');
};

const canApproveStep = (step: WorkflowStep) => {
  // For now, allow approval of any pending/scheduled step
  // In a real implementation, this would check user permissions
  return step.status === 'PENDING' || step.status === 'SCHEDULED';
};

export const WorkflowStatusItem: React.FC<WorkflowStatusItemProps> = ({ workflow, accessToken, onStepCompleted }) => {
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApproveStep = (step: WorkflowStep) => {
    setCurrentStep(step);
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const handleApprovalSubmit = async (approved: boolean) => {
    if (!currentStep) return;
    
    setIsSubmitting(true);
    try {
      const success = await WorkflowStatusService.completeWorkflowStep(
        workflow.id,
        currentStep.id,
        accessToken,
        {
          approved,
          comment: approvalComment,
          approverId: 'current-user' // In real implementation, get from context
        }
      );
      
      if (success) {
        message.success(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowStatus.stepCompleted',
            `Step ${approved ? 'approved' : 'rejected'} successfully`
          )
        );
        setApprovalModalVisible(false);
        onStepCompleted?.(); // Trigger refresh
      } else {
        message.error(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowStatus.stepError',
            'Failed to complete step'
          )
        );
      }
    } catch (error) {
      console.error('Error completing step:', error);
      message.error(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.workflowStatus.stepError',
          'Failed to complete step'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card 
      className="gba:mb-4 gba:shadow-sm"
      data-testid={`workflow-status-${workflow.id}`}
      title={
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <Title level={5} className="gba:mb-0">
              {workflow.name || getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.workflowTitle',
                'Workflow'
              )}
            </Title>
            <Text type="secondary" className="gba:text-xs">
              ID: {workflow.id}
            </Text>
          </div>
          <Tag color={getStatusColor(workflow.status)}>
            {workflow.status}
          </Tag>
        </div>
      }
    >
      {/* Progress Section */}
      <div className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <Text strong>
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowProgress',
              'Progress'
            )}
          </Text>
          <Text type="secondary">
            {workflow.completedSteps || 0} / {workflow.totalSteps || workflow.steps.length} 
            {workflow.progress !== undefined && ` (${workflow.progress}%)`}
          </Text>
        </div>
        <Progress 
          percent={workflow.progress || 0} 
          status={workflow.status === 'COMPLETED' ? 'success' : 'active'}
          className="gba:mb-2"
        />
        {workflow.currentStep !== undefined && (
          <Text type="secondary" className="gba:text-xs">
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowCurrentStep',
              'Current step'
            )}: {workflow.currentStep + 1}
          </Text>
        )}
      </div>

      <Divider className="gba:my-3" />

      {/* Steps Section */}
      <div>
        <Text strong className="gba:mb-3 gba:block">
          {getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowSteps',
            'Workflow Steps'
          )}
        </Text>
        
        <div className="gba:space-y-3">
          {workflow.steps.map((step, index) => (
            <div 
              key={step.id} 
              className="gba:border gba:border-gray-200 gba:rounded-lg gba:p-3 gba:bg-gray-50"
              data-testid={`workflow-step-${step.id}`}
            >
                              <div className="gba:flex gba:items-start gba:justify-between">
                  <div className="gba:flex gba:items-center gba:flex-1">
                    <div className="gba:mr-3">
                      {getStepStatusIcon(step.status)}
                    </div>
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <Text strong>{step.name}</Text>
                        <Tag size="small" color={getStepStatusColor(step.status)}>
                          {step.status}
                        </Tag>
                        {step.type && (
                          <Tag size="small" color="blue">
                            {step.type}
                          </Tag>
                        )}
                      </div>
                      
                      {/* Manual Approval Buttons */}
                      {canApproveStep(step) && (
                        <div className="gba:mt-2 gba:flex gba:gap-2">
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={() => handleApproveStep(step)}
                            data-testid={`approve-step-${step.id}`}
                          >
                            {getTranslationFromI18nKeyAndLabel(
                              'crm:opportunity.workflowStatus.approve',
                              'Approve'
                            )}
                          </Button>
                          <Button
                            danger
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => handleApproveStep(step)}
                            data-testid={`reject-step-${step.id}`}
                          >
                            {getTranslationFromI18nKeyAndLabel(
                              'crm:opportunity.workflowStatus.reject',
                              'Reject'
                            )}
                          </Button>
                        </div>
                      )}
                    
                    {step.message && (
                      <Text type="secondary" className="gba:text-sm gba:block gba:mb-1">
                        {step.message}
                      </Text>
                    )}
                    
                    <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-xs gba:text-gray-600">
                      {step.dueDate && (
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'crm:opportunity.workflowDueDate',
                            'Due'
                          )}: {formatDate(step.dueDate)}
                        </span>
                      )}
                      {step.expectedStartAt && (
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'crm:opportunity.workflowExpectedStart',
                            'Expected Start'
                          )}: {formatDate(step.expectedStartAt)}
                        </span>
                      )}
                      {step.expectedFinishAt && (
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'crm:opportunity.workflowExpectedFinish',
                            'Expected Finish'
                          )}: {formatDate(step.expectedFinishAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Assignment Information */}
              {(step.assignmentMode || step.assignmentTargets) && (
                <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-gray-200">
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
                    {step.assignmentMode && (
                      <Tag size="small" color="purple">
                        {step.assignmentMode}
                      </Tag>
                    )}
                    {step.allowReassignment !== undefined && (
                      <Tag size="small" color={step.allowReassignment ? 'green' : 'red'}>
                        {step.allowReassignment ? 'Reassignable' : 'Fixed Assignment'}
                      </Tag>
                    )}
                    {step.assignmentTargets && (
                      <Tooltip title={getAssignmentTargetsText(step.assignmentTargets)}>
                        <Tag size="small" color="orange">
                          {getTranslationFromI18nKeyAndLabel(
                            'crm:opportunity.workflowAssignments',
                            'Assignments'
                          )}
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Metadata */}
      <Divider className="gba:my-3" />
      
      <div className="gba:text-xs gba:text-gray-600">
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <div>
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.workflowCreated',
                'Created'
              )}: {formatDate(workflow.createdAt)}
            </Text>
          </div>
          <div>
            <Text type="secondary">
              {getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.workflowTemplate',
                'Template'
              )}: {workflow.templateId}
            </Text>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <Modal
        title={
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowStatus.approvalModalTitle',
            'Step Approval'
          )
        }
        open={approvalModalVisible}
        onCancel={() => setApprovalModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setApprovalModalVisible(false)}>
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowStatus.cancel',
              'Cancel'
            )}
          </Button>,
          <Button
            key="reject"
            danger
            loading={isSubmitting}
            onClick={() => handleApprovalSubmit(false)}
          >
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowStatus.reject',
              'Reject'
            )}
          </Button>,
          <Button
            key="approve"
            type="primary"
            loading={isSubmitting}
            onClick={() => handleApprovalSubmit(true)}
          >
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.workflowStatus.approve',
              'Approve'
            )}
          </Button>
        ]}
        data-testid="approval-modal"
      >
        {currentStep && (
          <div className="gba:space-y-4">
            <div>
              <Text strong>
                {getTranslationFromI18nKeyAndLabel(
                  'crm:opportunity.workflowStatus.stepName',
                  'Step'
                )}: {currentStep.name}
              </Text>
            </div>
            
            <div>
              <Text>
                {getTranslationFromI18nKeyAndLabel(
                  'crm:opportunity.workflowStatus.approvalComment',
                  'Approval Comment (Optional)'
                )}
              </Text>
              <Input.TextArea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'crm:opportunity.workflowStatus.commentPlaceholder',
                  'Add your approval comment here...'
                )}
                rows={3}
                className="gba:mt-2"
                data-testid="approval-comment-input"
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}; 