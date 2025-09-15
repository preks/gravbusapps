import React, { useMemo, useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system';
import { InfoCircleOutlined, CheckCircleFilled, CloseCircleFilled, CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { AppAction } from '@/components/app-action/AppAction';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { getSalesPipelineStageBadgeVariant } from '@/common/utils/badgeUtils';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

interface ConditionSectionProps extends Partial<BusinessAppContextProps> {
  opportunity?: any;
  stageConditionStatuses?: any[];
  'data-testid'?: string;
  stageConditionActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
}

const ConditionSection: React.FC<ConditionSectionProps> = ({ opportunity, stageConditionStatuses = [], stageConditionActionProps, ...context }) => {
  const [hoveredConditionId, setHoveredConditionId] = useState<string | null>(null);

  const handleConditionMouseLeave = useCallback(() => setHoveredConditionId(null), []);
  const conditionContextsArray = useMemo(() => stageConditionActionProps?.contextsArray || [], [stageConditionActionProps?.contextsArray]);

  const conditionProps = useMemo(() => {
    const props: Record<string, {
      mouseHandlers: { onMouseEnter: () => void; onMouseLeave: () => void };
      externalContextData: { stageConditionStatusId: string };
      contextsArray: FlowContextName[];
    }> = {};
    (stageConditionStatuses || []).forEach((status: any) => {
      const id = status.id;
      props[id] = {
        mouseHandlers: {
          onMouseEnter: () => setHoveredConditionId(id),
          onMouseLeave: handleConditionMouseLeave,
        },
        externalContextData: { stageConditionStatusId: id },
        contextsArray: conditionContextsArray,
      };
    });
    return props;
  }, [stageConditionStatuses, handleConditionMouseLeave, conditionContextsArray]);

  const transformStageConditionStatusToUI = (statusData: any) => {
    const conditionEntry = statusData.opportunityPipelineStageCondition;
    const config = statusData.configSnapshot || conditionEntry?.objectValue || {};
    // deadline configuration available if needed in future
    const getEmployeeName = (employee: any) => employee?.displayName || `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'System';
    const approvedBy = getEmployeeName(statusData.completedByEmployee);
    const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated';
    return {
      id: conditionEntry?.code || statusData.id,
      stageConditionStatusId: statusData.id,
      title: conditionEntry?.value || 'Unknown Condition',
      description: config.description || 'No description available',
      isCompleted: statusData.completed || false,
      generateTask: config.generate_task || config.generateTask || false,
      checkedType,
      deadlineAt: statusData.deadlineAt,
      completedAt: statusData.completedAt,
      completedBy: statusData.completedByEmployee ? approvedBy : null,
    };
  };

  const getCurrentStageConditions = (statuses: any[], currentStageStageId?: string) => {
    if (!currentStageStageId) return [];
    return statuses.filter(s => s.opportunityPipelineStageCondition?.parentEntryId === currentStageStageId);
  };

  const currentStageConditionStatuses = (stageConditionStatuses && stageConditionStatuses.length > 0)
    ? getCurrentStageConditions(stageConditionStatuses, opportunity?.opportunityPipelineStage?.id)
    : [];
  const stageConditions = currentStageConditionStatuses.map(transformStageConditionStatusToUI);
  const sortedStageConditions = [...stageConditions].sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));

  return (
    <Card className="gba:w-full gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
          <CardTitle>Stage required conditions</CardTitle>
          <InfoCircleOutlined className="gba:text-gray-400" title="These conditions must be fulfilled and approved for stage transitions." />
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-3">
          <div className="gba:flex gba:justify-center gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border gba:border-gray-200">
            <Badge variant={getSalesPipelineStageBadgeVariant(opportunity?.opportunityPipelineStage)}>
              {opportunity?.opportunityPipelineStage?.value || 'No Stage'}
            </Badge>
          </div>

          <div className="gba:space-y-3 gba:max-h-96 gba:overflow-y-auto gba:pr-1">
            {sortedStageConditions.length > 0 ? (
              sortedStageConditions.map((condition: any) => (
                <div key={condition.id} className="gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 gba:bg-white hover:gba:bg-gray-50 gba:transition-colors">
                  <div className="gba:mb-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:flex-shrink-0">
                        <AppAction
                          data-testid={`stage-condition-status-icon-${condition.stageConditionStatusId}`}
                          contextsArray={conditionProps[condition.stageConditionStatusId]?.contextsArray}
                          externalContextData={conditionProps[condition.stageConditionStatusId]?.externalContextData}
                          prefixDataTestId="stage-condition-status-icon"
                          accessToken={(context as BusinessAppContextProps).accessToken as string}
                          emptyStateBehavior="disable"
                          deferMainContextRequestsUntilClick={false}
                        >
                          <div 
                            className="gba:relative gba:inline-flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:cursor-pointer"
                            onMouseEnter={conditionProps[condition.stageConditionStatusId]?.mouseHandlers.onMouseEnter}
                            onMouseLeave={conditionProps[condition.stageConditionStatusId]?.mouseHandlers.onMouseLeave}
                          >
                            {hoveredConditionId === condition.stageConditionStatusId ? (
                              condition.isCompleted ? (
                                <CloseCircleFilled className="gba:text-2xl" style={{ color: '#f59e0b' }} />
                              ) : (
                                <CheckCircleFilled className="gba:text-2xl" style={{ color: '#16a34a' }} />
                              )
                            ) : (
                              condition.isCompleted ? (
                                <CheckCircleFilled className="gba:text-2xl" style={{ color: '#16a34a' }} />
                              ) : (
                                <CloseCircleFilled className="gba:text-2xl" style={{ color: '#9ca3af' }} />
                              )
                            )}
                          </div>
                        </AppAction>
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                        <h4 className="gba:text-sm gba:font-bold gba:text-gray-800">{condition.title}</h4>
                        {condition.description && (
                          <InfoCircleOutlined className="gba:text-gray-400" title={condition.description} />
                        )}
                      </div>
                      {condition.deadlineAt && (
                        <div className="gba:hidden gba:lg:flex gba:flex-shrink-0 gba:text-xs gba:text-gray-500 gba:bg-gray-50 gba:px-2 gba:py-1 gba:rounded-md gba:border">
                          <CalendarOutlined className="gba:text-gray-400 gba:mr-1" />
                          <span>{new Date(condition.deadlineAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {condition.deadlineAt && (
                    <div className="gba:hidden gba:sm:block gba:lg:hidden gba:mt-1 gba:ml-12 gba:text-xs gba:text-gray-500">
                      <CalendarOutlined className="gba:text-gray-400 gba:mr-1" />
                      <span>{new Date(condition.deadlineAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {condition.isCompleted && (condition.completedBy || condition.completedAt) && (
                    <div className="gba:mt-2 gba:inline-block gba:px-3 gba:py-1 gba:bg-green-100 gba:border gba:border-green-300 gba:rounded-full gba:text-xs gba:text-green-800">
                      <div className="gba:font-medium">
                        {condition.completedAt && (
                          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                            <div className="gba:flex gba:items-center gba:gap-1">
                              <CalendarOutlined className="gba:text-[10px]" />
                              <span>{new Date(condition.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-1">
                              <ClockCircleOutlined className="gba:text-[10px]" />
                              <span>{new Date(condition.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        )}
                        {condition.completedBy && (
                          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
                            <UserOutlined className="gba:text-[10px]" />
                            <span>{condition.completedBy}</span>
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
                <p className="gba:text-sm">No stage conditions configured</p>
                <p className="gba:text-xs gba:mt-1">Stage conditions will appear here when configured for the current pipeline stage</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConditionSection;


