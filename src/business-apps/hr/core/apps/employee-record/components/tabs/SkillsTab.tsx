'use client';

import React, { useState, useEffect } from 'react';
import { Employee } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import { Empty, Spin } from 'antd';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { employeeSkillsQuery } from '../../queries/skillsQueries';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface SkillsTabProps {
  employee: Employee;
  accessToken: string;
}

interface EmployeeSkill {
  id: string;
  skill: {
    id: string;
    name: string;
  };
  level: number;
}

/**
 * Skills Tab Component
 * Displays skills for the employee
 */
const SkillsTab: React.FC<SkillsTabProps> = ({ 
  employee,
  accessToken
}) => {
  const [employeeSkills, setEmployeeSkills] = useState<EmployeeSkill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Fetch skills data
  const fetchSkillsData = async () => {
    if (!employee?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const skillsResponse = await graphQLClient.request(
        employeeSkillsQuery,
        { employeeId: employee.id }
      );
      
      if (skillsResponse?.EmployeeSkill) {
        setEmployeeSkills(skillsResponse.EmployeeSkill);
      }
    } catch (err) {
      console.error('Error fetching skills data:', err);
      setError('Failed to load skills data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSkillsData();
  }, [employee?.id, accessToken]);

  // Helper function to get level label
  const getLevelLabel = (level: number): string => {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Intermediate';
      case 3: return 'Advanced';
      case 4: return 'Expert';
      case 5: return 'Master';
      default: return 'Unknown';
    }
  };

  // Helper function to get level color
  const getLevelColor = (level: number): string => {
    switch (level) {
      case 1: return 'gba:bg-blue-100 gba:text-blue-800';
      case 2: return 'gba:bg-green-100 gba:text-green-800';
      case 3: return 'gba:bg-yellow-100 gba:text-yellow-800';
      case 4: return 'gba:bg-orange-100 gba:text-orange-800';
      case 5: return 'gba:bg-red-100 gba:text-red-800';
      default: return 'gba:bg-gray-100 gba:text-gray-800';
    }
  };

  return (
    <div className="gba:skills-tab gba:space-y-8" data-testid="skills-tab">
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="skills-header">
        <div className="gba:skills-header">
          <div
            className="gba:font-bold gba:text-2xl"
            data-testid="skills-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:employee_record.skills_title",
              "Employee Skills"
            )}
          </div>
          <div
            className="gba:text-gray-500 gba:text-lg"
            data-testid="skills-description"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:employee_record.skills_description",
              "View and manage employee skills and competencies"
            )}
          </div>
        </div>
        
        <AppActionButton
          variant="primary"
          data-testid="update-skills-button"
          contextsArray={[FlowContextName.employeeSkills]}
          externalContextData={{
            employeeId: employee?.id
          }}
          prefixDataTestId="update-skills"
          accessToken={accessToken}
          autoExecuteSingleAction={true}
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:employee_record.update_skills",
            "Update Skills"
          )}
        </AppActionButton>
      </div>

      {loading ? (
        <div className="gba:flex gba:justify-center gba:py-8" data-testid="skills-loading">
          <Spin />
        </div>
      ) : error ? (
        <div className="gba:text-red-500 gba:py-4" data-testid="skills-error">
          {error}
        </div>
      ) : employeeSkills.length === 0 ? (
        <Empty 
          description={getTranslationFromI18nKeyAndLabel(
            "lowcoder:employee_record.no_skills",
            "No skills found"
          )}
          data-testid="skills-empty" 
        />
      ) : (
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4" data-testid="skills-grid">
          {employeeSkills.map((skillItem) => (
            <Card
              key={skillItem.id}
              className="gba:h-full gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
              data-testid={`skill-card-${skillItem.id}`}
            >
              <div className="gba:p-4">
                <div className="gba:flex gba:justify-between gba:items-start">
                  <h4 className="gba:font-medium gba:text-lg">{skillItem.skill.name}</h4>
                  <span className={`gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${getLevelColor(skillItem.level)}`}>
                    {getLevelLabel(skillItem.level)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillsTab;
