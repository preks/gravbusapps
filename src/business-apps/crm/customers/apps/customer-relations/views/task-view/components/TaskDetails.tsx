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
  TextAlignLeft,
  Icon as PhosphorIcon
} from '@phosphor-icons/react';
import { Task } from '@/common/components/common-relations/detail-sheets/task-detail-sheet';
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

// JIRA-style field component
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

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  onClose,
  sourceApp
}) => {
  console.log('🔍 TaskDetails rendering:', {
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

  // Simple truncation to first 7 characters + "..."
  const getTruncatedText = (text: string) => {
    if (!text) return text;
    if (text.length <= 7) return text;
    return text.substring(0, 7) + '...';
  };

  // Calculate task progress based on status
  const getTaskProgress = (status: string): number => {
    switch (status) {
      case 'completed': return 100;
      case 'in_progress': return 60;
      case 'pending': return 0;
      default: return 0;
    }
  };

  // Check if task is overdue
  const isOverdue = task.dueDate && dayjs().isAfter(dayjs(task.dueDate)) && task.status !== 'completed';

  // Handle employee profile navigation
  const handleEmployeeClick = () => {
    try {
      const url = buildPlatformUrl('/platform/employee-record', { employeeId: task.assignedTo.id });
      navigateTo(url);
    } catch (error) {
      console.error('Error navigating to employee profile:', error);
    }
  };

  // Handle reference record navigation
  const handleReferenceClick = () => {
    try {
      // Determine source based on sourceApp
      const source = (sourceApp === 'investment-relations' || sourceApp === 'IRM') ? 'investments' : 'customer-relations';
      
      let url: string;
      switch (task.reference.type) {
        case 'lead':
          url = buildPlatformUrl('/platform/crm/lead-record', { 
            leadId: task.reference.id, 
            source: source 
          });
          break;
        case 'account':
          url = buildPlatformUrl('/platform/crm/account-record', { 
            accountId: task.reference.id, 
            source: source 
          });
          break;
        case 'contact':
          url = buildPlatformUrl('/platform/crm/contact-record', { 
            contactId: task.reference.id, 
            source: source 
          });
          break;
        case 'opportunity':
          url = buildPlatformUrl('/platform/crm/opportunity-record', { 
            opportunityId: task.reference.id, 
            source: source 
          });
          break;
        default:
          console.warn('Unknown reference type:', task.reference.type);
          return;
      }
      
      navigateTo(url);
    } catch (error) {
      console.error('Error navigating to reference record:', error);
    }
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

        {/* JIRA-Style Details Card */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-details-card`}>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-1">
            
            {/* Status */}
            <FieldRow 
              icon={CheckCircle} 
              label="Status" 
              testId={`${DATA_TEST_ID_PREFIX}-status-field`}
            >
              <Badge variant={getTaskStatusBadgeVariant(task.status)}>
                {task.status === 'in_progress' ? 'In Progress' : 
                 task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="gba:ml-2">
                  Overdue
                </Badge>
              )}
            </FieldRow>

            {/* Assignee */}
            <FieldRow 
              icon={User} 
              label="Assignee" 
              testId={`${DATA_TEST_ID_PREFIX}-assignee-field`}
            >
              {task.assignedTo ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:p-2 gba:rounded gba:transition-colors gba:w-fit"
                      onClick={handleEmployeeClick}
                    >
                      <Avatar size="sm">
                        <AvatarFallback>
                          {getInitials(task.assignedTo.firstName || '', task.assignedTo.lastName || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:text-sm gba:font-medium">{task.assignedTo.displayName || 'Unknown User'}</span>
                        <span className="gba:text-xs gba:text-muted-foreground">{task.assignedTo.department || '-'}</span>
                      </div>
                      <ArrowSquareOut size={14} className="gba:text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>View employee profile</TooltipContent>
                </Tooltip>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">Not assigned</span>
              )}
            </FieldRow>

            {/* Priority */}
            <FieldRow 
              icon={Flag} 
              label="Priority" 
              testId={`${DATA_TEST_ID_PREFIX}-priority-field`}
            >
              <Badge variant={getTaskPriorityBadgeVariant(task.priority)}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}
              </Badge>
            </FieldRow>

            {/* Type */}
            <FieldRow 
              icon={Tag} 
              label="Type" 
              testId={`${DATA_TEST_ID_PREFIX}-type-field`}
            >
              <Badge variant={getTaskTypeBadgeVariant(task.type)}>
                {task.type.charAt(0).toUpperCase() + task.type.slice(1).toLowerCase()}
              </Badge>
            </FieldRow>

            {/* Reference */}
            <FieldRow 
              icon={Link} 
              label="Reference" 
              testId={`${DATA_TEST_ID_PREFIX}-reference-field`}
            >
              {task.reference ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="gba:cursor-pointer gba:hover:bg-accent gba:p-2 gba:rounded gba:transition-colors gba:max-w-[280px] gba:w-full"
                      onClick={handleReferenceClick}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:w-full">
                        <div className="gba:min-w-0 gba:flex-1">
                          <div className="gba:text-sm gba:font-medium gba:mb-1 gba:min-w-0 gba:whitespace-nowrap" title={task.reference.name || 'Unknown Reference'}>
                            {getTruncatedText(task.reference.name || 'Unknown Reference')}
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                            <Badge variant={getReferenceTypeBadgeVariant(task.reference.type)} className="gba:text-xs gba:shrink-0">
                              {task.reference.type?.charAt(0).toUpperCase() + (task.reference.type?.slice(1) || '')}
                            </Badge>
                            {task.reference.description && (
                              <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:min-w-0 gba:flex-1" title={task.reference.description}>
                                {task.reference.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowSquareOut size={14} className="gba:text-muted-foreground gba:shrink-0" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="gba:max-w-xs">
                      <div className="gba:font-medium">{task.reference.name || 'Unknown Reference'}</div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">Click to view {task.reference.type} record</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">No reference</span>
              )}
            </FieldRow>

            {/* Progress */}
            <FieldRow 
              icon={Target} 
              label="Progress" 
              testId={`${DATA_TEST_ID_PREFIX}-progress-field`}
            >
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Progress value={getTaskProgress(task.status)} className="gba:h-2 gba:flex-1" />
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                    {getTaskProgress(task.status)}%
                  </span>
                </div>
              </div>
            </FieldRow>

            <Separator className="gba:my-4" />

            {/* Due Date */}
            <FieldRow 
              icon={Calendar} 
              label="Due Date" 
              testId={`${DATA_TEST_ID_PREFIX}-due-date-field`}
            >
              <span className={`gba:text-sm ${isOverdue ? 'gba:text-destructive gba:font-medium' : 'gba:text-foreground'}`}>
                {formatDate(task.dueDate)}
              </span>
            </FieldRow>

            {/* Schedule Date */}
            {task.scheduleDate && (
              <FieldRow 
                icon={CalendarPlus} 
                label="Scheduled" 
                testId={`${DATA_TEST_ID_PREFIX}-schedule-date-field`}
              >
                <span className="gba:text-sm gba:text-foreground">
                  {formatDate(task.scheduleDate)}
                </span>
              </FieldRow>
            )}

            <Separator className="gba:my-4" />

            {/* Created */}
            <FieldRow 
              icon={ClockCounterClockwise} 
              label="Created" 
              testId={`${DATA_TEST_ID_PREFIX}-created-field`}
            >
              <span className="gba:text-sm gba:text-muted-foreground">
                {formatDateTime(task.createdAt)}
              </span>
            </FieldRow>

            {/* Description */}
            {task.description && (
              <FieldRow 
                icon={TextAlignLeft} 
                label="Description" 
                testId={`${DATA_TEST_ID_PREFIX}-description-field`}
              >
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">
                  {task.description}
                </p>
              </FieldRow>
            )}

            {/* Updated */}
            <FieldRow 
              icon={Clock} 
              label="Updated" 
              testId={`${DATA_TEST_ID_PREFIX}-updated-field`}
            >
              <span className="gba:text-sm gba:text-muted-foreground">
                {formatDateTime(task.updatedAt)}
              </span>
            </FieldRow>

            {/* Task ID */}
            <FieldRow 
              icon={Hash} 
              label="Task ID" 
              testId={`${DATA_TEST_ID_PREFIX}-id-field`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="gba:text-xs gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:cursor-help">
                    {task.id}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Task identifier</TooltipContent>
              </Tooltip>
            </FieldRow>

          </CardContent>
        </Card>

        {/* Bottom spacing for better scrolling */}
        <div className="gba:h-4" />
      </div>
    </ScrollArea>
  );
}; 