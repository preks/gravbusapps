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
import { UserDisplayName } from '../../../components/UserDisplayName';

export interface MyRequestsProps extends BusinessAppContextProps {
  workflowEngine: WorkflowEngine;
  onBack: () => void;
}

interface RequestTimelineProps {
  request: SubmittedRequest;
  contextProps: BusinessAppContextProps & { workflowEngine: WorkflowEngine };
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({ request: initialRequest, contextProps }) => {
  const [request, setRequest] = useState<SubmittedRequest>(initialRequest);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Auto-refresh mechanism for live data
  const refreshRequestData = async () => {
    try {
      setIsRefreshing(true);
      console.log(`[RequestTimeline] 🔄 Refreshing live data for request: ${request.id}`);
      
      const updatedRequest = await contextProps.workflowEngine.getRequest(request.id);
      setRequest(updatedRequest);
      setLastRefreshed(new Date());
      
      console.log(`[RequestTimeline] ✅ Updated request data:`, {
        id: updatedRequest.id,
        status: updatedRequest.status,
        stepsCompleted: updatedRequest.steps.filter(s => s.status === 'done').length,
        totalSteps: updatedRequest.steps.length,
        timelineEvents: updatedRequest.timeline.length
      });
      
    } catch (error) {
      console.error(`[RequestTimeline] ❌ Failed to refresh request data:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds when drawer is open
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRequestData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [request.id]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleManualRefresh = () => {
      refreshRequestData();
    };

    window.addEventListener('refreshRequestTimeline', handleManualRefresh);
    return () => window.removeEventListener('refreshRequestTimeline', handleManualRefresh);
  }, []);

  // Update request when initialRequest changes (drawer opened with new request)
  useEffect(() => {
    setRequest(initialRequest);
    setLastRefreshed(new Date());
  }, [initialRequest.id]);

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

  // Simplified field value formatter
  const formatFieldValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    
    const keyLower = key.toLowerCase();
    const valueStr = value.toString();
    
    // Date formatting
    if (keyLower.includes('date') && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return valueStr;
      }
    }
    
    return valueStr;
  };

  const formatFieldLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const resolveTimelineMessage = (message: string): string => {
    return message;
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
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant="default" className="gba:text-sm gba:px-3 gba:py-1 gba:bg-green-100 gba:text-green-800">
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
              {isRefreshing && (
                <Badge variant="outline" className="gba:text-xs gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:animate-pulse">
                  🔄 Updating...
                </Badge>
              )}
            </div>
            <div className="gba:text-right">
              <span className="gba:text-xs gba:text-muted-foreground">
                {request.steps.filter(s => s.status === 'done').length} of {request.steps.length} steps completed
              </span>
              <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                📡 Live data • Auto-refresh: 30s
              </div>
            </div>
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
        <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:justify-between gba:items-center">
          <span>Progress: {Math.round((request.steps.filter(s => s.status === 'done').length / request.steps.length) * 100)}% complete</span>
          <span className="gba:flex gba:items-center gba:gap-1">
            <span className={`gba:w-2 gba:h-2 gba:rounded-full ${isRefreshing ? 'gba:bg-blue-500 gba:animate-pulse' : 'gba:bg-green-500'}`}></span>
            {isRefreshing ? 'Syncing...' : 'Live'}
          </span>
        </div>
      </Card>

      {/* Submitted Form Data */}
      {(() => {
        // Use request.formData which contains the actual submitted form data
        const submittedData = request.formData || {};
        
        console.log(`[RequestTimeline] 📋 Using submitted form data for request ${request.id}:`, {
          requestFormDataKeys: request.formData ? Object.keys(request.formData) : [],
          requestFormData: request.formData,
          finalSubmittedData: submittedData,
          finalDataKeys: Object.keys(submittedData),
          dataSource: 'request.formData',
          allSteps: request.steps.map(s => ({ 
            name: s.name, 
            status: s.status,
            hasAssignment: !!(s.assignedToUserId || s.claimedByUserId),
            hasDueDate: !!s.dueDate
          }))
        });
        
        if (Object.keys(submittedData).length === 0) {
          return (
            <Card className="gba:p-6">
              <h5 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
                <FileText size={20} />
                Submitted Information
              </h5>
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <FileText className="gba:mx-auto gba:mb-2" size={24} />
                <p>No submitted form data available</p>
                <p className="gba:text-xs gba:mt-2">
                  Check console for debugging info.
                </p>
              </div>
            </Card>
          );
        }
        
        return (
          <Card className="gba:p-6">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <h5 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
                <FileText size={20} />
                Submitted Information
              </h5>
              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                <Badge variant="outline" className="gba:text-xs">
                  {Object.keys(submittedData).filter(key => 
                    !key.includes('stepAssignment') && 
                    !key.includes('_assignmentMode') && 
                    !key.includes('_allowReassignment') &&
                    submittedData[key] !== null && 
                    submittedData[key] !== undefined && 
                    submittedData[key] !== ''
                  ).length} fields
                </Badge>
                <Badge variant="outline" className="gba:text-xs gba:bg-green-100 gba:text-green-700">
                  ✅ Form Data
                </Badge>
              </div>
            </div>
            
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
              {Object.entries(submittedData).map(([key, value]) => {
                // Skip internal step assignment fields and empty values
                if (key.includes('stepAssignment') || 
                    key.includes('_assignmentMode') || 
                    key.includes('_allowReassignment') ||
                    value === null ||
                    value === undefined ||
                    value === '') {
                  return null;
                }
                
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
              }).filter(Boolean)}
            </div>

            {/* Enhanced Submission Metadata */}
            <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200">
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4 gba:text-xs gba:text-muted-foreground">
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium gba:text-gray-700">Submitted By</span>
                  <UserDisplayName
                    userId={request.requesterId}
                    accessToken={contextProps.accessToken}
                    userInfo={contextProps.userInfo}
                    showIcon={true}
                    color="default"
                    size="small"
                    fallback="Unknown User"
                    testId={`submitted-by-${request.id}`}
                  />
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium gba:text-gray-700">Template</span>
                  <div>
                    <div className="gba:font-mono gba:text-gray-700">{request.templateId}</div>
                    <div className="gba:text-gray-500">v{request.templateVersion}</div>
                  </div>
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium gba:text-gray-700">Category</span>
                  <Badge variant="outline" className="gba:text-xs gba:w-fit">
                    {request.categoryIdSnapshot?.replace(/[-_]/g, ' ') || 'General'}
                  </Badge>
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium gba:text-gray-700">Request Type</span>
                  <span className="gba:text-gray-700">Service Request</span>
                </div>
              </div>
              
              {/* Priority information if available */}
              {(request.formData?.urgency || request.formData?.priority || submittedData?.urgency || submittedData?.priority) && (
                <div className="gba:mt-4 gba:pt-3 gba:border-t gba:border-gray-100">
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-xs">
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:font-medium gba:text-gray-700">Priority/Urgency</span>
                      <Badge 
                        variant="outline" 
                        className={
                          (submittedData?.urgency === 'urgent' || submittedData?.priority === 'high') ? 'gba:bg-red-100 gba:text-red-800' :
                          (submittedData?.urgency === 'medium' || submittedData?.priority === 'medium') ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                          'gba:bg-green-100 gba:text-green-800'
                        }
                      >
                        {(submittedData?.urgency || submittedData?.priority || 'Normal').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Workflow Steps */}
      <Card className="gba:p-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
          <h5 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
            <ClockCounterClockwise size={20} />
            Workflow Progress
          </h5>
          <div className="gba:flex gba:items-center gba:gap-2">
            {isRefreshing && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-blue-600">
                <div className="gba:w-3 gba:h-3 gba:border-2 gba:border-blue-500 gba:border-t-transparent gba:rounded-full gba:animate-spin"></div>
                Refreshing...
              </div>
            )}
            <span className="gba:text-xs gba:text-gray-500">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
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
                          <span className="gba:flex gba:items-center gba:gap-1">
                            Assigned to: 
                            <UserDisplayName
                              userId={step.assignedToUserId}
                              accessToken={contextProps.accessToken}
                              userInfo={contextProps.userInfo}
                              showIcon={false}
                              color="blue"
                              size="small"
                              fallback="Unknown User"
                              testId={`step-assignee-${step.id}`}
                            />
                          </span>
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
                  
                  {/* Enhanced Timestamps and Due Dates */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-3 gba:text-xs gba:text-muted-foreground gba:mt-3">
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
                    {step.dueDate && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Due Date</span>
                        <span className={new Date(step.dueDate) < new Date() ? 'gba:text-red-600 gba:font-semibold' : 'gba:text-gray-700'}>
                          {new Date(step.dueDate).toLocaleString()}
                          {new Date(step.dueDate) < new Date() && (
                            <span className="gba:ml-1 gba:text-red-500 gba:font-bold">⚠️ OVERDUE</span>
                          )}
                        </span>
                      </div>
                    )}
                    {(step.startedAt || step.finishedAt) && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Duration</span>
                        <span>{formatDuration(step.startedAt, step.finishedAt) || 'In Progress'}</span>
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
                            <div className="gba:flex gba:items-center gba:gap-1 gba:font-medium gba:mb-1">
                              <UserDisplayName
                                userId={comment.authorId}
                                accessToken={contextProps.accessToken}
                                userInfo={contextProps.userInfo}
                                showIcon={false}
                                color="default"
                                size="small"
                                fallback="Unknown User"
                                testId={`comment-author-${comment.id}`}
                              />
                            </div>
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

      {/* Enhanced Activity Timeline with Live Updates */}
      {request.timeline.length > 0 && (
        <Card className="gba:p-6">
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
            <h5 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
              <FileText size={20} />
              Recent Activity
              <Badge variant="outline" className="gba:text-xs gba:ml-2">
                {request.timeline.length} events
              </Badge>
            </h5>
            <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:gap-1">
              <span className={`gba:w-2 gba:h-2 gba:rounded-full ${isRefreshing ? 'gba:bg-blue-500 gba:animate-pulse' : 'gba:bg-green-500'}`}></span>
              Real-time
            </div>
          </div>
          <div className="gba:space-y-3 gba:max-h-80 gba:overflow-y-auto">
            {request.timeline.slice(-10).reverse().map((event, index) => (
              <div 
                key={index}
                className="gba:flex gba:justify-between gba:items-start gba:p-4 gba:bg-muted/30 gba:rounded-md gba:text-sm gba:border-l-4 gba:border-blue-400 gba:transition-all gba:duration-200 hover:gba:bg-muted/50"
              >
                <div className="gba:flex-1">
                  <span className="gba:text-foreground gba:font-medium">{resolveTimelineMessage(event.message)}</span>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:flex gba:items-center gba:gap-2">
                    <Calendar size={12} />
                    {new Date(event.at).toLocaleString()}
                  </div>
                </div>
                <div className="gba:text-xs gba:text-muted-foreground gba:font-mono gba:ml-4">
                  {(() => {
                    const eventTime = new Date(event.at);
                    const now = new Date();
                    const diffMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
                    
                    if (diffMinutes < 1) return 'Just now';
                    if (diffMinutes < 60) return `${diffMinutes}m ago`;
                    
                    const diffHours = Math.floor(diffMinutes / 60);
                    if (diffHours < 24) return `${diffHours}h ago`;
                    
                    const diffDays = Math.floor(diffHours / 24);
                    return `${diffDays}d ago`;
                  })()}
                </div>
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

  // Enhanced table columns with more details
  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <code className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
          {formatRequestId(id)}
        </code>
      )
    },
    {
      title: 'Service',
      dataIndex: 'titleSnapshot',
      key: 'title',
      ellipsis: true
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 120,
      render: (_: any, record: SubmittedRequest) => {
        const completed = record.steps.filter(s => s.status === 'done').length;
        const total = record.steps.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return (
          <div className="gba:space-y-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:font-medium">{percentage}%</span>
              <div className="gba:flex-1 gba:bg-gray-200 gba:rounded-full gba:h-2">
                <div 
                  className="gba:bg-blue-500 gba:h-2 gba:rounded-full gba:transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <div className="gba:text-xs gba:text-gray-500">
              {completed} of {total} steps
            </div>
          </div>
        );
      }
    },
    {
      title: 'Current Step',
      key: 'currentStep',
      width: 150,
      render: (_: any, record: SubmittedRequest) => {
        const currentStep = record.steps.find(s => s.status === 'in_progress' || s.status === 'ready');
        const nextStep = record.steps.find(s => s.status === 'pending');
        const activeStep = currentStep || nextStep;
        
        if (!activeStep) {
          return <span className="gba:text-gray-500 gba:text-sm">Completed</span>;
        }
        
        return (
          <div className="gba:space-y-1">
            <div className="gba:text-sm gba:font-medium gba:truncate" title={activeStep.name}>
              {activeStep.name}
            </div>
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
              <Badge variant="outline" className="gba:text-xs">
                {activeStep.desk}
              </Badge>
              {activeStep.assignedToUserId && (
                <span className="gba:text-gray-500">
                  • Assigned
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 90,
      render: (_: any, record: SubmittedRequest) => {
        const urgency = record.formData?.urgency || record.formData?.priority;
        const earliestDue = record.steps
          .filter(s => s.dueDate)
          .map(s => new Date(s.dueDate!))
          .sort((a, b) => a.getTime() - b.getTime())[0];
        
        const isOverdue = earliestDue && earliestDue < new Date();
        
        // Determine priority based on urgency and due dates
        const getPriorityInfo = () => {
          if (isOverdue) return { level: 'High', color: 'gba:bg-red-100 gba:text-red-800' };
          if (urgency === 'urgent' || urgency === 'high') return { level: 'High', color: 'gba:bg-red-100 gba:text-red-800' };
          if (urgency === 'medium' || urgency === 'normal') return { level: 'Medium', color: 'gba:bg-yellow-100 gba:text-yellow-800' };
          if (urgency === 'low') return { level: 'Low', color: 'gba:bg-green-100 gba:text-green-800' };
          return { level: 'Normal', color: 'gba:bg-gray-100 gba:text-gray-800' };
        };
        
        const { level, color } = getPriorityInfo();
        
        return (
          <Badge variant="outline" className={color}>
            {level}
          </Badge>
        );
      }
    },
    {
      title: 'Requester',
      key: 'requester',
      width: 120,
      render: (_: any, record: SubmittedRequest) => (
        <UserDisplayName
          userId={record.requesterId}
          accessToken={contextProps.accessToken}
          userInfo={contextProps.userInfo}
          showIcon={true}
          color="default"
          size="small"
          fallback="Unknown User"
          testId={`requester-${record.id}`}
        />
      )
    },
    {
      title: 'Category',
      key: 'category',
      width: 100,
      render: (_: any, record: SubmittedRequest) => {
        // Extract readable category from categoryIdSnapshot  
        const category = record.categoryIdSnapshot || 'general';
        const displayCategory = category
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        return (
          <Badge variant="outline" className="gba:text-xs">
            {displayCategory}
          </Badge>
        );
      }
    },
    {
      title: 'Est. Completion',
      key: 'estimatedCompletion', 
      width: 110,
      render: (_: any, record: SubmittedRequest) => {
        const nextDueDate = record.steps
          .filter(s => s.dueDate && s.status !== 'done')
          .map(s => new Date(s.dueDate!))
          .sort((a, b) => a.getTime() - b.getTime())[0];
        
        if (!nextDueDate) {
          return <span className="gba:text-gray-500 gba:text-xs">No deadline</span>;
        }
        
        const now = new Date();
        const diffDays = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        const isOverdue = diffDays < 0;
        const isDueSoon = diffDays <= 2 && diffDays >= 0;
        
        return (
          <div className="gba:space-y-1">
            <div className={`gba:text-sm ${isOverdue ? 'gba:text-red-600' : isDueSoon ? 'gba:text-yellow-600' : 'gba:text-gray-700'}`}>
              {nextDueDate.toLocaleDateString()}
            </div>
            <div className={`gba:text-xs ${isOverdue ? 'gba:text-red-500' : isDueSoon ? 'gba:text-yellow-500' : 'gba:text-gray-500'}`}>
              {isOverdue ? `${Math.abs(diffDays)} days overdue` :
               diffDays === 0 ? 'Due today' :
               diffDays === 1 ? 'Due tomorrow' :
               `Due in ${diffDays} days`}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
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
      width: 110,
      render: (date: string) => {
        const createdDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="gba:space-y-1">
            <div className="gba:text-sm">{createdDate.toLocaleDateString()}</div>
            <div className="gba:text-xs gba:text-gray-500">
              {diffDays === 0 ? 'Today' : 
               diffDays === 1 ? '1 day ago' : 
               `${diffDays} days ago`}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
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
                scroll={{ x: 1200 }}
                size="middle"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} requests`,
                  pageSizeOptions: ['10', '20', '50']
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

      {/* Request Details Drawer */}
      <>
        {/* Overlay */}
        <div 
          style={{
            position: 'fixed',
            top: '48px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
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
            top: '48px',
            height: 'calc(100vh - 48px)',
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
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', margin: 0 }}>
                    {formatRequestId(selectedRequest.id)} • {selectedRequest.titleSnapshot}
                  </p>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Manual refresh trigger - will be handled by the timeline component
                        const refreshEvent = new CustomEvent('refreshRequestTimeline');
                        window.dispatchEvent(refreshEvent);
                      }}
                    >
                      🔄 Refresh Data
                    </Button>
                  </div>
                </div>
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
            {selectedRequest && isDrawerOpen && (
              <RequestTimeline 
                request={selectedRequest} 
                contextProps={{ ...contextProps, workflowEngine }} 
              />
            )}
          </div>
        </div>
      </>
    </div>
  );
};