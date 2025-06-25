'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Card } from '@newwork/gravity-ui-catalog';
import { Employee } from '../../hooks/useEmployeeData';
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils';

interface EmploymentTabProps {
  employee: Employee;
}

/**
 * Employment Tab Component
 * Displays employment-related information about the employee
 */
const EmploymentTab: React.FC<EmploymentTabProps> = ({ employee }) => {

  // Prepare organizational data
  const organizationalData = [
    {
      label: "Employee ID",
      value: employee.code || ''
    },
    {
      label: "Company",
      value: employee.employeePosition?.company?.name || ''
    },
    {
      label: "Job Position",
      value: employee.employeePosition?.jobPosition?.name || ''
    },
    {
      label: "Location",
      value: employee.employeePosition?.siteLocation?.name || ''
    },
    {
      label: "Organizational Unit",
      value: employee.employeePosition?.organizationalUnit?.name || ''
    },
    {
      label: "Workspace",
      value: employee.workspace || ''
    },
    {
      label: "Management Level",
      value: ''
    },
    {
      label: "Cost Center",
      value: employee.employeePosition?.costCenter?.name || ''
    }
  ];

  // Prepare working conditions data
  const getWorkingConditionsData = () => {
    const workingCondition = employee.workingCondition?.[0];
    
    return [
      {
        label: "Employment Type",
        value: workingCondition?.employmentType?.value || ''
      },
      {
        label: "Hire Date",
        value: workingCondition?.hireDate 
          ? dayjs(workingCondition.hireDate).format('MMM D, YYYY') 
          : ''
      },
      {
        label: "Contract Type",
        value: workingCondition?.contractType?.value || ''
      },
      {
        label: "Probation End Date",
        value: workingCondition?.probationEnd 
          ? dayjs(workingCondition.probationEnd).format('MMM D, YYYY') 
          : ''
      },
      {
        label: "Remote",
        value: workingCondition?.remote?.value || ''
      },
      {
        label: "Exit Date",
        value: workingCondition?.exitDate 
          ? dayjs(workingCondition.exitDate).format('MMM D, YYYY') 
          : ''
      },
      {
        label: "Region",
        value: workingCondition?.region?.value || ''
      },
      {
        label: "Vacation Entitlement (Days)",
        value: workingCondition?.vacationDays?.toString() || ''
      }
    ];
  };

  const workingConditionsData = getWorkingConditionsData();

  // Prepare working hours data
  const getWorkingHoursData = () => {
    const workingHours = employee.workingHours?.[0];
    
    return [
      {
        label: "Weekly Hours",
        value: workingHours?.weeklyHours?.toString() || ''
      },
      {
        label: "FTE (Full-Time Equivalent)",
        value: employee.fullTimeEquivalent?.toString() || ''
      },
      {
        label: "Days per Week",
        value: workingHours?.weeklyDays?.toString() || ''
      }
    ];
  };

  const workingHoursData = getWorkingHoursData();

  // Helper function to render data items in a grid with 3 columns
  const renderDataItems = (data: Array<{label: string; value: string}>) => (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
      {data.map((item) => (
        <div 
          key={`${item.label}-${item.value}`} 
          className="gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-gray-50 gba:rounded-md gba:transition-colors"
          data-testid={`employment-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="gba:text-sm gba:text-gray-500 gba:mb-0.5">{item.label}</span>
          <span className="gba:font-medium gba:text-gray-800">{item.value || '-'}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="gba:employment-tab gba:space-y-6" data-testid="employment-tab-container">
      {/* Employment Overview Headline */}
      <div className="gba:employment-header" data-testid="employment-header">
        <div
          className="gba:font-bold gba:text-2xl"
          data-testid="employment-title"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_employee.employment_overview",
            "Employment Overview"
          )}
        </div>
        <div
          className="gba:text-gray-500 gba:text-lg gba:mb-4"
          data-testid="employment-description"
        >
          {getTranslationFromI18nKeyAndLabel(
            "lowcoder:hr_employee.employment_description",
            "View employment information and working conditions"
          )}
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-6" data-testid="employment-cards">
        {/* Employment Profile Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="employment-section-profile"
        >
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-medium">Employment Profile</h3>
          </div>
          {renderDataItems(organizationalData)}
        </Card>

        {/* Working Conditions Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="employment-section-conditions"
        >
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-medium">Working Conditions</h3>
          </div>
          {renderDataItems(workingConditionsData)}
        </Card>

        {/* Working Hours Card */}
        <Card
          variant="outlined"
          className="gba:shadow-sm gba:hover:shadow-md gba:transition-all"
          data-testid="employment-section-hours"
        >
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-medium">Working Hours</h3>
          </div>
          {renderDataItems(workingHoursData)}
        </Card>
      </div>
    </div>
  );
};

export default EmploymentTab;
