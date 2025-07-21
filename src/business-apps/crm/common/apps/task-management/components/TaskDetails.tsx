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
  Separator
} from '@newwork/nw-design-system';
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

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  onClose,
  sourceApp
}) => {
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM DD, YYYY');
  };

  const formatDateTime = (dateString: string) => {
    return dayjs(dateString).format('MMM DD, YYYY h:mm A');
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Handle employee profile navigation
  const handleEmployeeClick = () => {
    const url = buildPlatformUrl('/platform/employee-record', { employeeId: task.assignedTo.id });
    navigateTo(url);
  };

  // Handle reference record navigation
  const handleReferenceClick = () => {
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
  };

  return (
    <div className="gba:space-y-4" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Task Header Card */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-header`}>
        <CardHeader>
          <CardTitle>{task.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            <Badge variant={getTaskStatusBadgeVariant(task.status)}>
              {task.status === 'in_progress' ? 'In Progress' : 
               task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </Badge>
            <Badge variant={getTaskPriorityBadgeVariant(task.priority)}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}
            </Badge>
            <Badge variant={getTaskTypeBadgeVariant(task.type)}>
              {task.type.charAt(0).toUpperCase() + task.type.slice(1).toLowerCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Assigned To Card */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-assigned-to-section`}>
        <CardHeader>
          <CardTitle>Assigned To</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:p-3 gba:rounded gba:transition-colors"
            onClick={handleEmployeeClick}
            data-testid={`${DATA_TEST_ID_PREFIX}-assigned-to-link`}
          >
            <Avatar size="sm">
              <AvatarFallback>
                {getInitials(task.assignedTo.firstName, task.assignedTo.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="gba:flex gba:flex-col">
              <span className="gba:font-medium gba:text-sm">{task.assignedTo.displayName}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{task.assignedTo.department}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reference Card */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-reference-section`}>
        <CardHeader>
          <CardTitle>Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-3 gba:rounded gba:transition-colors"
            onClick={handleReferenceClick}
            data-testid={`${DATA_TEST_ID_PREFIX}-reference-link`}
          >
            <div className="gba:font-medium gba:text-sm gba:mb-2">
              {task.reference.name}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant={getReferenceTypeBadgeVariant(task.reference.type)} className="gba:text-xs">
                {task.reference.type.charAt(0).toUpperCase() + task.reference.type.slice(1)}
              </Badge>
              {task.reference.description && (
                <span className="gba:text-xs gba:text-muted-foreground">
                  {task.reference.description}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Card */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-schedule-section`}>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-2">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-muted-foreground">Due Date:</span>
              <span className="gba:text-sm gba:font-medium">
                {formatDate(task.dueDate)}
              </span>
            </div>
            {task.scheduleDate && (
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:text-muted-foreground">Scheduled:</span>
                <span className="gba:text-sm gba:font-medium">
                  {formatDate(task.scheduleDate)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-timeline-section`}>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-2">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-muted-foreground">Created:</span>
              <span className="gba:text-sm gba:font-medium">
                {formatDateTime(task.createdAt)}
              </span>
            </div>
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:text-muted-foreground">Last Updated:</span>
              <span className="gba:text-sm gba:font-medium">
                {formatDateTime(task.updatedAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task ID Card */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-metadata-section`}>
        <CardContent>
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-xs gba:text-muted-foreground">Task ID:</span>
            <span className="gba:text-xs gba:font-mono">
              {task.id}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 