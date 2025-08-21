import React, { useState, useEffect, useMemo } from 'react';
import { 
  PageLayout, 
  Card, 
  Button, 
  Badge, 
  Alert,
  Spinner,
  type KpiCardData
} from '@newwork/nw-design-system';
import { Table } from 'antd';
import { SubmittedRequest, WorkflowEngine, StepStatus } from '../../../types';
import { formatRequestId } from '../../../utils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { ClockCounterClockwise, CheckCircle, XCircle, FileText, User, Calendar, CurrencyDollar, Building, Phone, Globe, X } from '@phosphor-icons/react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useRealEmployeeData } from '../hooks/useRealEmployeeData';
import { useEmploymentTypeCatalog } from '../hooks/useEmploymentTypeCatalog';

export interface MyRequestsProps extends BusinessAppContextProps {
  workflowEngine: WorkflowEngine;
  onBack: () => void;
}

interface RequestTimelineProps {
  request: SubmittedRequest;
  contextProps: BusinessAppContextProps;
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({ request, contextProps }) => {
  // Load real data for ID resolution
  const { employees, departments, jobPositions, isLoading: dataLoading } = useRealEmployeeData(contextProps);
  const { employmentTypes, isLoading: catalogLoading } = useEmploymentTypeCatalog(contextProps);
  
  // Get the actual employee ID for the requesting user
  const requestingEmployeeId = contextProps.userInfo?.employeeDetails?.employeeId;
  
  // Debug logging to understand User ID vs Employee ID mapping
  React.useEffect(() => {
    if (employees.length > 0) {
      console.log(`[MyRequests] Employee data loaded: ${employees.length} employees`);
      console.log(`[MyRequests] User ID (requesterId): ${request.requesterId}`);
      console.log(`[MyRequests] Employee ID (from context): ${requestingEmployeeId}`);
      
      const foundEmployee = findEmployeeById(request.requesterId);
      if (foundEmployee) {
        console.log(`[MyRequests] ✅ Found employee: ${foundEmployee.displayName} (matched via ${foundEmployee.employeeId === requestingEmployeeId ? 'Employee ID' : 'direct lookup'})`);
      } else {
        console.log(`[MyRequests] ❌ Employee not found. Need to investigate ID mapping.`);
        
        // Show what employee IDs we have available
        if (requestingEmployeeId) {
          const directEmployeeMatch = employees.find(emp => emp.employeeId === requestingEmployeeId);
          if (directEmployeeMatch) {
            console.log(`[MyRequests] ✅ Found employee via Employee ID: ${directEmployeeMatch.displayName}`);
          } else {
            console.log(`[MyRequests] ❌ Employee ID ${requestingEmployeeId} also not found`);
          }
        }
      }
    }
  }, [employees, request.requesterId, requestingEmployeeId]);
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'done': return <CheckCircle className="gba:text-green-600" size={20} />;
      case 'in_progress': return <ClockCounterClockwise className="gba:text-blue-600 gba:animate-spin" size={20} />;
      case 'blocked': return <XCircle className="gba:text-red-600" size={20} />;
      case 'ready': return <div className="gba:w-5 gba:h-5 gba:bg-yellow-400 gba:rounded-full gba:flex gba:items-center gba:justify-center">
        <div className="gba:w-2 gba:h-2 gba:bg-white gba:rounded-full"></div>
      </div>;
      default: return <div className="gba:w-5 gba:h-5 gba:bg-gray-300 gba:rounded-full"></div>;
    }
  };

  const getStepStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'done': return 'gba:border-green-200 gba:bg-green-50';
      case 'in_progress': return 'gba:border-blue-200 gba:bg-blue-50';
      case 'blocked': return 'gba:border-red-200 gba:bg-red-50';
      case 'ready': return 'gba:border-yellow-200 gba:bg-yellow-50';
      default: return 'gba:border-gray-200 gba:bg-gray-50';
    }
  };

  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt) return '';
    const start = new Date(startedAt);
    const end = finishedAt ? new Date(finishedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getFieldIcon = (fieldName: string) => {
    const name = fieldName.toLowerCase();
    if (name.includes('name') || name.includes('employee') || name.includes('user')) return User;
    if (name.includes('date') || name.includes('time') || name.includes('due')) return Calendar;
    if (name.includes('amount') || name.includes('budget') || name.includes('cost') || name.includes('salary')) return CurrencyDollar;
    if (name.includes('company') || name.includes('department') || name.includes('office')) return Building;
    if (name.includes('phone') || name.includes('mobile') || name.includes('contact')) return Phone;
    if (name.includes('url') || name.includes('website') || name.includes('link')) return Globe;
    if (name.includes('description') || name.includes('reason') || name.includes('comment') || name.includes('note')) return FileText;
    return FileText;
  };

  // Enhanced employee lookup function that handles both User IDs and Employee IDs
  const findEmployeeById = (targetId: string) => {
    if (!targetId || employees.length === 0) return null;
    
    // Special case: if this is the requesting user's User ID, use their Employee ID instead
    if (targetId === request.requesterId && requestingEmployeeId) {
      const employeeByEmployeeId = employees.find(emp => emp.employeeId === requestingEmployeeId);
      if (employeeByEmployeeId) return employeeByEmployeeId;
    }
    
    // Check all possible ID fields: EmployeePosition.id, EmployeePosition.employeeId, Employee.id
    return employees.find(emp => 
      emp.id === targetId ||                    // EmployeePosition.id
      emp.employeeId === targetId ||           // EmployeePosition.employeeId  
      emp.actualEmployeeId === targetId ||     // Employee.id
      emp.displayName?.toLowerCase().includes(targetId.toLowerCase()) // Fallback name match
    );
  };

  // Enhanced field value formatter that resolves IDs to human-readable names
  const formatFieldValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    
    const keyLower = key.toLowerCase();
    const valueStr = value.toString();
    
    // Show loading state while data is being fetched
    if (dataLoading || catalogLoading) return `${valueStr} (loading...)`;
    
    // Date formatting
    if (keyLower.includes('date') && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return valueStr;
      }
    }
    
    // Resolve IDs to names using loaded data
    try {
      // Department ID resolution
      if (keyLower.includes('department')) {
        const department = departments.find(d => d.id === valueStr);
        if (department) return department.name;
      }
      
      // Position/Job Title ID resolution  
      if (keyLower.includes('position') || keyLower.includes('job')) {
        const position = jobPositions.find(p => p.id === valueStr);
        if (position) return position.name;
      }
      
      // Employee ID resolution (reporting manager, etc.)
      if (keyLower.includes('manager') || keyLower.includes('supervisor') || keyLower.includes('employee')) {
        const employee = findEmployeeById(valueStr);
        if (employee) return employee.displayName;
      }
      
      // Employment Type ID resolution
      if (keyLower.includes('employment') && keyLower.includes('type')) {
        const empType = employmentTypes.find(et => et.id === valueStr);
        if (empType) return empType.name;
      }
      
      // User ID resolution for "submitted by" and other user fields
      if (keyLower.includes('user') || keyLower.includes('by') || keyLower.includes('created')) {
        const user = findEmployeeById(valueStr);
        if (user) return user.displayName;
        
        // Fallback: Use context employee details if this is the current user
        if (valueStr === contextProps.userInfo?.id && contextProps.userInfo?.employeeDetails) {
          const { firstName, lastName } = contextProps.userInfo.employeeDetails;
          return `${firstName} ${lastName}`;
        }
        
        // Final fallback for unresolved user IDs
        if (valueStr.length > 30) return valueStr.slice(0, 8) + '... (User name not available)';
      }
    } catch (error) {
      console.warn(`Failed to resolve ID for ${key}:`, error);
    }
    
    // Return original value if no resolution found
    return valueStr;
  };

  const formatFieldLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Resolve user names in timeline messages
  const resolveTimelineMessage = (message: string): string => {
    if (dataLoading) return message; // Don't resolve while loading
    
    try {
      // Replace generic "User" with actual user names based on context
      let resolvedMessage = message;
      
      // Pattern: "Request [Title] submitted by User"
      if (message.includes('submitted by User')) {
        const submittedBy = findEmployeeById(request.requesterId);
        if (submittedBy) {
          resolvedMessage = message.replace('User', submittedBy.displayName);
        } else if (request.requesterId === contextProps.userInfo?.id && contextProps.userInfo?.employeeDetails) {
          // Use context employee details if available
          const { firstName, lastName } = contextProps.userInfo.employeeDetails;
          resolvedMessage = message.replace('User', `${firstName} ${lastName}`);
        } else {
          // Fallback for unresolved users
          resolvedMessage = message.replace('User', 'User');
        }
      }
      
      // Pattern: "User started the request"
      if (message.includes('User') && message.includes('started')) {
        const initiator = findEmployeeById(request.requesterId);
        if (initiator) {
          resolvedMessage = message.replace('User', initiator.displayName);
        } else if (request.requesterId === contextProps.userInfo?.id && contextProps.userInfo?.employeeDetails) {
          const { firstName, lastName } = contextProps.userInfo.employeeDetails;
          resolvedMessage = message.replace('User', `${firstName} ${lastName}`);
        } else {
          resolvedMessage = message.replace('User', 'User');
        }
      }
      
      // Pattern: "User completed step X"
      if (message.includes('User') && message.includes('completed')) {
        // Try to find user from step assignees
        const completedStep = request.steps.find(s => s.status === 'done');
        if (completedStep?.assignedToUserId) {
          const assignee = findEmployeeById(completedStep.assignedToUserId);
          if (assignee) {
            resolvedMessage = message.replace('User', assignee.displayName);
          }
        }
      }
      
      return resolvedMessage;
    } catch (error) {
      console.warn('Failed to resolve timeline message:', error);
      return message;
    }
  };

  return (
    <div className="gba:space-y-6">
      {/* Request Overview Card */}
      <Card className="gba:p-6 gba:border-2 gba:border-blue-100 gba:bg-gradient-to-r gba:from-blue-50 gba:to-background">
        <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
          <div>
            <h4 className="gba:text-xl gba:font-bold gba:text-foreground gba:mb-2">
              {request.titleSnapshot}
            </h4>
            <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
              <span className="gba:flex gba:items-center gba:gap-1">
                <code className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                  {formatRequestId(request.id)}
                </code>
              </span>
              <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="gba:flex gba:flex-col gba:items-end gba:gap-2">
            <Badge variant="default" className="gba:text-sm gba:px-3 gba:py-1 gba:bg-green-100 gba:text-green-800">
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
            <span className="gba:text-xs gba:text-muted-foreground">
              {request.steps.filter(s => s.status === 'done').length} of {request.steps.length} steps completed
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2 gba:mb-2">
          <div 
            className="gba:bg-blue-600 gba:h-2 gba:rounded-full gba:transition-all gba:duration-500"
            style={{ 
              width: `${(request.steps.filter(s => s.status === 'done').length / request.steps.length) * 100}%` 
            }}
          ></div>
        </div>
        <div className="gba:text-xs gba:text-muted-foreground">
          Progress: {Math.round((request.steps.filter(s => s.status === 'done').length / request.steps.length) * 100)}% complete
        </div>
      </Card>

      {/* Submitted Form Data */}
      {request.formData && Object.keys(request.formData).length > 0 && (
        <Card className="gba:p-6">
          <h5 className="gba:text-lg gba:font-semibold gba:mb-6 gba:flex gba:items-center gba:gap-2">
            <FileText size={20} />
            Submitted Information
          </h5>
          
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
            {Object.entries(request.formData).map(([key, value]) => {
              const IconComponent = getFieldIcon(key);
              const formattedValue = formatFieldValue(key, value);
              const isLongText = formattedValue.length > 50;
              
              return (
                <div 
                  key={key} 
                  className={`gba:p-4 gba:border gba:border-gray-200 gba:rounded-lg gba:bg-gray-50/50 gba:transition-all gba:duration-200 hover:gba:bg-gray-100/50 hover:gba:border-gray-300 ${
                    isLongText ? 'gba:md:col-span-2' : ''
                  }`}
                >
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg gba:flex-shrink-0">
                      <IconComponent size={16} className="gba:text-blue-600" />
                    </div>
                    
                    <div className="gba:flex-1 gba:min-w-0">
                      <h6 className="gba:text-sm gba:font-semibold gba:text-gray-700 gba:mb-1">
                        {formatFieldLabel(key)}
                      </h6>
                      
                      {isLongText ? (
                        <div className="gba:text-sm gba:text-gray-600 gba:bg-white gba:p-3 gba:rounded gba:border gba:whitespace-pre-wrap gba:font-mono gba:text-xs">
                          {formattedValue}
                        </div>
                      ) : (
                        <p className="gba:text-sm gba:text-gray-600 gba:truncate" title={formattedValue}>
                          {formattedValue}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Submission Metadata */}
          <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200">
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-xs gba:text-muted-foreground">
              <div className="gba:flex gba:flex-col">
                <span className="gba:font-medium gba:text-gray-700">Submitted By</span>
                <span>{(() => {
                  if (dataLoading) return `Loading user...`;
                  const submitter = findEmployeeById(request.requesterId);
                  if (submitter) return submitter.displayName;
                  
                  // Fallback: Use employee details from context if available
                  if (request.requesterId === contextProps.userInfo?.id && contextProps.userInfo?.employeeDetails) {
                    const { firstName, lastName } = contextProps.userInfo.employeeDetails;
                    return `${firstName} ${lastName}`;
                  }
                  
                  // Final fallback for unresolved users
                  return `${request.requesterId.slice(0, 8)}... (User name not available)`;
                })()}</span>
              </div>
              <div className="gba:flex gba:flex-col">
                <span className="gba:font-medium gba:text-gray-700">Template Version</span>
                <span>v{request.templateVersion}</span>
              </div>
              <div className="gba:flex gba:flex-col">
                <span className="gba:font-medium gba:text-gray-700">Template ID</span>
                <span className="gba:font-mono">{request.templateId}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Workflow Steps */}
      <Card className="gba:p-6">
        <h5 className="gba:text-lg gba:font-semibold gba:mb-6 gba:flex gba:items-center gba:gap-2">
          <ClockCounterClockwise size={20} />
          Workflow Progress
        </h5>
        
        <div className="gba:space-y-4">
          {request.steps.map((step, index) => (
            <div key={step.id} className="gba:relative">
              {/* Connecting Line */}
              {index < request.steps.length - 1 && (
                <div className="gba:absolute gba:left-[10px] gba:top-[28px] gba:w-[2px] gba:h-[40px] gba:bg-gray-300"></div>
              )}
              
              <div className={`gba:flex gba:gap-4 gba:p-4 gba:border gba:rounded-lg gba:transition-all gba:duration-300 ${getStepStatusColor(step.status)}`}>
                {/* Step Icon */}
                <div className="gba:flex-shrink-0 gba:mt-1">
                  {getStepIcon(step.status)}
                </div>
                
                {/* Step Content */}
                <div className="gba:flex-1">
                  <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                    <div>
                      <h6 className="gba:font-semibold gba:text-foreground gba:mb-1">
                        {step.name}
                      </h6>
                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Badge variant="outline" className="gba:text-xs">
                            {step.desk}
                          </Badge>
                        </span>
                        {step.assignedToUserId && (
                          <span>Assigned to: {step.assignedToUserId}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Step Status Badge */}
                    <Badge 
                      variant="default"
                      className={
                        step.status === 'done' ? 'gba:bg-green-100 gba:text-green-800' :
                        step.status === 'in_progress' ? 'gba:bg-blue-100 gba:text-blue-800' :
                        step.status === 'blocked' ? 'gba:bg-red-100 gba:text-red-800' :
                        step.status === 'ready' ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                        'gba:bg-gray-100 gba:text-gray-800'
                      }
                    >
                      {step.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  {/* Timestamps and Duration */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:text-xs gba:text-muted-foreground gba:mt-3">
                    {step.startedAt && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Started</span>
                        <span>{new Date(step.startedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {step.finishedAt && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Completed</span>
                        <span>{new Date(step.finishedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {(step.startedAt || step.finishedAt) && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Duration</span>
                        <span>{formatDuration(step.startedAt, step.finishedAt) || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Comments */}
                  {step.comments.length > 0 && (
                    <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-gray-200">
                      <span className="gba:text-xs gba:font-medium gba:text-gray-700 gba:block gba:mb-2">
                        Comments ({step.comments.length})
                      </span>
                      <div className="gba:space-y-2">
                        {step.comments.slice(-2).map((comment) => (
                          <div key={comment.id} className="gba:bg-background gba:p-2 gba:rounded gba:text-xs">
                            <div className="gba:font-medium gba:mb-1">{comment.authorId}</div>
                            <div className="gba:text-muted-foreground gba:mb-1">{comment.body}</div>
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity Timeline */}
      {request.timeline.length > 0 && (
        <Card className="gba:p-6">
          <h5 className="gba:text-lg gba:font-semibold gba:mb-4">Recent Activity</h5>
          <div className="gba:space-y-3 gba:max-h-64 gba:overflow-y-auto">
            {request.timeline.slice(-5).reverse().map((event, index) => (
              <div 
                key={index}
                className="gba:flex gba:justify-between gba:items-start gba:p-3 gba:bg-muted/30 gba:rounded-md gba:text-sm gba:border-l-4 gba:border-blue-400"
              >
                <span className="gba:text-foreground">{resolveTimelineMessage(event.message)}</span>
                <span className="gba:text-muted-foreground gba:text-xs gba:whitespace-nowrap gba:ml-4 gba:font-mono">
                  {new Date(event.at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const getStatusBadgeProps = (status: string) => {
  switch (status) {
    case 'completed':
      return { variant: 'default' as const, className: 'gba:bg-green-100 gba:text-green-800' };
    case 'open':
      return { variant: 'secondary' as const, className: 'gba:bg-blue-100 gba:text-blue-800' };
    case 'cancelled':
      return { variant: 'outline' as const, className: 'gba:bg-red-100 gba:text-red-800' };
    default:
      return { variant: 'secondary' as const };
  }
};

export const MyRequests: React.FC<MyRequestsProps> = ({
  workflowEngine,
  onBack,
  ...contextProps
}) => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SubmittedRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle opening drawer with selected request
  const handleViewRequest = (request: SubmittedRequest) => {
    setSelectedRequest(request);
    setIsDrawerOpen(true);
  };

  // Handle closing drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // Delay clearing selected request for smooth animation
    setTimeout(() => setSelectedRequest(null), 300);
  };

  // Handle keyboard events (Escape to close drawer)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawerOpen) {
        handleCloseDrawer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Load user's requests
  useEffect(() => {
    const loadRequests = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const userRequests = await workflowEngine.getMyRequests();
        setRequests(userRequests);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, [workflowEngine]);

  // Calculate KPI statistics
  const kpiCards: KpiCardData[] = useMemo(() => {
    const totalRequests = requests.length;
    const openRequests = requests.filter(r => r.status === 'open').length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const avgCompletionDays = completedRequests > 0 ? '2.5 days' : 'N/A';

    return [
      {
        id: 'total-requests',
        title: 'Total Requests',
        value: totalRequests,
        description: 'All submitted requests'
      },
      {
        id: 'active-requests',
        title: 'Active Requests',
        value: openRequests,
        description: 'Currently being processed'
      },
      {
        id: 'completed-requests',
        title: 'Completed',
        value: completedRequests,
        description: 'Successfully completed'
      },
      {
        id: 'avg-completion',
        title: 'Avg. Completion Time',
        value: avgCompletionDays,
        description: 'Average time to complete'
      }
    ];
  }, [requests]);

  // Table columns
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => (
        <code className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
          {formatRequestId(id)}
        </code>
      )
    },
    {
      title: 'Service',
      dataIndex: 'titleSnapshot',
      key: 'title'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const badgeProps = getStatusBadgeProps(status);
        return (
          <Badge {...badgeProps}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      }
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SubmittedRequest) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleViewRequest(record)}
        >
          View Details
        </Button>
      )
    }
  ];

  if (isLoading) {
    return (
      <PageLayout
        headerPhosphorIcon={{
          icon: ClockCounterClockwise,
          variant: "strategy",
          size: "lg",
          label: "My Requests"
        }}
        headerTitle="My Requests"
        headerDescription="Loading your service requests..."
      >
        <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
          <Spinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <div data-testid="my-requests-error-container" style={{ backgroundColor: "white", padding: "16px" }}>
        {/* Back navigation */}
        <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
          <button
            onClick={onBack}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
            data-testid="back-button"
          >
            <ArrowLeftOutlined className="gba:mr-2" />
            <span>Back to Catalog</span>
          </button>
        </div>
        
        <PageLayout
                  headerPhosphorIcon={{
          icon: XCircle,
          variant: "strategy",
          size: "lg",
          label: "Error"
        }}
          headerTitle="Error Loading Requests"
          headerDescription="Failed to load your service requests"
        >
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Failed to Load Requests</h4>
          <p>{error}</p>
          <div className="gba:mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Alert>
        </PageLayout>
      </div>
    );
  }

  return (
    <div 
      data-testid="my-requests-container" 
      style={{ backgroundColor: "white", padding: "16px" }}
      className="gba:transition-all gba:duration-300"
    >
      {/* Back navigation */}
      <div className="gba:back-navigation" style={{ marginBottom: "16px" }}>
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftOutlined className="gba:mr-2" />
          <span>Back to Catalog</span>
        </button>
      </div>
      
      <PageLayout
        headerPhosphorIcon={{
          icon: ClockCounterClockwise,
          variant: "strategy",
          size: "lg",
          label: "My Requests"
        }}
        headerTitle="My Requests"
        headerDescription="Track the status of your submitted service requests"
        sectionTitle="Request Statistics"
        sectionDescription="Overview of your service requests"
        kpiCardsData={kpiCards}
      >
        <div>
        {/* Request List */}
        <div className="gba:space-y-6">
          {requests.length > 0 ? (
            <div className="gba:space-y-4">
              <h3 className="gba:text-lg gba:font-semibold">All Requests</h3>
              <Table
                columns={columns}
                dataSource={requests}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  showQuickJumper: false
                }}
              />
            </div>
          ) : (
            <div className="gba:text-center gba:py-12">
              <ClockCounterClockwise className="gba:mx-auto gba:h-16 gba:w-16 gba:text-muted-foreground gba:mb-4" />
              <h3 className="gba:text-lg gba:font-semibold gba:mb-2">No Requests Yet</h3>
              <p className="gba:text-muted-foreground gba:mb-6">
                You haven't submitted any service requests yet. Get started by browsing our service catalog.
              </p>
              <Button onClick={() => { handleCloseDrawer(); onBack(); }}>
                Browse Service Catalog
              </Button>
            </div>
          )}
        </div>
        </div>
      </PageLayout>

      {/* Request Details Drawer - Moved to root level */}
      <>
        {/* Overlay */}
        <div 
          style={{
            position: 'fixed',
            top: '48px', // Just below header with no gap
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)', // Safari support
            zIndex: isDrawerOpen ? 999 : -1,
            opacity: isDrawerOpen ? 1 : 0,
            transition: 'opacity 300ms ease-in-out',
            pointerEvents: isDrawerOpen ? 'auto' : 'none'
          }}
          onClick={handleCloseDrawer}
        />
        
        {/* Drawer */}
        <div 
          style={{
            position: 'fixed',
            right: 0,
            top: '48px', // Match overlay position exactly
            height: 'calc(100vh - 48px)', // Full height minus header
            width: '800px',
            maxWidth: '95vw',
            backgroundColor: 'white',
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #e5e7eb'
          }}
        >
          {/* Drawer Header */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}
          >
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                Request Details
              </h3>
              {selectedRequest && (
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', margin: 0 }}>
                  {formatRequestId(selectedRequest.id)} • {selectedRequest.titleSnapshot}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCloseDrawer}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Drawer Content */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: 'white'
            }}
          >
            {selectedRequest && isDrawerOpen && <RequestTimeline request={selectedRequest} contextProps={contextProps} />}
          </div>
        </div>
      </>
    </div>
  );
};