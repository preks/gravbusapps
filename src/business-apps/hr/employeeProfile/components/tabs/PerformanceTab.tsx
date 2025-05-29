'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('lowcoder');

  // Map status to display values and styles
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string, color: string }> = {
      'ON_TRACK': { 
        label: 'on_track', 
        color: 'bg-green-100 text-green-800' 
      },
      'AT_RISK': { 
        label: 'at_risk', 
        color: 'bg-yellow-100 text-yellow-800' 
      },
      'OFF_TRACK': { 
        label: 'off_track', 
        color: 'bg-red-100 text-red-800' 
      },
      'COMPLETED': { 
        label: 'completed', 
        color: 'bg-blue-100 text-blue-800' 
      },
      'NOT_ACHIEVED': { 
        label: 'not_achieved', 
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
        sender: `${firstName} ${lastName}`.trim() || t('employee_profile.unknown_sender'),
        avatar: pictureThumbnail
          ? `data:image/jpeg;base64,${pictureThumbnail}`
          : '/assets/default-avatar.png'
      };
    }).filter(Boolean);
  };

  const formattedFeedback = formatFeedback();

  return (
    <div className="performance-tab space-y-8">
      {/* Goals Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">
            Set New Goal
          </h2>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
            {t('new_goal.set_new_goal')}
          </button>
        </div>

        {employeePerformanceGoal.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>{t('filter_component.no_results')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employeePerformanceGoal.map((goal) => {
              const statusInfo = getStatusInfo(goal.status);
              
              return (
                <Card key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`} bordered>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">{goal.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 md:mt-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${goal.progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-sm text-gray-600">
                      <span>progress</span>
                      <span>{goal.progressPercent}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500">start_date</span>
                      <span>{dayjs(goal.startDate).format('MMM D, YYYY')}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">due_date</span>
                      <span>{dayjs(goal.dueDate).format('MMM D, YYYY')}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500">completion_date</span>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">
            {t('employee_profile.summary_layout.skills_section.feedback_generic_module_title')}
          </h2>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
            {t('employee_profile.employee_tabs.flows_button.other_profile_options.give_feedback')}
          </button>
        </div>

        {formattedFeedback.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>{t('employee_profile.summary_layout.skills_section.feedback_generic_module_no_data')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formattedFeedback.map((feedback) => {
              // TypeScript safety - this should never happen due to our filter(Boolean) above
              if (!feedback) return null;
              
              return (
                <Card key={`feedback-${feedback.sender ?? ''}-${feedback.date ?? ''}`} className="p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                        {feedback.avatar && (
                          <img 
                            src={feedback.avatar} 
                            alt={feedback.sender}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{feedback.sender}</h4>
                        <span className="text-sm text-gray-500">{feedback.date}</span>
                      </div>
                      <p className="mt-1 text-gray-700">{feedback.content}</p>
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
