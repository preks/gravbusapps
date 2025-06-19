'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback, EmployeePerformanceGoal } from '../../hooks/useEmployeeData';
import { Button, Card } from '@newwork/gravity-ui-catalog';
import { Empty } from 'antd';
import { startProcess } from '@/common/utils/start-process';


interface PerformanceTabProps {
  employee: Employee;
  accessToken: string;
  employeeFeedback: EmployeeFeedback[];
  employeePerformanceGoal: EmployeePerformanceGoal[];
}

/**
 * Performance Tab Component
 * Displays performance goals and feedback for the employee
 */
const PerformanceTab: React.FC<PerformanceTabProps> = ({ 
  employee, 
  employeeFeedback,
  employeePerformanceGoal 
}) => {
  const [localPerformanceGoals, setLocalPerformanceGoals] = useState<EmployeePerformanceGoal[]>([]);
  const [localFeedback, setLocalFeedback] = useState<EmployeeFeedback[]>([]);
 
  useEffect(() => {
    // Initialize local state with props
    setLocalPerformanceGoals(employeePerformanceGoal);
    setLocalFeedback(employeeFeedback || []);
  }, [employeePerformanceGoal, employeeFeedback]);

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
    return goal.title && goal.startDate && goal.dueDate;
  };

  // Map status to display values and styles
  const getStatusInfo: (status: string) => { label: string, color: string } = (status: string) => {  
    return statusMap[status] || { label: status, color: 'gba:bg-gray-100 gba:text-gray-800' };
};

  // Format feedback for display
  const formatFeedback = () => {
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

  const formattedFeedback = formatFeedback();

  return (
    <div className="gba:performance-tab gba:space-y-8">
      {/* Goals Section */}
      <div>
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4">
          <section className="gba:flex gba:flex-col gba:gap-4">
            <div className="gba:flex gba:justify-between gba:items-center gba:gap-4">
              <h3 className="gba:text-lg gba:font-semibold">Performance Goals</h3>
              <Button 
                onClick={startProcessSetNewGoal} 
                data-testid="add-goal-button"
                variant="primary"
              >
                Set New Goal
              </Button>
            </div>

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
                    <Card key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`} variant='outlined'>
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

        {/* Feedback Section */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:py-4 gba:mt-8">
          <section className="gba:flex gba:flex-col gba:gap-4">
            <div className="gba:flex gba:justify-between gba:items-center">
              <h3 className="gba:text-lg gba:font-semibold">Feedback</h3>
              <Button 
                onClick={startProcessShowFeedback} 
                data-testid="add-feedback-button"
                variant="primary"
              >
                Give Feedback
              </Button>
            </div>
          
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
                  <Card key={`feedback-${feedback.sender ?? ''}-${feedback.date ?? ''}`} className="gba:p-4">
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
      </div>
    </div>
  );
};

export default PerformanceTab;
