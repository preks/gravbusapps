'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Employee } from '../../hooks/useEmployeeData';
import { ProfileSection } from '../ProfileSection';

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
      value: employee.code ?? ''
    },
    {
      label: "Company",
      value: employee.employeePosition?.company?.name ?? "Not assigned"
    },
    {
      label: "Job Position",
      value: employee.employeePosition?.jobPosition?.name ?? "Not assigned"
    },
    {
      label: "Location",
      value: employee.employeePosition?.siteLocation?.name ?? "Not assigned"
    },
    {
      label: "Organizational Unit",
      value: employee.employeePosition?.organizationalUnit?.name ?? "Not assigned"
    },
    {
      label: "Workspace",
      value: employee.workspace ?? ''
    },
    {
      label: "Management Level",
      value: ''
    },
    {
      label: "Cost Center",
      value: employee.employeePosition?.costCenter?.name ?? ''
    }
  ].filter(item => item.value);

  // Prepare working conditions data
  const getWorkingConditionsData = () => {
    const workingCondition = employee.workingCondition?.[0];
    if (!workingCondition) return [];

    return [
      {
        label: "Employment Type",
        value: workingCondition.employmentType?.value ?? ''
      },
      {
        label: "Hire Date",
        value: workingCondition.hireDate 
          ? dayjs(workingCondition.hireDate).format('MMM D, YYYY') 
          : ''
      },
      {
        label: "Contract Type",
        value: workingCondition.contractType?.value ?? ''
      },
      {
        label: "Probation End Date",
        value: workingCondition.probationEnd 
          ? dayjs(workingCondition.probationEnd).format('MMM D, YYYY') 
          : ''
      },
      {
        label: "Remote",
        value: workingCondition.remote?.value ?? ''
      },
      {
        label: "Exit Date",
        value: workingCondition.exitDate 
          ? dayjs(workingCondition.exitDate).format('MMM D, YYYY') 
          : ''
      },
      {
        label: "Region",
        value: workingCondition.region?.value ?? ''
      },
      {
        label: "Vacation Entitlement (Days)",
        value: workingCondition.vacationDays?.toString() ?? ''
      }
    ].filter(item => item.value);
  };

  const workingConditionsData = getWorkingConditionsData();

  // Prepare working hours data
  const getWorkingHoursData = () => {
    const workingHours = employee.workingHours?.[0];
    if (!workingHours) return [];

    return [
      {
        label: "Weekly Hours",
        value: workingHours.weeklyHours?.toString() ?? ''
      },
      {
        label: "FTE (Full-Time Equivalent)",
        value: employee.fullTimeEquivalent?.toString() ?? ''
      },
      {
        label: "Days per Week",
        value: workingHours.weeklyDays?.toString() ?? ''
      }
    ].filter(item => item.value);
  };

  const workingHoursData = getWorkingHoursData();

  return (
    <div className="gba:employment-tab gba:space-y-6">
      {/* Organizational Data Section */}
      <ProfileSection 
        title="Employment Profile"
        data={organizationalData}
        columns={2}
      />

      {/* Working Conditions Section */}
      {workingConditionsData.length > 0 && (
        <ProfileSection 
          title="Working Conditions"
          data={workingConditionsData}
          columns={2}
        />
      )}

      {/* Working Hours Section */}
      {workingHoursData.length > 0 && (
        <ProfileSection 
          title="Working Hours"
          data={workingHoursData}
          columns={2}
        />
      )}
    </div>
  );
};

export default EmploymentTab;
