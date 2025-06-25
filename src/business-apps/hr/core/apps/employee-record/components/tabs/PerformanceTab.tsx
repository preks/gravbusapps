'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback, EmployeePerformanceGoal } from '../../hooks/useEmployeeData';
import { Card, Button } from '@newwork/gravity-ui-catalog';
import { Empty, Spin, Drawer, Descriptions, Tag } from 'antd';
import { startProcess } from '@/common/utils/start-process';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { employeePerformanceQuery } from '../../queries/performanceQueries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { CloseOutlined, EditOutlined } from '@ant-design/icons';


interface PerformanceTabProps {
  employee: Employee;
  accessToken: string;
  employeeFeedback?: EmployeeFeedback[];
  employeePerformanceGoal?: EmployeePerformanceGoal[];
}

// Extended interfaces to include properties used in the drawer
interface FormattedFeedback {
  sender: string;
  date: string;
  content: string;
  avatar?: string | null;
  senderId?: string;
}

// Extend EmployeePerformanceGoal to include optional id and description
interface ExtendedEmployeePerformanceGoal extends EmployeePerformanceGoal {
  id?: string;
  description?: string;
}

/**
 * Performance Tab Component
 * Displays performance goals and feedback for the employee
 */
const PerformanceTab: React.FC<PerformanceTabProps> = ({ 
  employee,
  accessToken,
  employeeFeedback = [],
  employeePerformanceGoal = []
}) => {
  const [localPerformanceGoals, setLocalPerformanceGoals] = useState<ExtendedEmployeePerformanceGoal[]>([]);
  const [localFeedback, setLocalFeedback] = useState<EmployeeFeedback[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerType, setDrawerType] = useState<'goal' | 'feedback'>('goal');
  const [selectedGoal, setSelectedGoal] = useState<ExtendedEmployeePerformanceGoal | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FormattedFeedback | null>(null);
  const [drawerWidth] = useState<number>(600);
  
  // Initialize GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Fetch performance data
  const fetchPerformanceData = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await graphQLClient.request(
        employeePerformanceQuery,
        { employeeId: employee.id }
      );
      
      if (response) {
        setLocalPerformanceGoals(response.EmployeePerformanceGoal || []);
        setLocalFeedback(response.EmployeeFeedback || []);
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Initialize with props if available, otherwise fetch from API
    if (employeePerformanceGoal?.length || employeeFeedback?.length) {
      setLocalPerformanceGoals(employeePerformanceGoal);
      setLocalFeedback(employeeFeedback || []);
    } else {
      fetchPerformanceData();
    }
  }, [employee?.id, accessToken]);

  const startProcessSetNewGoal = () => {
    /* startProcess({
      domain: 'employee',
      processName: 'saveEmployeePerformanceGoal',
      payload: {
        employeePerformanceGoal: {
          employee: employee?.id,
          title: titleInput.value,
          startDate: startDate.value,
          dueDate: dueDate.value,
          progressPercent: 0,
          status: ''
        },
        changeMode: "INSERT"
      }
    }); */
  };

  const statusMap: Record<string, { label: string, color: string }> = {
    'ON_TRACK': { 
      label: 'On Track', 
      color: 'gba:bg-green-100 gba:text-green-800' 
    },
    'BEHIND_TARGET': {
      label: 'Behind Target', 
      color: 'gba:bg-red-100 gba:text-red-800' 
    },
    'AT_RISK': { 
      label: 'At Risk', 
      color: 'gba:bg-yellow-100 gba:text-yellow-800' 
    },
    'ACHIEVED': { 
      label: 'Achieved', 
      color: 'gba:bg-blue-100 gba:text-blue-800' 
    },
    'NOT_ACHIEVED': { 
      label: 'Not Achieved', 
      color: 'gba:bg-gray-100 gba:text-gray-800' 
    }
  };

  const isGoalValid = (goal: EmployeePerformanceGoal) => {
    return true; //goal.title && goal.startDate && goal.dueDate;
  };

  // Map status to display values and styles
  const getStatusInfo: (status: string) => { label: string, color: string } = (status: string) => {  
    return statusMap[status] || { label: status, color: 'gba:bg-gray-100 gba:text-gray-800' };
};

  // Format feedback for display
  const formatFeedback = (): FormattedFeedback[] => {
    if (!localFeedback?.length) return [];
    
    return localFeedback.map(feedback => {
      const sender = `${feedback.senderEmployee?.firstName || ''} ${feedback.senderEmployee?.lastName || ''}`.trim();
      const date = feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMMM D, YYYY') : 'Unknown date';
      const content = feedback.feedback || 'No feedback content';
      const avatar = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail || null;
      
      return {
        sender,
        date,
        content,
        avatar,
        senderId: feedback.senderEmployeeId
      };
    });
  };

  const startProcessShowFeedback = () => {
    startProcess({
      domain: 'employee',
      processName: 'giveFeedback',
      payload: {
        employeeId: employee?.id
      }
    });
  };
  
  // Function to open the drawer for a performance goal
  const openGoalDetails = (goal: ExtendedEmployeePerformanceGoal) => {
    setSelectedGoal(goal);
    setSelectedFeedback(null);
    setDrawerType('goal');
    setIsDrawerOpen(true);
  };

  // Function to open the drawer for feedback
  const openFeedbackDetails = (feedback: FormattedFeedback) => {
    setSelectedFeedback(feedback);
    setSelectedGoal(null);
    setDrawerType('feedback');
    setIsDrawerOpen(true);
  };

  // Function to close the drawer
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const formattedFeedback = formatFeedback();

  // Handle loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="performance-loading">
        <Spin size="large" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="gba:text-center gba:text-red-600 gba:py-8" data-testid="performance-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="gba:performance-tab gba:space-y-8" data-testid="performance-tab-container">
      {/* Performance Goals Headline */}
      <div className="gba:performance-header" data-testid="performance-goals-header">
        <div
          className="gba:font-bold gba:text-2xl"
          data-testid="performance-goals-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_performance.performance_goals",
            "Performance Goals"
          )}
        </div>
        <div
          className="gba:text-gray-500 gba:text-lg"
          data-testid="performance-goals-description"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_performance.goals_description",
            "View and manage employee performance goals"
          )}
        </div>
      </div>
      
      {/* Set New Goal Button */}
      <div className="gba:flex gba:flex-wrap gba:gap-4">
        <AppActionButton
          onClick={startProcessSetNewGoal} 
          data-testid="add-goal-button"
          variant="primary"
          contextsArray={[FlowContextName.employeeEntity]}
          externalContextData={{
            employeeId: employee?.id
          }}
          prefixDataTestId="add-goal"
          accessToken={accessToken}
        >
          Set New Goal
        </AppActionButton>
      </div>

      {/* Goals Content */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4">
        <section className="gba:flex gba:flex-col gba:gap-4">
          {!localPerformanceGoals?.length ? (
            <Empty 
              description="No goals available" 
              className="gba:py-10" 
              data-testid="empty-goals-state"
            />
          ) : (
            <div className="gba:space-y-4">
              {localPerformanceGoals.map((goal) => {
                if (!isGoalValid(goal)) {
                  return null;
                }
                const statusInfo = getStatusInfo(goal.status);
                
                return (
                  <Card 
                    key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`} 
                    variant='outlined'
                    className="gba:cursor-pointer gba:hover:shadow-md gba:transition-all"
                    onClick={() => openGoalDetails(goal)}
                    data-testid={`goal-card-${goal.id}`}
                  >
                    <div className="gba:flex gba:flex-col gba:md:flex-row gba:md:items-center gba:justify-between gba:mb-4">
                      <h3 className="gba:text-lg gba:font-medium">{goal.title}</h3>
                      <span className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:mt-2 gba:md:mt-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    <div className="gba:mb-4">
                      <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2.5">
                        <div 
                          className="gba:bg-blue-600 gba:h-2.5 gba:rounded-full" 
                          style={{ width: `${goal.progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="gba:flex gba:justify-between gba:mt-1 gba:text-sm gba:text-gray-600">
                        <span>progress</span>
                        <span>{goal.progressPercent}%</span>
                      </div>
                    </div>
                    
                    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-sm">
                      <div>
                        <span className="gba:block gba:text-gray-500">Start Date</span>
                        <span>{dayjs(goal.startDate).format('MMM D, YYYY')}</span>
                      </div>
                      <div>
                        <span className="gba:block gba:text-gray-500">Due Date</span>
                        <span>{dayjs(goal.dueDate).format('MMM D, YYYY')}</span>
                      </div>
                      <div>
                        <span className="gba:block gba:text-gray-500">Completion Date</span>
                        <span>{goal.completionDate ? dayjs(goal.completionDate).format('MMM D, YYYY') : '-'}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Feedback Section Headline */}
      <div className="gba:feedback-header gba:mt-8" data-testid="feedback-header">
        <div
          className="gba:font-bold gba:text-2xl"
          data-testid="feedback-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_performance.feedback",
            "Feedback"
          )}
        </div>
        <div
          className="gba:text-gray-500 gba:text-lg"
          data-testid="feedback-description"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_performance.feedback_description",
            "View and manage employee feedback"
          )}
        </div>
      </div>
      
      {/* Give Feedback Button */}
      <div className="gba:flex gba:flex-wrap gba:gap-4">
        <AppActionButton 
          onClick={startProcessShowFeedback} 
          data-testid="add-feedback-button"
          variant="primary"
          contextsArray={[FlowContextName.employeeEntity]}
          externalContextData={{
            employeeId: employee?.id
          }}
          prefixDataTestId="add-feedback"
          accessToken={accessToken}
        >
          Give Feedback
        </AppActionButton>
      </div>
      
      {/* Feedback Content */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4">
        <section className="gba:flex gba:flex-col gba:gap-4">
          {!formattedFeedback.length ? (
            <Empty 
              description="No feedback available" 
              className="gba:py-10" 
              data-testid="empty-feedback-state"
            />
          ) : (
            <div className="gba:space-y-4">
              {formattedFeedback.map((feedback) => {
                // TypeScript safety - this should never happen due to our filter(Boolean) above
                if (!feedback) return null;
                
                return (
                  <Card 
                    key={`feedback-${feedback.sender ?? ''}-${feedback.date ?? ''}`} 
                    className="gba:p-4 gba:cursor-pointer gba:hover:shadow-md gba:transition-all"
                    onClick={() => openFeedbackDetails(feedback)}
                    data-testid={`feedback-card-${feedback.senderId}`}
                  >
                    <div className="gba:flex gba:items-start">
                      <div className="gba:shrink-0 gba:mr-4">
                        <div className="gba:w-10 gba:h-10 gba:rounded-full gba:overflow-hidden gba:bg-gray-200">
                          {feedback.avatar && (
                            <img 
                              src={feedback.avatar} 
                              alt={feedback.sender}
                              className="gba:w-full gba:h-full gba:object-cover"
                            />
                          )}
                        </div>
                      </div>
                      <div className="gba:grow">
                        <div className="gba:flex gba:justify-between gba:items-start">
                          <h4 className="gba:font-medium">{feedback.sender}</h4>
                          <span className="gba:text-sm gba:text-gray-500">{feedback.date}</span>
                        </div>
                        <p className="gba:mt-1 gba:text-gray-700">{feedback.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {/* Details Drawer */}
      <Drawer
        title={
          <div className="gba:flex gba:justify-between gba:items-center">
            <span>
              {drawerType === 'goal' ? 'Performance Goal Details' : 'Feedback Details'}
            </span>
            <Button
              onClick={closeDrawer}
              variant="text"
              icon={<CloseOutlined />}
              data-testid="close-drawer-button"
            />
          </div>
        }
        placement="right"
        closable={false}
        onClose={closeDrawer}
        open={isDrawerOpen}
        width={drawerWidth}
        className="gba:performance-details-drawer"
        data-testid="performance-details-drawer"
      >
        {drawerType === 'goal' && selectedGoal && (
          <div className="gba:goal-details gba:space-y-6" data-testid="goal-details">
            <Descriptions bordered column={1} size="small" className="gba:bg-white gba:rounded-md">
              <Descriptions.Item label="Title">{selectedGoal.title}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedGoal.status === 'ON_TRACK' ? 'green' : 
                       selectedGoal.status === 'BEHIND_TARGET' ? 'red' : 
                       selectedGoal.status === 'AT_RISK' ? 'orange' : 
                       selectedGoal.status === 'ACHIEVED' ? 'blue' : 'default'}>
                  {getStatusInfo(selectedGoal.status).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Progress">
                <div className="gba:w-full gba:bg-gray-200 gba:rounded-full gba:h-2.5 gba:mb-2">
                  <div 
                    className="gba:bg-blue-600 gba:h-2.5 gba:rounded-full" 
                    style={{ width: `${selectedGoal.progressPercent}%` }}
                  ></div>
                </div>
                <span>{selectedGoal.progressPercent}%</span>
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {dayjs(selectedGoal.startDate).format('MMMM D, YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {dayjs(selectedGoal.dueDate).format('MMMM D, YYYY')}
              </Descriptions.Item>
              {selectedGoal.completionDate && (
                <Descriptions.Item label="Completion Date">
                  {dayjs(selectedGoal.completionDate).format('MMMM D, YYYY')}
                </Descriptions.Item>
              )}
              {selectedGoal.description && (
                <Descriptions.Item label="Description">
                  {selectedGoal.description}
                </Descriptions.Item>
              )}
            </Descriptions>
            
            <div className="gba:goal-actions gba:flex gba:justify-end gba:gap-4">
              <AppActionButton
                onClick={() => {
                  /* Edit goal implementation */
                  closeDrawer();
                }}
                variant="secondary"
                data-testid="edit-goal-button"
                contextsArray={[FlowContextName.employeeEntity]}
                externalContextData={{
                  employeeId: employee?.id,
                  goalId: selectedGoal.id
                }}
                prefixDataTestId="edit-goal"
                accessToken={accessToken}
              >
                Edit Goal
              </AppActionButton>
            </div>
          </div>
        )}
        
        {drawerType === 'feedback' && selectedFeedback && (
          <div className="gba:feedback-details gba:space-y-6" data-testid="feedback-details">
            <div className="gba:bg-white gba:p-6 gba:rounded-md gba:shadow-sm">
              <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
                <div className="gba:w-12 gba:h-12 gba:rounded-full gba:overflow-hidden gba:bg-gray-200">
                  {selectedFeedback.avatar && (
                    <img 
                      src={selectedFeedback.avatar} 
                      alt={selectedFeedback.sender}
                      className="gba:w-full gba:h-full gba:object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="gba:text-lg gba:font-medium">{selectedFeedback.sender}</h3>
                  <p className="gba:text-sm gba:text-gray-500">{selectedFeedback.date}</p>
                </div>
              </div>
              
              <div className="gba:feedback-content gba:bg-gray-50 gba:p-4 gba:rounded-md gba:border gba:border-gray-100">
                <p className="gba:text-gray-700">{selectedFeedback.content}</p>
              </div>
            </div>
            
            <div className="gba:feedback-actions gba:flex gba:justify-end gba:gap-4">
              <AppActionButton
                onClick={() => {
                  /* Reply to feedback implementation */
                  closeDrawer();
                }}
                variant="secondary"
                data-testid="reply-feedback-button"
                contextsArray={[FlowContextName.employeeEntity]}
                externalContextData={{
                  employeeId: employee?.id,
                  senderId: selectedFeedback.senderId
                }}
                prefixDataTestId="reply-feedback"
                accessToken={accessToken}
              >
                Reply
              </AppActionButton>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PerformanceTab;
