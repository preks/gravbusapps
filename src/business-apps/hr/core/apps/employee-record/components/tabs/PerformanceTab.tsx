'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeePerformanceGoal } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import { Empty, Spin } from 'antd';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { employeePerformanceQuery } from '../../queries/performanceQueries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface PerformanceTabProps {
  employee: Employee;
  accessToken: string;
  employeePerformanceGoals?: EmployeePerformanceGoal[];
}

// Extend the EmployeePerformanceGoal interface to include additional properties
interface ExtendedEmployeePerformanceGoal extends EmployeePerformanceGoal {
  id: string;
  description?: string;
}

/**
 * Performance Tab Component
 * Displays performance goals for the employee
 */
const PerformanceTab: React.FC<PerformanceTabProps> = ({ 
  employee,
  accessToken,
  employeePerformanceGoals = []
}) => {
  const [localPerformanceGoals, setLocalPerformanceGoals] = useState<ExtendedEmployeePerformanceGoal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // No longer need drawer state as we're showing edit buttons directly on cards
  
  // Initialize GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Fetch performance data
  const fetchPerformanceData = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const goalsResponse = await graphQLClient.request(
        employeePerformanceQuery,
        { employeeId: employee.id }
      );
      
      if (goalsResponse) {
        setLocalPerformanceGoals(goalsResponse.EmployeePerformanceGoal || [] as ExtendedEmployeePerformanceGoal[]);
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
    if (employeePerformanceGoals?.length) {
      setLocalPerformanceGoals(employeePerformanceGoals as ExtendedEmployeePerformanceGoal[]);
    } else {
      fetchPerformanceData();
    }
  }, [employee?.id, accessToken]);

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

  const isGoalValid = (goal: ExtendedEmployeePerformanceGoal) => {
    return goal.title && goal.startDate && goal.dueDate;
  };

  // Map status to display values and styles
  const getStatusInfo: (status: string) => { label: string, color: string } = (status: string) => {  
    return statusMap[status] || { label: status, color: 'gba:bg-gray-100 gba:text-gray-800' };
};

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
      {/* Performance Goals Headline with Action Button */}
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="performance-goals-header">
        <div className="gba:performance-header">
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
        <div>
          <AppActionButton
            data-testid="add-goal-button"
            variant="primary"
            contextsArray={[FlowContextName.employeePerformanceGoal]}
            externalContextData={{
              employeeId: employee?.id
            }}
            prefixDataTestId="add-goal"
            accessToken={accessToken}
            autoExecuteSingleAction={true}
          >
            Set New Goal
          </AppActionButton>
        </div>
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
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
              {localPerformanceGoals.map((goal) => {
                if (!isGoalValid(goal)) {
                  return null;
                }
                const statusInfo = getStatusInfo(goal.status);
                
                return (
                  <Card 
                    key={`goal-${goal.title ?? ''}-${goal.status ?? ''}`} 
                    variant='outlined'
                    className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
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
                    
                    {/* Edit button at the bottom right */}
                    <div className="gba:flex gba:justify-end gba:mt-4">
                      <AppActionButton
                        variant="secondary"
                        data-testid={`edit-goal-button-${goal.id}`}
                        contextsArray={[FlowContextName.employeePerformanceGoal]}
                        externalContextData={{
                          employeeId: employee?.id,
                          goalId: goal.id
                        }}
                        prefixDataTestId="edit-goal"
                        accessToken={accessToken}
                        className="gba:text-sm gba:py-1 gba:px-3"
                        autoExecuteSingleAction={true}
                      >
                        Edit
                      </AppActionButton>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>


      {/* Removed drawer - Edit buttons are now directly on cards */}
    </div>
  );
};

export default PerformanceTab;
