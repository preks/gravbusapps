import React from 'react';
import { Card, Tooltip } from 'antd';
import { Badge } from '@newwork/nw-design-system';
import { InfoCircleOutlined, CheckCircleFilled, CloseCircleFilled, CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

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
  completedByEmployeeId?: string | null; // Employee ID for navigation
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
    
    // Get approver information - prefer displayName, fallback to firstName + lastName
    const getEmployeeName = (employee: any) => {
      if (!employee) return 'System';
      return employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee';
    };
    
    const approvedBy = getEmployeeName(statusData.completedByEmployee);
    
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
      completedBy: statusData.completedByEmployee ? getEmployeeName(statusData.completedByEmployee) : null,
      completedByEmployeeId: statusData.completedByEmployee?.id || null,
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

  // Sort conditions: incomplete (false) first, then completed (true)
  const sortedStageConditions = [...stageConditions].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0;
    return a.isCompleted ? 1 : -1; // false comes before true
  });

  // Handle navigation to employee record
  const handleEmployeeNavigation = (employeeId: string) => {
    const employeeUrl = buildPlatformUrl('/platform/employee-record', { employeeId });
    navigateTo(employeeUrl);
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
        <div className="gba:space-y-3">
          {sortedStageConditions.length > 0 ? (
            sortedStageConditions.map((condition) => (
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
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <div className="gba:flex-shrink-0">
                <AppActionButton
                  data-testid={`stage-condition-status-icon-${condition.stageConditionStatusId}`}
                  variant="ghost"
                  showIcon={false}
                  size="large"
                  contextsArray={[FlowContextName.saveOpportunityStageConditionStatus]}
                  externalContextData={{
                    stageConditionStatusId: condition.stageConditionStatusId 
                  }}
                  prefixDataTestId="stage-condition-status-icon"
                  accessToken={context.accessToken}
                  emptyStateBehavior="disable"
                  deferMainContextRequestsUntilClick={false}
                  autoExecuteSingleAction={true}
                  onClick={(e) => e.stopPropagation()}
                  className="gba:p-0 gba:hover:bg-gray-100 gba:rounded-full gba:transition-colors gba:border-0 gba:relative gba:group"
                  style={{ minWidth: 'auto', minHeight: 'auto', background: 'transparent' }}
                >
                  {/* Default State Icon */}
                  <div className="gba:block group-hover:gba:hidden gba:transition-opacity">
                    {condition.isCompleted ? (
                      <CheckCircleFilled 
                        className="gba:text-2xl" 
                        style={{ color: '#16a34a' }}
                      />
                    ) : (
                      <CloseCircleFilled 
                        className="gba:text-2xl" 
                        style={{ color: '#9ca3af' }}
                      />
                    )}
                  </div>
                  
                  {/* Hover State Icon (opposite of current state) */}
                  <div className="gba:hidden group-hover:gba:block gba:transition-opacity">
                    {condition.isCompleted ? (
                      <CloseCircleFilled 
                        className="gba:text-2xl" 
                        style={{ color: '#f59e0b' }}
                      />
                    ) : (
                      <CheckCircleFilled 
                        className="gba:text-2xl" 
                        style={{ color: '#16a34a' }}
                      />
                    )}
                  </div>
                </AppActionButton>
              </div>
              <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                      <h4 className="gba:text-sm gba:font-bold gba:text-gray-800">
                        {condition.title}
                      </h4>
                      {condition.description && (
                        <Tooltip 
                          title={condition.description}
                          placement="top"
                          overlayStyle={{ maxWidth: '300px' }}
                        >
                          <InfoCircleOutlined className="gba:text-gray-400 hover:gba:text-gray-600 gba:cursor-help gba:text-xs" />
                        </Tooltip>
                      )}
                    </div>
              </div>
      </div>

                {/* Completion Information */}
                {condition.isCompleted && (condition.completedBy || condition.completedAt) && (
                  <div className="gba:mt-2 gba:inline-flex gba:items-center gba:px-3 gba:py-1 gba:bg-green-100 gba:border gba:border-green-300 gba:rounded-full gba:text-xs gba:text-green-800">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:font-medium">
                      {condition.completedAt && (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <CalendarOutlined style={{ fontSize: '10px' }} />
                          <span>
                            {new Date(condition.completedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {condition.completedAt && (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <ClockCircleOutlined style={{ fontSize: '10px' }} />
                          <span>
                            {new Date(condition.completedAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      {condition.completedBy && (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <UserOutlined style={{ fontSize: '10px' }} />
                          {condition.completedByEmployeeId ? (
                            <button
                              onClick={() => handleEmployeeNavigation(condition.completedByEmployeeId!)}
                              className="gba:font-medium gba:text-green-800 hover:gba:text-green-900 gba:underline gba:cursor-pointer gba:bg-transparent gba:border-none gba:p-0"
                              title={`Navigate to ${condition.completedBy}'s employee record`}
                              data-testid={`employee-link-${condition.completedByEmployeeId}`}
                            >
                              {condition.completedBy}
                            </button>
                          ) : (
                            <span>{condition.completedBy}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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