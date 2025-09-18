import React from 'react';
import { Button, TimelineLayout, Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system';
import { AppAction } from '@/components/app-action';
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs from 'dayjs';
import { CheckIcon, ClockIcon, WarningIcon, PlayIcon, PlusCircleIcon } from '@phosphor-icons/react';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';

type TaskItem = {
  id: string;
  title: string;
  due?: string;
  assignee?: string;
  statusCode?: 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED';
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
  tasks?: TaskItem[];
  'data-testid'?: string;
  taskActionProps?: Omit<AppActionCommonProps, 'accessToken'>;
}

const TaskSection: React.FC<TaskSectionProps> = ({ accessToken, tasks, taskActionProps }) => {
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

  const getEmployeeDisplayName = (emp: any) => 
    emp?.displayName || (emp?.firstName && emp?.lastName ? `${emp.firstName} ${emp.lastName}` : 'Unknown User');

  return (
    <Card data-testid="task-section">
      <CardHeader className="gba:flex gba:flex-row gba:items-start gba:justify-between">
        <CardTitle>Tasks</CardTitle>
        <AppAction
          accessToken={accessToken}
          contextsArray={taskActionProps?.contextsArray}
          externalContextData={taskActionProps?.externalContextData}
          prefixDataTestId={taskActionProps?.prefixDataTestId || 'tasks'}
          emptyStateBehavior={taskActionProps?.emptyStateBehavior || 'enable'}
        >
          <Button data-testid="add-note-button" size="icon"><PlusCircleIcon /></Button>
        </AppAction>
      </CardHeader>
      <CardContent>
        {tasks && tasks.length > 0 ? (
          <TimelineLayout
            items={tasks.map((t, idx) => {
              const due = t.due ? (dayjs(t.due).isValid() ? dayjs(t.due).format('MMM D, YYYY [at] h:mm A') : t.due) : '';
              const descParts: string[] = [];
              if (due) descParts.push(`Due ${due}`);
              const code = t.statusCode;
              
              const { color, icon } = getStatusColorAndIcon(code);
              
              const assigneeName = t.assigneeEmployee ? getEmployeeDisplayName(t.assigneeEmployee) : t.assignee;
              const assigneeId = t.assigneeEmployee?.id;
              
              return {
                id: idx,
                date: due,
                title: t.title,
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
          <div className="gba:text-center gba:text-sm gba:text-muted-foreground">No tasks yet. Create your first task.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskSection;


