"use client";

import React from 'react';
import { 
  Avatar, 
  AvatarFallback, 
  Badge, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Progress,
  ScrollArea,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@newwork/nw-design-system';
import { 
  Clock, 
  Calendar, 
  User, 
  ArrowSquareOut,
  Flag,
  Tag,
  CheckCircle,
  Link,
  CalendarPlus,
  ClockCounterClockwise,
  Target,
  Hash,
  Icon as PhosphorIcon
} from '@phosphor-icons/react';
import { Task } from '../types/TaskTypes';
import { 
  getTaskStatusBadgeVariant,
  getTaskPriorityBadgeVariant,
  getTaskTypeBadgeVariant,
  getReferenceTypeBadgeVariant
} from '../utils/taskBadgeUtils';
import dayjs from 'dayjs';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';

interface TaskDetailsProps {
  task: Task;
  onClose?: () => void;
  sourceApp?: string;
}

const DATA_TEST_ID_PREFIX = 'TaskDetails';

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

export const TaskDetails: React.FC<TaskDetailsProps> = ({ task, sourceApp }) => {
  console.log('🔍 Investment TaskDetails rendering:', {
    taskId: task?.id,
    taskName: task?.name,
    hasAssignedTo: !!task?.assignedTo,
    hasReference: !!task?.reference,
    sourceApp
  });
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

  const getTaskProgress = (status: string): number => {
    switch (status) {
      case 'completed': return 100;
      case 'in_progress': return 60;
      case 'pending': return 0;
      default: return 0;
    }
  };

  const isOverdue = task.dueDate && dayjs().isAfter(dayjs(task.dueDate)) && task.status !== 'completed';

  const handleEmployeeClick = () => {
    const url = buildPlatformUrl('/platform/employee-record', { employeeId: task.assignedTo.id });
    navigateTo(url);
  };

  const handleReferenceClick = () => {
    const source = (sourceApp === 'investment-relations' || sourceApp === 'IRM') ? 'investments' : 'customer-relations';
    let url: string;
    switch (task.reference.type) {
      case 'lead': url = buildPlatformUrl('/platform/crm/lead-record', { leadId: task.reference.id, source }); break;
      case 'account': url = buildPlatformUrl('/platform/crm/account-record', { accountId: task.reference.id, source }); break;
      case 'contact': url = buildPlatformUrl('/platform/crm/contact-record', { contactId: task.reference.id, source }); break;
      case 'opportunity': url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: task.reference.id, source }); break;
      default: console.warn('Unknown reference type:', task.reference.type); return;
    }
    navigateTo(url);
  };

  // Safety check for task data
  if (!task) {
    return (
      <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
        No task data available
      </div>
    );
  }

  return (
    <ScrollArea className="gba:h-full gba:w-full" data-testid={`${DATA_TEST_ID_PREFIX}-scroll-area`}>
      <div className="gba:space-y-4 gba:p-1" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-details-card`}>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-1">
            <FieldRow icon={CheckCircle} label="Status" testId={`${DATA_TEST_ID_PREFIX}-status-field`}>
              <Badge variant={getTaskStatusBadgeVariant(task.status)}>
                {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="gba:ml-2">Overdue</Badge>
              )}
            </FieldRow>

            <FieldRow icon={User} label="Assignee" testId={`${DATA_TEST_ID_PREFIX}-assignee-field`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:p-2 gba:rounded gba:transition-colors gba:w-fit" onClick={handleEmployeeClick}>
                    <Avatar size="sm">
                      <AvatarFallback>{getInitials(task.assignedTo.firstName, task.assignedTo.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:text-sm gba:font-medium">{task.assignedTo.displayName}</span>
                      <span className="gba:text-xs gba:text-muted-foreground">{task.assignedTo.department}</span>
                    </div>
                    <ArrowSquareOut size={14} className="gba:text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>View employee profile</TooltipContent>
              </Tooltip>
            </FieldRow>

            <FieldRow icon={Flag} label="Priority" testId={`${DATA_TEST_ID_PREFIX}-priority-field`}>
              <Badge variant={getTaskPriorityBadgeVariant(task.priority)}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}</Badge>
            </FieldRow>

            <FieldRow icon={Tag} label="Type" testId={`${DATA_TEST_ID_PREFIX}-type-field`}>
              <Badge variant={getTaskTypeBadgeVariant(task.type)}>{task.type.charAt(0).toUpperCase() + task.type.slice(1).toLowerCase()}</Badge>
            </FieldRow>

            <FieldRow icon={Link} label="Reference" testId={`${DATA_TEST_ID_PREFIX}-reference-field`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="gba:cursor-pointer gba:hover:bg-accent gba:p-2 gba:rounded gba:transition-colors gba:w-fit" onClick={handleReferenceClick}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div>
                        <div className="gba:text-sm gba:font-medium gba:mb-1">{task.reference.name}</div>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant={getReferenceTypeBadgeVariant(task.reference.type)} className="gba:text-xs">{task.reference.type.charAt(0).toUpperCase() + task.reference.type.slice(1)}</Badge>
                          {task.reference.description && (<span className="gba:text-xs gba:text-muted-foreground">{task.reference.description}</span>)}
                        </div>
                      </div>
                      <ArrowSquareOut size={14} className="gba:text-muted-foreground" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>View {task.reference.type} record</TooltipContent>
              </Tooltip>
            </FieldRow>

            <FieldRow icon={Target} label="Progress" testId={`${DATA_TEST_ID_PREFIX}-progress-field`}>
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Progress value={getTaskProgress(task.status)} className="gba:h-2 gba:flex-1" />
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{getTaskProgress(task.status)}%</span>
                </div>
              </div>
            </FieldRow>

            <Separator className="gba:my-4" />

            <FieldRow icon={Calendar} label="Due Date" testId={`${DATA_TEST_ID_PREFIX}-due-date-field`}>
              <span className={`gba:text-sm ${isOverdue ? 'gba:text-destructive gba:font-medium' : 'gba:text-foreground'}`}>{formatDate(task.dueDate)}</span>
            </FieldRow>

            {task.scheduleDate && (
              <FieldRow icon={CalendarPlus} label="Scheduled" testId={`${DATA_TEST_ID_PREFIX}-schedule-date-field`}>
                <span className="gba:text-sm gba:text-foreground">{formatDate(task.scheduleDate)}</span>
              </FieldRow>
            )}

            <Separator className="gba:my-4" />

            <FieldRow icon={ClockCounterClockwise} label="Created" testId={`${DATA_TEST_ID_PREFIX}-created-field`}>
              <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.createdAt)}</span>
            </FieldRow>

            <FieldRow icon={Clock} label="Updated" testId={`${DATA_TEST_ID_PREFIX}-updated-field`}>
              <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.updatedAt)}</span>
            </FieldRow>

            <FieldRow icon={Hash} label="Task ID" testId={`${DATA_TEST_ID_PREFIX}-id-field`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="gba:text-xs gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:cursor-help">{task.id}</span>
                </TooltipTrigger>
                <TooltipContent>Task identifier</TooltipContent>
              </Tooltip>
            </FieldRow>
          </CardContent>
        </Card>

        <div className="gba:h-4" />
      </div>
    </ScrollArea>
  );
};

export default TaskDetails;

