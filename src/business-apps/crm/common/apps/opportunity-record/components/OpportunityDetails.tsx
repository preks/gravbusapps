import React, { useState } from 'react';
import { Card, Tooltip, Modal, Button } from 'antd';
import { Badge } from '@newwork/nw-design-system';
import { InfoCircleOutlined, CheckCircleFilled, CloseCircleFilled, UserOutlined, CalendarOutlined, FileTextOutlined, PlusOutlined, EditOutlined, BellOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils';

interface StageCondition {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  generateTask?: boolean;
  checkedType?: 'Automated' | 'User' | 'Manager' | 'Owner';
  deadlineEnabled?: boolean;
  deadlineDuration?: number;
  deadlineUnit?: string;
  details: {
    requirements: string[];
    approvedBy: string;
    dueDate: string;
    notes: string;
    relatedDocuments: string[];
  };
  externalTasks?: {
    id: string;
    title: string;
    status: 'Open' | 'In Progress' | 'Completed';
    assignee: string;
    dueDate: string;
  }[];
}

interface OpportunityDetailsProps {
  opportunityData: any;
  opportunityId: string;
  context: BusinessAppContextProps;
}

export const OpportunityDetails: React.FC<OpportunityDetailsProps> = ({ 
  opportunityData,
  opportunityId,
  context 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<StageCondition | null>(null);

  // Base mock data template for all conditions
  const baseConditionData = {
    isCompleted: false,
    generateTask: true,
    checkedType: 'User' as const,
    deadlineEnabled: true,
    deadlineDuration: 5,
    deadlineUnit: 'Days',
    details: {
      requirements: [
        'Complete all necessary documentation',
        'Obtain required approvals from stakeholders',
        'Verify all criteria have been met'
      ],
      approvedBy: 'Sarah Johnson',
      dueDate: '2024-02-01',
      notes: 'Standard condition with typical requirements and timeline.',
      relatedDocuments: ['Condition_Template.docx', 'Requirements_Checklist.pdf']
    },
    externalTasks: [
      {
        id: 'task-001',
        title: 'Complete condition requirements',
        status: 'In Progress' as const,
        assignee: 'Sarah Johnson',
        dueDate: '2024-02-01'
      }
    ]
  };

  // Mock data for stage conditions using base template
  const stageConditions: StageCondition[] = [
    {
      id: 'budget-confirmation',
      title: 'Budget confirmation received',
      description: 'Customer has confirmed allocated budget and decision authority',
      ...baseConditionData,
      isCompleted: true
    },
    {
      id: 'decision-maker',
      title: 'Decision maker identified',
      description: 'Direct contact established with final purchasing authority',
      ...baseConditionData
    },
    {
      id: 'technical-requirements',
      title: 'Technical requirements documented',
      description: 'All technical specifications and integration requirements defined',
      ...baseConditionData
    },
    {
      id: 'proposal-submitted',
      title: 'Proposal submitted and acknowledged',
      description: 'Formal proposal delivered and receipt confirmed by customer',
      ...baseConditionData
    },
    {
      id: 'legal-review',
      title: 'Legal review completed',
      description: 'Legal teams have reviewed and approved all contract terms',
      ...baseConditionData
    }
  ];

  const handleConditionClick = (condition: StageCondition) => {
    setSelectedCondition(condition);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedCondition(null);
  };



  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#52c41a';
      case 'In Progress': return '#1890ff';
      case 'Open': return '#faad14';
      default: return '#8c8c8c';
    }
  };

  const handleCreateTask = (condition: StageCondition) => {
    console.log('Creating task for condition:', condition.title);
    // TODO: Implement task creation
  };

  const handleCreateReminder = (condition: StageCondition) => {
    console.log('Creating reminder for condition:', condition.title);
    // TODO: Implement reminder creation
  };

  const handleEditCondition = (condition: StageCondition) => {
    console.log('Editing condition:', condition.title);
    // TODO: Implement condition editing
  };
  const cardTitle = (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
      <span>Stage required conditions</span>
      <Tooltip 
        title="They are conditions what need to be fulfilled and approved for stage transitions."
        placement="topRight"
      >
        <InfoCircleOutlined className="gba:text-gray-400 hover:gba:text-gray-600 gba:cursor-help" />
      </Tooltip>
    </div>
  );

  return (
    <Card 
      title={cardTitle}
      className="gba:h-full gba:w-full"
      style={{ width: '100%' }}
      data-testid="opportunity-details-card"
    >
      <div className="gba:space-y-3">
        {/* Pipeline and Stage Information */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border gba:border-gray-200">
          <div>
            <span className="gba:text-xs gba:font-medium gba:text-gray-600">Pipeline:</span>
            <span className="gba:text-sm gba:font-semibold gba:text-gray-800 gba:ml-1">
              {opportunityData?.salesPipeline?.value || 
               opportunityData?.pipeline?.value ||
               'No Pipeline'}
            </span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:font-medium gba:text-gray-600">Stage:</span>
            <Badge variant={getSalesPipelineStageBadgeVariant(opportunityData?.salesPipelineStage)}>
              {opportunityData?.salesPipelineStage?.value || 'No Stage'}
            </Badge>
          </div>
        </div>

        {/* Stage Conditions List */}
        <div className="gba:space-y-2">
          {stageConditions.map((condition) => (
            <div 
              key={condition.id}
              className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-gray-200 gba:bg-white hover:gba:bg-gray-50 gba:transition-colors"
              data-testid={`stage-condition-${condition.id}`}
            >
              {condition.isCompleted ? (
                <CheckCircleFilled 
                  className="gba:text-lg gba:flex-shrink-0" 
                  style={{ color: '#16a34a' }}
                />
              ) : (
                <CloseCircleFilled 
                  className="gba:text-lg gba:flex-shrink-0" 
                  style={{ color: '#9ca3af' }}
                />
              )}
              <div className="gba:flex-1">
                <p 
                  className="gba:text-sm gba:font-medium gba:text-gray-800 hover:gba:text-blue-600 gba:cursor-pointer gba:transition-colors"
                  onClick={() => handleConditionClick(condition)}
                  data-testid={`stage-condition-title-${condition.id}`}
                >
                  {condition.title}
                </p>
                <p className="gba:text-xs gba:text-gray-500 gba:mt-1">{condition.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Condition Details Modal */}
      <Modal
        title={
          <div className="gba:flex gba:items-center gba:gap-3">
            {selectedCondition?.isCompleted ? (
              <CheckCircleFilled style={{ color: '#16a34a' }} />
            ) : (
              <CloseCircleFilled style={{ color: '#9ca3af' }} />
            )}
            <span>{selectedCondition?.title}</span>
          </div>
        }
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={700}
        data-testid="stage-condition-details-modal"
      >
        {selectedCondition && (
          <div className="gba:space-y-6">
            {/* Description */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2">Description</h4>
              <p className="gba:text-sm gba:text-gray-600">{selectedCondition.description}</p>
            </div>

            {/* Status and Configuration */}
            <div className="gba:flex gba:gap-6">
              <div>
                <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2">Status</h4>
                <div className="gba:flex gba:items-center gba:gap-2">
                  {selectedCondition.isCompleted ? (
                    <>
                      <CheckCircleFilled style={{ color: '#16a34a' }} />
                      <span className="gba:text-sm gba:text-green-600 gba:font-medium">Completed</span>
                    </>
                  ) : (
                    <>
                      <CloseCircleFilled style={{ color: '#9ca3af' }} />
                      <span className="gba:text-sm gba:text-gray-500 gba:font-medium">Pending</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2">Checked By</h4>
                <span className="gba:text-sm gba:text-gray-600">{selectedCondition.checkedType || 'User'}</span>
              </div>
              {selectedCondition.deadlineEnabled && (
                <div>
                  <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2">Deadline</h4>
                  <span className="gba:text-sm gba:text-gray-600">
                    {selectedCondition.deadlineDuration} {selectedCondition.deadlineUnit}
                  </span>
                </div>
              )}
            </div>

            {/* Approved By and Due Date */}
            <div className="gba:flex gba:gap-6">
              <div className="gba:flex-1">
                <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2 gba:flex gba:items-center gba:gap-2">
                  <UserOutlined className="gba:text-gray-500" />
                  Approved By
                </h4>
                <p className="gba:text-sm gba:text-gray-600">{selectedCondition.details.approvedBy}</p>
              </div>
              <div className="gba:flex-1">
                <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2 gba:flex gba:items-center gba:gap-2">
                  <CalendarOutlined className="gba:text-gray-500" />
                  Due Date
                </h4>
                <p className="gba:text-sm gba:text-gray-600">{new Date(selectedCondition.details.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-3">Requirements</h4>
              <ul className="gba:space-y-2">
                {selectedCondition.details.requirements.map((requirement, index) => (
                  <li key={index} className="gba:flex gba:items-start gba:gap-2">
                    <span className="gba:w-1.5 gba:h-1.5 gba:bg-gray-400 gba:rounded-full gba:mt-2 gba:flex-shrink-0"></span>
                    <span className="gba:text-sm gba:text-gray-600">{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-2">Notes</h4>
              <div className="gba:bg-gray-50 gba:p-3 gba:rounded-lg gba:border">
                <p className="gba:text-sm gba:text-gray-600">{selectedCondition.details.notes}</p>
              </div>
            </div>

            {/* Related Documents */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-3 gba:flex gba:items-center gba:gap-2">
                <FileTextOutlined className="gba:text-gray-500" />
                Related Documents
              </h4>
              <div className="gba:space-y-2">
                {selectedCondition.details.relatedDocuments.map((document, index) => (
                  <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-gray-50 gba:rounded gba:border">
                    <FileTextOutlined className="gba:text-blue-500" />
                    <span className="gba:text-sm gba:text-blue-600 gba:cursor-pointer hover:gba:text-blue-800">{document}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Creation Capabilities */}
            <div>
              <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-3 gba:flex gba:items-center gba:gap-2">
                <PlusOutlined className="gba:text-gray-500" />
                Actions Available
              </h4>
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3">
                <Button
                  type="default"
                  icon={<PlusOutlined />}
                  onClick={() => handleCreateTask(selectedCondition)}
                  className="gba:w-full gba:flex gba:items-center gba:justify-center"
                  data-testid="create-task-button"
                >
                  Create Task
                </Button>
                <Button
                  type="default"
                  icon={<BellOutlined />}
                  onClick={() => handleCreateReminder(selectedCondition)}
                  className="gba:w-full gba:flex gba:items-center gba:justify-center"
                  data-testid="create-reminder-button"
                >
                  Set Reminder
                </Button>
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  onClick={() => handleEditCondition(selectedCondition)}
                  className="gba:w-full gba:flex gba:items-center gba:justify-center"
                  data-testid="edit-condition-button"
                >
                  Edit Condition
                </Button>
              </div>
            </div>

            {/* External Tasks (only show if generateTask is enabled) */}
            {selectedCondition.generateTask && selectedCondition.externalTasks && selectedCondition.externalTasks.length > 0 && (
              <div>
                <h4 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-3 gba:flex gba:items-center gba:gap-2">
                  <CheckCircleFilled className="gba:text-blue-500" />
                  Related Tasks
                  <span className="gba:text-xs gba:bg-blue-100 gba:text-blue-600 gba:px-2 gba:py-1 gba:rounded">
                    Auto-Generated
                  </span>
                </h4>
                <div className="gba:space-y-3">
                  {selectedCondition.externalTasks.map((task) => (
                    <div key={task.id} className="gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border">
                      <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                        <h5 className="gba:text-sm gba:font-medium gba:text-gray-800">{task.title}</h5>
                        <span 
                          className="gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-white"
                          style={{ backgroundColor: getTaskStatusColor(task.status) }}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-600">
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <UserOutlined />
                          <span>{task.assignee}</span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <CalendarOutlined />
                          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Generation Info */}
            {selectedCondition.generateTask && (
              <div className="gba:bg-blue-50 gba:p-3 gba:rounded-lg gba:border gba:border-blue-200">
                <div className="gba:flex gba:items-start gba:gap-2">
                  <InfoCircleOutlined className="gba:text-blue-500 gba:mt-0.5" />
                  <div>
                    <p className="gba:text-sm gba:font-medium gba:text-blue-800 gba:mb-1">
                      Automatic Task Generation Enabled
                    </p>
                    <p className="gba:text-xs gba:text-blue-600">
                      Tasks are automatically created when this condition becomes active. 
                      Completion verification is handled by: <strong>{selectedCondition.checkedType}</strong>
                      {selectedCondition.deadlineEnabled && (
                        <span> with deadline: <strong>{selectedCondition.deadlineDuration} {selectedCondition.deadlineUnit}</strong></span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}; 