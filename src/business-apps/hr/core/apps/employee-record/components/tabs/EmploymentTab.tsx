'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Card } from '@newwork/gravity-ui-catalog';
import { Employee } from '../../hooks/useEmployeeData';
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils';
import AppActionButton from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PiPencilSimple } from 'react-icons/pi';
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext';
import { formatNumberFunction } from '../../../../../../../common/utils/windowUtils';
import { useHealthInsuranceTypeCatalog } from '../../hooks/useHealthInsuranceTypeCatalog';
import { useReligionCatalog } from '../../hooks/useReligionCatalog';
import { useTaxBracketCatalog } from '../../hooks/useTaxBracketCatalog';

interface EmploymentTabProps {
  employee: Employee;
  accessToken: string;
  employeeId?: string; // Optional employeeId override for permissions check
  userInfo?: UserInfoProps; // Current user info
  isSelfView: boolean; // Whether user is viewing their own profile
}

/**
 * Employment Tab Component
 * Displays employment-related information about the employee
 */
const EmploymentTab: React.FC<EmploymentTabProps> = ({ 
  employee,
  accessToken,
  isSelfView
}) => {
  // Using isSelfView from props instead of calculating it locally
  // Fetch health insurance type catalog for health insurance type mapping
  const { getHealthInsuranceTypeValueById, loading: loadingHealthInsuranceTypes } = useHealthInsuranceTypeCatalog(accessToken);
  // Fetch religion catalog for church affiliation mapping
  const { getReligionValueById, loading: loadingReligions } = useReligionCatalog(accessToken);
  // Fetch tax bracket catalog for tax bracket mapping
  const { getTaxBracketValueById, loading: loadingTaxBrackets } = useTaxBracketCatalog(accessToken);
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

  // Prepare payroll data
  const getPayrollData = () => {
    return [
      {
        label: "Salary Group",
        value: employee.employeePosition?.costCenter?.name || ''
      },
      {
        label: "Payment Method",
        value: 'Direct Deposit'
      },
      {
        label: "Bank Account",
        value: employee.bankAccounts?.[0]?.iban || ''
      },
      {
        label: "Bank Name",
        value: employee.bankAccounts?.[0]?.bankName || ''
      },
      {
        label: "Account Holder",
        value: employee.bankAccounts?.[0]?.accountHolder || ''
      },
      {
        label: "Full-Time Equivalent",
        value: employee.fullTimeEquivalent?.toString() || ''
      }
    ];
  };

  const payrollData = getPayrollData();

  // Prepare tax information data (combined from both tabs)
  const getTaxInformationData = () => {
    const taxDetails = employee.taxDetails?.[0] || {};
    
    return [
      // Tax information from both tabs
      {
        label: "Tax Number",
        value: taxDetails.taxNumber || ''
      },
      {
        label: "Tax Identification Number",
        value: taxDetails.taxIdentificationNumber || ''
      },
      {
        label: "Social Security Number",
        value: taxDetails.socialSecurityNumber || ''
      },
      {
        label: "Tax Bracket",
        value: loadingTaxBrackets
          ? 'Loading...'
          : getTaxBracketValueById(taxDetails.taxBracketRef || '')
      },
      // Church affiliation from Details tab
      {
        label: "Church Affiliation",
        value: loadingReligions 
          ? 'Loading...' 
          : getReligionValueById(taxDetails.taxableChurchAffiliationRef || '')
      },
      // Child allowance present in both tabs - formatted according to user locale
      {
        label: "Child Tax Allowance",
        value: taxDetails.childTaxAllowance !== undefined && taxDetails.childTaxAllowance !== null
          ? formatNumberFunction(taxDetails.childTaxAllowance.toString())
          : ''
      },
      // Health insurance info from Employment tab
      {
        label: "Health Insurance",
        value: taxDetails.healthInsuranceName || ''
      },
      {
        label: "Type Of Health Insurance",
        value: loadingHealthInsuranceTypes 
          ? 'Loading...' 
          : getHealthInsuranceTypeValueById(taxDetails.healthInsuranceTypeRef || '')
      }
    ];
  };

  const taxInformationData = getTaxInformationData();

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
            "Employment Data"
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

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6" data-testid="employment-cards">
        {/* Employment Profile Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-profile"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Employment Profile</h3>
          </div>
          {renderDataItems(organizationalData)}
        </Card>

        {/* Working Conditions Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-conditions"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Working Conditions</h3>
            {isSelfView && (
              <AppActionButton 
                data-testid="employee-working-conditions-edit-button"
                variant="ghost"
                contextsArray={[FlowContextName.updateEmployeeWorkingCondition]}
                externalContextData={{
                  employeeId: employee.id
                }}
                prefixDataTestId="employee-working-conditions-edit"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
                icon={<PiPencilSimple />}
              />
            )}
          </div>
          {renderDataItems(workingConditionsData)}
        </Card>

        {/* Working Hours Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-hours"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Working Hours</h3>
            {isSelfView && (
              <AppActionButton 
                data-testid="employee-working-hours-edit-button"
                variant="ghost"
                contextsArray={[FlowContextName.updateEmployeeWorkingHours]}
                externalContextData={{
                  employeeId: employee.id
                }}
                prefixDataTestId="employee-working-hours-edit"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
                icon={<PiPencilSimple />}
              />
            )}
          </div>
          {renderDataItems(workingHoursData)}
        </Card>

        {/* Payroll Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-payroll"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Payroll</h3>
          </div>
          {renderDataItems(payrollData)}
        </Card>

        {/* Tax Information Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-gray-200 gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-tax"
        >
          <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Tax Information</h3>
          </div>
          {renderDataItems(taxInformationData)}
        </Card>
      </div>
    </div>
  );
};

export default EmploymentTab;
