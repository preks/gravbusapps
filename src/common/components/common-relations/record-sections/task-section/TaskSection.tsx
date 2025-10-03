import React from 'react';
import { Button, TimelineLayout, Badge } from '@newwork/nw-design-system';
import { AppAction } from '@/components/app-action';
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { CheckIcon, ClockIcon, WarningIcon, PlayIcon, PlusIcon, DotsThreeVertical } from '@phosphor-icons/react';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

type CatalogEntry = {
  id?: string;
  code?: string;
  value?: string;
  type?: string;
};

type TaskItem = {
  id: string;
  title: string;
  createdAt?: string;
  due?: string;
  assignee?: string;
  statusCode?: 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';
  taskStatus?: CatalogEntry;
  taskPriority?: CatalogEntry;
  assigneeEmployee?: {
    id: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  };
};

interface TaskSectionProps extends BusinessAppContextProps {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  leadId?: string;
  investmentId?: string;
  tasks?: TaskItem[];
  'data-testid'?: string;
  taskActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
  taskEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
  sectionTitle?: string;
}

const TaskSection: React.FC<TaskSectionProps> = ({ accessToken, tasks, taskEntityActionProps }) => {
  // Determine color and icon based on status
  const getStatusColorAndIcon = (statusCode?: string) => {
    if (statusCode === 'COMPLETED') {
      return { 
        color: 'success', 
        icon: (props: any) => <CheckIcon weight="bold" {...props} />
      };
    }
    if (statusCode === 'OVERDUE') {
      return { 
        color: 'destructive', 
        icon: (props: any) => <WarningIcon weight="bold" {...props} />
      };
    }
    if (statusCode === 'IN_PROGRESS') {
      return { 
        color: 'info', 
        icon: (props: any) => <PlayIcon weight="bold" {...props} />
      };
    }
    if (statusCode === 'PENDING') {
      return { 
        color: 'warning', 
        icon: (props: any) => <ClockIcon weight="bold" {...props} />
      };
    }
    return { 
      color: 'info', 
      icon: (props: any) => <ClockIcon weight="bold" {...props} />
    };
  };

  const getEmployeeDisplayName = (emp: any) => {
    if (!emp) return 'Unknown User';
    
    // Use firstName + lastName first
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    if (fullName) return fullName;
    
    // Fallback to displayName
    return emp.displayName || 'Unknown User';
  };

  // Map task priority type to badge variant
  const getPriorityBadgeVariant = (priority?: CatalogEntry): 'offline' | 'secondary' | 'warning' => {
    const type = priority?.type?.toUpperCase();
    switch (type) {
      case 'LOW':
        return 'offline';
      case 'MEDIUM':
        return 'secondary';
      case 'HIGH':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Map task status type to badge variant
  const getStatusBadgeVariant = (status?: CatalogEntry): 'success' | 'info' | 'destructive' | 'warning' => {
    const type = status?.type?.toUpperCase();
    switch (type) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'OVERDUE':
        return 'destructive';
      case 'PENDING':
        return 'warning';
      default:
        return 'warning';
    }
  };

  return (
    <div data-testid="task-section">
      {tasks && tasks.length > 0 ? (
        <TimelineLayout
          items={tasks.map((t, idx) => {
            const createdDate = t.createdAt ? (dayjs(t.createdAt).isValid() ? dayjs(t.createdAt).format('MMM D, YYYY [at] h:mm A') : t.createdAt) : '';
            const due = t.due ? (dayjs(t.due).isValid() ? dayjs(t.due).format('MMM D, YYYY [at] h:mm A') : t.due) : '';
            const descParts: string[] = [];
            if (due) descParts.push(`Due ${due}`);
            const code = t.statusCode;
            
            const { color, icon } = getStatusColorAndIcon(code);
            
            const assigneeName = t.assigneeEmployee ? getEmployeeDisplayName(t.assigneeEmployee) : t.assignee;
            const assigneeId = t.assigneeEmployee?.id;
            
            const taskActions = taskEntityActionProps ? (
              <AppActionMenu
                accessToken={accessToken}
                contextsArray={taskEntityActionProps.contextsArray}
                externalContextData={{ 
                  ...taskEntityActionProps.externalContextData, 
                  taskId: t.id
                }}
                prefixDataTestId={`${taskEntityActionProps.prefixDataTestId}-${t.id}`}
                emptyStateBehavior={taskEntityActionProps.emptyStateBehavior}
              >
                <div 
                  className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:cursor-pointer gba:rounded gba:hover:bg-muted gba:transition-colors"
                  data-testid={`task-menu-${t.id}`}
                >
                  <DotsThreeVertical size={16} />
                </div>
              </AppActionMenu>
            ) : null;
            
            return {
              id: idx,
              date: createdDate,
              title: (
                <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:gap-2">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                    <span className="gba:truncate">{t.title}</span>
                    {t.taskStatus && (
                      <Badge variant={getStatusBadgeVariant(t.taskStatus)} size="sm">
                        {t.taskStatus.value || t.taskStatus.code}
                      </Badge>
                    )}
                    {t.taskPriority && (
                      <Badge variant={getPriorityBadgeVariant(t.taskPriority)} size="sm">
                        {t.taskPriority.value || t.taskPriority.code}
                      </Badge>
                    )}
                  </div>
                  {taskActions}
                </div>
              ),
              actor: assigneeName
                ? assigneeId
                  ? (
                      <a
                        href={buildPlatformUrl('/platform/employee-record', { employeeId: assigneeId })}
                        className="gba:underline gba:text-inherit hover:gba:text-primary"
                        data-testid={`task-assignee-link-${assigneeId}`}
                      >
                        {assigneeName}
                      </a>
                    )
                  : assigneeName
                : undefined,
              description: descParts.join(' • '),
              color,
              icon,
            } as any;
          })}
          variant="default"
          orientation="vertical"
          datePosition="inline"
          className="gba:w-full"
        />
      ) : (
        <div className="gba:text-center gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('tasks.emptyState', 'No tasks yet. Create your first task.')}
        </div>
      )}
    </div>
  );
};

// Static properties for SectionWrapper
(TaskSection as any).sectionTitle = (props: TaskSectionProps) => props.sectionTitle || 'Tasks';
(TaskSection as any).sectionActions = (props: TaskSectionProps) => {
  const { accessToken, taskActionProps } = props;
  
  if (!taskActionProps) {
    return null;
  }

  return (
    <AppAction
      accessToken={accessToken}
      contextsArray={taskActionProps.contextsArray}
      externalContextData={taskActionProps.externalContextData}
      prefixDataTestId={taskActionProps.prefixDataTestId}
      emptyStateBehavior={taskActionProps.emptyStateBehavior}
    >
      <Button data-testid="add-task-button" variant="secondary" size="icon">
        <PlusIcon />
      </Button>
    </AppAction>
  );
};

export default TaskSection;
