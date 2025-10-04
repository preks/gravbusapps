"use client";

import React from 'react';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage,
  Badge, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  ScrollArea,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@newwork/nw-design-system';
import { 
  Calendar, 
  User, 
  ArrowSquareOut,
  Flag,
  Tag,
  CheckCircle,
  Link,
  CalendarPlus,
  ClockCounterClockwise,
  TextAlignLeft,
  Icon as PhosphorIcon
} from '@phosphor-icons/react';
import { Task, TaskReference } from './types';
import { 
  getTaskStatusBadgeVariant,
  getTaskPriorityBadgeVariant,
  getTaskTypeBadgeVariant,
  getReferenceTypeBadgeVariant
} from './utils';
import dayjs from 'dayjs';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

interface TaskDetailSheetProps {
  task: Task;
  buildReferenceUrl?: (reference: TaskReference) => string;
  'data-testid'?: string;
}

const DATA_TEST_ID_PREFIX = 'TaskDetailSheet';

interface FieldRowProps {
  icon: PhosphorIcon;
  label: string;
  children: React.ReactNode;
  testId?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: IconComponent, label, children, testId }) => (
  <div className="gba:flex gba:items-start gba:gap-3 gba:py-2" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
      <IconComponent size={14} className="gba:text-muted-foreground" />
      <span>{label}</span>
    </div>
    <div className="gba:flex-1">
      {children}
    </div>
  </div>
);

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({ task, buildReferenceUrl, 'data-testid': dataTestId }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = dayjs(dateString);
    return date.isValid() ? date.format('MMM DD, YYYY') : '-';
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = dayjs(dateString);
    return date.isValid() ? date.format('MMM DD, YYYY h:mm A') : '-';
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Determine if task is overdue based on timing type
  const getTaskDate = () => {
    return task.timingType?.toUpperCase() === 'SCHEDULED' && task.scheduleDate ? task.scheduleDate : task.dueDate;
  };
  
  const taskDate = getTaskDate();
  const isOverdue = !!taskDate && dayjs().isAfter(dayjs(taskDate)) && task.status !== 'completed';

  const handleEmployeeClick = () => {
    const url = buildPlatformUrl('/platform/employee-record', { employeeId: task.assignedTo.id });
    navigateTo(url);
  };

  const handleReferenceClick = () => {
    if (!task.reference || !buildReferenceUrl) return;
    
    const url = buildReferenceUrl(task.reference);
    if (url) {
      navigateTo(url);
    }
  };

  // Safety check for task data
  if (!task) {
    return (
      <div className="gba:p-4 gba:text-center gba:text-muted-foreground" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-no-data`}>
        No task data available
      </div>
    );
  }

  return (
    <ScrollArea className="gba:h-full gba:w-full" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-scroll-area`}>
      <div className="gba:space-y-4 gba:p-1" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-container`}>
        <Card data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-details-card`}>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-1">
            <FieldRow icon={CheckCircle} label="Status" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-status-field`}>
              <Badge variant={getTaskStatusBadgeVariant(task.status)}>
                {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="gba:ml-2">Overdue</Badge>
              )}
            </FieldRow>

            <FieldRow icon={User} label="Assignee" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-assignee-field`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px]"
                    onClick={handleEmployeeClick}
                    data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-assignee-link`}
                  >
                    <Avatar size="sm" className="gba:size-6">
                      {task.assignedTo.pictureThumbnail && (
                        <AvatarImage
                          src={`data:image/gif;base64,${task.assignedTo.pictureThumbnail}`}
                          alt={task.assignedTo.displayName}
                        />
                      )}
                      <AvatarFallback className="gba:text-xs">{getInitials(task.assignedTo.firstName, task.assignedTo.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="gba:text-sm gba:font-medium">{task.assignedTo.displayName}</span>
                    <ArrowSquareOut size={12} className="gba:text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>View employee profile</TooltipContent>
              </Tooltip>
            </FieldRow>

            <FieldRow icon={Flag} label="Priority" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-priority-field`}>
              <Badge variant={getTaskPriorityBadgeVariant(task.priority)}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}</Badge>
            </FieldRow>

            <FieldRow icon={Tag} label="Type" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-type-field`}>
              <Badge variant={getTaskTypeBadgeVariant(task.type)}>{task.type.charAt(0).toUpperCase() + task.type.slice(1).toLowerCase()}</Badge>
            </FieldRow>

            <FieldRow icon={Link} label="Reference" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-reference-field`}>
              {task.reference ? (
                buildReferenceUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px]"
                        onClick={handleReferenceClick}
                        data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-reference-link`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant={getReferenceTypeBadgeVariant(task.reference.type)} className="gba:text-xs gba:shrink-0">{task.reference.type.charAt(0).toUpperCase() + task.reference.type.slice(1)}</Badge>
                          <span className="gba:text-sm gba:font-medium gba:truncate">{task.reference.name}</span>
                          <ArrowSquareOut size={12} className="gba:text-muted-foreground gba:shrink-0" />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>View {task.reference.type} record</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="gba:px-2 gba:py-1 gba:w-fit gba:min-h-[24px]">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant={getReferenceTypeBadgeVariant(task.reference.type)} className="gba:text-xs gba:shrink-0">{task.reference.type.charAt(0).toUpperCase() + task.reference.type.slice(1)}</Badge>
                      <span className="gba:text-sm gba:font-medium gba:truncate">{task.reference.name}</span>
                    </div>
                  </div>
                )
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">No reference</span>
              )}
            </FieldRow>

            <FieldRow icon={User} label="Created By" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created-by-field`}>
              {task.creatorEmployee ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px]"
                      onClick={() => {
                        if (task.creatorEmployee) {
                          const url = buildPlatformUrl('/platform/employee-record', { employeeId: task.creatorEmployee.id });
                          navigateTo(url);
                        }
                      }}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-creator-link`}
                    >
                      <Avatar size="sm" className="gba:size-6">
                        <AvatarFallback className="gba:text-xs">{getInitials(task.creatorEmployee.firstName, task.creatorEmployee.lastName)}</AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:font-medium">{task.creatorEmployee.displayName}</span>
                      <ArrowSquareOut size={12} className="gba:text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>View employee profile</TooltipContent>
                </Tooltip>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">Unknown</span>
              )}
            </FieldRow>

            <Separator className="gba:my-4" />

            {/* Show either Due Date or Scheduled Date based on timing type */}
            {task.timingType?.toUpperCase() === 'SCHEDULED' ? (
              <FieldRow icon={CalendarPlus} label="Scheduled" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-schedule-date-field`}>
                <span className={`gba:text-sm ${isOverdue ? 'gba:text-destructive gba:font-medium' : 'gba:text-foreground'}`}>
                  {formatDate(task.scheduleDate || task.dueDate)}
                </span>
              </FieldRow>
            ) : (
              <FieldRow icon={Calendar} label="Due Date" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-due-date-field`}>
                <span className={`gba:text-sm ${isOverdue ? 'gba:text-destructive gba:font-medium' : 'gba:text-foreground'}`}>{formatDate(task.dueDate)}</span>
              </FieldRow>
            )}

            <Separator className="gba:my-4" />

            <FieldRow icon={ClockCounterClockwise} label="Created" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created-field`}>
              <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.createdAt)}</span>
            </FieldRow>

            {task.description && (
              <FieldRow icon={TextAlignLeft} label="Description" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-description-field`}>
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">
                  {task.description}
                </p>
              </FieldRow>
            )}

          </CardContent>
        </Card>

        <div className="gba:h-4" />
      </div>
    </ScrollArea>
  );
};

export default TaskDetailSheet;

