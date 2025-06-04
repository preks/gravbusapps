'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback, EmployeePerformanceGoal } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';

interface PerformanceTabProps {
  employee: Employee;
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

  // Map status to display values and styles
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      'ON_TRACK': { 
        label: 'On Track', 
        color: 'bg-green-100 text-green-800' 
      },
      'AT_RISK': { 
        label: 'At Risk', 
        color: 'bg-yellow-100 text-yellow-800' 
      },
      'OFF_TRACK': { 
        label: 'Off Track', 
        color: 'bg-red-100 text-red-800' 
      },
      'COMPLETED': { 
        label: 'Completed', 
        color: 'bg-blue-100 text-blue-800' 
      },
      'NOT_ACHIEVED': { 
        label: 'Not Achieved', 
        color: 'bg-gray-100 text-gray-800' 
      }
    };
    
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Format feedback for display
  const formatFeedback = () => {
    if (!employeeFeedback || !Array.isArray(employeeFeedback)) return [];
    
    return employeeFeedback.map(feedback => {
      if (!feedback) return null;
      
      const firstName = feedback.senderEmployee?.firstName || '';
      const lastName = feedback.senderEmployee?.lastName || '';
      const pictureThumbnail = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail;
      
      return {
        id: feedback.senderEmployeeId || '',
        content: feedback.feedback || '',
        date: feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMM D, YYYY') : '',
        sender: `${firstName} ${lastName}`.trim() || "Unknown Sender",
        avatar: pictureThumbnail
          ? `data:image/jpeg;base64,${pictureThumbnail}`
          : '/assets/default-avatar.png'
      };
    }).filter(Boolean);
  };

  const formattedFeedback = formatFeedback();

  return (
    <div className="gba:performance-tab gba:space-y-8">
      {/* Goals Section */}
      <div>
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <h2 className="gba:text-xl gba:font-medium">
            Set New Goal
          </h2>
          <button 
            className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
            onClick={() => {
              // Trigger flow to add a goal
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(
                  new CustomEvent('com.newwork.process.start', {
                    detail: {
                      domain: 'employee',
                      processName: 'createEmployeePerformanceGoal',
                      startProcessBody: {
                        employeeId: employee.id
                      }
                    }
                  })
                );
              }
            }}
          >
            Set New Goal
          </button>
        </div>

        {employeePerformanceGoal.length === 0 ? (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <p>No goals found.</p>
          </div>
        ) : (
          <div className="gba:space-y-4">
            {employeePerformanceGoal.map((goal) => {
              const statusInfo = getStatusInfo(goal.status);
              
              return (
                <Card key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`} bordered>
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
      </div>

      {/* Feedback Section */}
      <div>
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <h2 className="gba:text-xl gba:font-medium">
            Feedback
          </h2>
          <button 
            className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors"
            onClick={() => {
              // Trigger flow to give feedback
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(
                  new CustomEvent('com.newwork.process.start', {
                    detail: {
                      domain: 'employee',
                      processName: 'giveEmployeeFeedback',
                      startProcessBody: {
                        employeeId: employee.id
                      }
                    }
                  })
                );
              }
            }}
          >
            Give Feedback
          </button>
        </div>

        {formattedFeedback.length === 0 ? (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">
            <p>No feedback data available.</p>
          </div>
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
      </div>
    </div>
  );
};

export default PerformanceTab;
