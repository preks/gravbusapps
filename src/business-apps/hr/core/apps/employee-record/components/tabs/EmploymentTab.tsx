'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Collapse } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
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

  // Helper function to render data items in a grid
  const renderDataItems = (data: Array<{label: string; value: string}>, columns = 2) => (
    <div className={`gba:grid gba:grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gba:gap-3 gba:mt-2`}>
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

      <Collapse 
        expandIcon={({ isActive }) => (
          <CaretRightOutlined rotate={isActive ? 90 : 0} className="gba:text-blue-600" />
        )}
        className="gba:bg-white gba:border-0 gba:shadow-sm"
        defaultActiveKey={['profile', 'conditions', 'hours']}
        data-testid="employment-accordion"
      >
        {/* Employment Profile Section */}
        <Collapse.Panel 
          key="profile" 
          header={
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:font-medium">Employment Profile</span>
            </div>
          }
          className="gba:border-0 gba:mb-2 gba:rounded-md gba:overflow-hidden"
          data-testid="employment-section-profile"
        >
          {renderDataItems(organizationalData, 2)}
        </Collapse.Panel>

        {/* Working Conditions Section */}
        <Collapse.Panel 
          key="conditions" 
          header={
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:font-medium">Working Conditions</span>
            </div>
          }
          className="gba:border-0 gba:mb-2 gba:rounded-md gba:overflow-hidden"
          data-testid="employment-section-conditions"
        >
          {renderDataItems(workingConditionsData, 2)}
        </Collapse.Panel>

        {/* Working Hours Section */}
        <Collapse.Panel 
          key="hours" 
          header={
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:font-medium">Working Hours</span>
            </div>
          }
          className="gba:border-0 gba:mb-2 gba:rounded-md gba:overflow-hidden"
          data-testid="employment-section-hours"
        >
          {renderDataItems(workingHoursData, 2)}
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default EmploymentTab;
