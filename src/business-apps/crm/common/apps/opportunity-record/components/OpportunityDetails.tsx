import React from 'react';
import { Card, Tooltip } from 'antd';
import { Badge } from '@newwork/nw-design-system';
import { InfoCircleOutlined, CheckCircleFilled, CloseCircleFilled, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

interface StageCondition {
  id: string;
  stageConditionStatusId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  generateTask?: boolean;
  checkedType?: 'Automated' | 'User' | 'Manager' | 'Owner';
  deadlineEnabled?: boolean;
  deadlineDuration?: number;
  deadlineUnit?: string;
  completedBy?: string | null; // Real completed by employee name
  deadlineAt?: string | null; // Real deadline date
  completedAt?: string | null; // When it was completed
  details: {
    approvedBy: string;
    dueDate: string;
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
  stageConditionStatuses: any[];
  context: BusinessAppContextProps;
}

export const OpportunityDetails: React.FC<OpportunityDetailsProps> = ({ 
  opportunityData,
  stageConditionStatuses,
  context 
}) => {


  // Transform real stage condition status data to UI format
  const transformStageConditionStatusToUI = (statusData: any): StageCondition => {
    const config = statusData.configSnapshot || statusData.salesPipelineStageCondition?.objectValue || {};
    
    // Extract deadline information
    const deadlineEnabled = config.deadline_enabled || false;
    const deadlineDuration = config.deadline_duration || 1;
    const deadlineUnit = config.deadline_duration_measurement_unit_ref === 'MeasurementUnit:v1:DAY' ? 'Days' : 'Weeks';
    
    // Calculate due date based on deadline
    const dueDate = statusData.deadlineAt ? 
      new Date(statusData.deadlineAt).toISOString().split('T')[0] : 
      new Date(Date.now() + (deadlineDuration * (deadlineUnit === 'Days' ? 1 : 7) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    // Get approver information
    const approvedBy = statusData.completedByEmployee ? 
      `${statusData.completedByEmployee.firstName} ${statusData.completedByEmployee.lastName}` : 
      'System';
    
    // Determine check type
    const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated';
    
    return {
      id: statusData.salesPipelineStageCondition?.code || statusData.id,
      stageConditionStatusId: statusData.id, // Add the stage condition status ID for the action button
      title: statusData.salesPipelineStageCondition?.value || 'Unknown Condition',
      description: config.description || 'No description available',
      isCompleted: statusData.completed || false,
      generateTask: config.generate_task || config.generateTask || false,
      checkedType: checkedType as 'Automated' | 'User' | 'Manager' | 'Owner',
      deadlineEnabled,
      deadlineDuration,
      deadlineUnit,
      completedBy: statusData.completedByEmployee ? `${statusData.completedByEmployee.firstName} ${statusData.completedByEmployee.lastName}` : null,
      deadlineAt: statusData.deadlineAt,
      completedAt: statusData.completedAt,
    details: {
        approvedBy,
        dueDate,
      relatedDocuments: ['Condition_Template.docx', 'Requirements_Checklist.pdf']
    },
      externalTasks: statusData.generateTask ? [
        {
          id: `task-${statusData.id}`,
          title: `Complete ${statusData.salesPipelineStageCondition?.value || 'condition'} requirements`,
          status: statusData.completed ? 'Completed' as const : 'In Progress' as const,
          assignee: approvedBy,
          dueDate
        }
      ] : []
    };
  };

  // Filter stage conditions to only show those belonging to the current stage
  const getCurrentStageConditions = (stageConditionStatuses: any[], currentStage: string): any[] => {
    const expectedStageId = `SalesPipelineStage:v1:${currentStage}`;
    return stageConditionStatuses.filter(statusData => {
      const parentEntryId = statusData.salesPipelineStageCondition?.parentEntryId;
      return parentEntryId === expectedStageId;
    });
  };

  // Use real data if available, filter for current stage, otherwise fall back to empty array
  const currentStageConditionStatuses = stageConditionStatuses.length > 0 
    ? getCurrentStageConditions(stageConditionStatuses, opportunityData?.salesPipelineStage?.code || '')
    : [];
    
  const stageConditions: StageCondition[] = currentStageConditionStatuses.map(transformStageConditionStatusToUI);




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
        <div className="gba:space-y-3">
          {stageConditions.length > 0 ? (
            stageConditions.map((condition) => (
            <div 
              key={condition.id}
                className="gba:relative gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 gba:bg-white hover:gba:bg-gray-50 gba:transition-colors"
              data-testid={`stage-condition-${condition.id}`}
            >
              {/* Due Date in Top Right Corner */}
              {condition.deadlineAt && (
                <div className="gba:absolute gba:top-3 gba:right-3 gba:text-xs gba:text-gray-500 gba:bg-gray-50 gba:px-2 gba:py-1 gba:rounded-md gba:border">
                  <CalendarOutlined className="gba:text-gray-400 gba:mr-1" />
                  {new Date(condition.deadlineAt).toLocaleDateString()}
                </div>
              )}
                {/* Header with Status Icon and Title */}
                <div className="gba:flex gba:items-start gba:gap-3 gba:mb-3">
              <div className="gba:flex-shrink-0">
                <AppActionButton
                  data-testid={`stage-condition-status-icon-${condition.stageConditionStatusId}`}
                  variant="ghost"
                  showIcon={false}
                  size="small"
                  contextsArray={[FlowContextName.saveOpportunityStageConditionStatus]}
                  externalContextData={{
                    stageConditionStatusId: condition.stageConditionStatusId 
                  }}
                  prefixDataTestId="stage-condition-status-icon"
                  accessToken={context.accessToken}
                  emptyStateBehavior="disable"
                  deferMainContextRequestsUntilClick
                  onClick={(e) => e.stopPropagation()}
                  className="gba:p-1 gba:hover:bg-gray-100 gba:rounded-full gba:transition-colors gba:border-0 gba:relative gba:group"
                  style={{ minWidth: 'auto', minHeight: 'auto', background: 'transparent' }}
                >
                  {/* Default State Icon */}
                  <div className="gba:block group-hover:gba:hidden gba:transition-opacity">
                    {condition.isCompleted ? (
                      <CheckCircleFilled 
                        className="gba:text-lg" 
                        style={{ color: '#16a34a' }}
                      />
                    ) : (
                      <CloseCircleFilled 
                        className="gba:text-lg" 
                        style={{ color: '#9ca3af' }}
                      />
                    )}
                  </div>
                  
                  {/* Hover State Icon (opposite of current state) */}
                  <div className="gba:hidden group-hover:gba:block gba:transition-opacity">
                    {condition.isCompleted ? (
                      <CloseCircleFilled 
                        className="gba:text-lg" 
                        style={{ color: '#f59e0b' }}
                      />
                    ) : (
                      <CheckCircleFilled 
                        className="gba:text-lg" 
                        style={{ color: '#16a34a' }}
                      />
                    )}
                  </div>
                </AppActionButton>
              </div>
              <div className="gba:flex-1">
                    <h4 className="gba:text-sm gba:font-semibold gba:text-gray-800 gba:mb-1">
                  {condition.title}
                    </h4>
                    <p className="gba:text-xs gba:text-gray-500">{condition.description}</p>
              </div>
      </div>

                {/* Additional Information */}
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4 gba:text-xs">
                  {/* Completed By Employee (only show if completed and has employee) */}
                  {condition.isCompleted && condition.completedBy && (
                <div className="gba:flex gba:items-center gba:gap-2">
                      <UserOutlined className="gba:text-gray-400" />
                      <span className="gba:text-gray-600">
                        <span className="gba:font-medium">Completed by:</span> {condition.completedBy}
                  </span>
                </div>
              )}



                  {/* Completed Date (only show if completed) */}
                  {condition.isCompleted && condition.completedAt && (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <CheckCircleFilled className="gba:text-green-500" />
                      <span className="gba:text-gray-600">
                        <span className="gba:font-medium">Completed:</span> {new Date(condition.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  </div>
                </div>
            ))
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <InfoCircleOutlined className="gba:text-2xl gba:mb-2" />
              <p className="gba:text-sm">No stage conditions configured for this opportunity</p>
              <p className="gba:text-xs gba:mt-1">Stage conditions will appear here when configured for the current pipeline stage</p>
              </div>
            )}
          </div>
      </div>


    </Card>
  );
}; 