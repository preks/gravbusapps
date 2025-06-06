'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('lowcoder');

  // Prepare organizational data
  const organizationalData = [
    {
      label: t('employee_profile.employement_layout.employment_profile_container.employee_id_input'),
      value: employee.code ?? ''
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.company_input'),
      value: employee.employeePosition?.company?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.job_position_input'),
      value: employee.employeePosition?.jobPosition?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.location_input'),
      value: employee.employeePosition?.siteLocation?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.organizational_unit_input'),
      value: employee.employeePosition?.organizationalUnit?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.workspace_input'),
      value: employee.workspace ?? ''
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.management_level_input'),
      value: ''
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.cost_center_input'),
      value: employee.employeePosition.costCenter?.name ?? ''
    }
  ].filter(item => item.value);

  // Prepare working conditions data
  const getWorkingConditionsData = () => {
    const workingCondition = employee.workingCondition?.[0];
    if (!workingCondition) return [];

    return [
      {
        label: t('employee_profile.employement_layout.working_conditions_container.employment_type_input'),
        value: workingCondition.employmentType?.value ?? ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.hire_date_input'),
        value: workingCondition.hireDate 
          ? dayjs(workingCondition.hireDate).format('MMM D, YYYY') 
          : ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.contract_type_input'),
        value: workingCondition.contractType?.value ?? ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.probation_input'),
        value: workingCondition.probationEnd 
          ? dayjs(workingCondition.probationEnd).format('MMM D, YYYY') 
          : ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.remote_input'),
        value: workingCondition.remote?.value ?? ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.exit_date_input'),
        value: workingCondition.exitDate 
          ? dayjs(workingCondition.exitDate).format('MMM D, YYYY') 
          : ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.region_input'),
        value: workingCondition.region?.value ?? ''
      },
      {
        label: t('employee_profile.employement_layout.working_conditions_container.vacation_entitlement_input'),
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
        label: t('employee_profile.employement_layout.employment_profile_container.weekly_hours'),
        value: workingHours.weeklyHours?.toString() ?? ''
      },
      {
        label: t('employee_profile.employement_layout.employment_profile_container.fte'),
        value: employee.fullTimeEquivalent?.toString() ?? ''
      },
      {
        label: t('employee_profile.employement_layout.employment_profile_container.days_per_week'),
        value: workingHours.weeklyDays?.toString() ?? ''
      }
    ].filter(item => item.value);
  };

  const workingHoursData = getWorkingHoursData();

  return (
    <div className="gba:employment-tab gba:space-y-6">
      {/* Organizational Data Section */}
      <ProfileSection 
        title={t('employee_profile.employement_layout.employment_profile_container.employment_profile_subtitle')}
        data={organizationalData}
        columns={2}
      />

      {/* Working Conditions Section */}
      {workingConditionsData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile.employement_layout.working_conditions_container.working_conditions_subtitle')}
          data={workingConditionsData}
          columns={2}
        />
      )}

      {/* Working Hours Section */}
      {workingHoursData.length > 0 && (
        <ProfileSection 
          title={t('employee_profile.employement_layout.working_hours_container.working_hours_subtitle')}
          data={workingHoursData}
          columns={2}
        />
      )}
    </div>
  );
};

export default EmploymentTab;
