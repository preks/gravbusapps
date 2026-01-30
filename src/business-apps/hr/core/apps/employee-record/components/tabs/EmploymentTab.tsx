'use client'

import React from 'react'
import dayjs from 'dayjs'
import { Card } from '@newwork/gravity-ui-catalog'
import { Employee } from '../../hooks/useEmployeeData'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { formatNumberFunction } from '../../../../../../../common/utils/windowUtils'
import { useHealthInsuranceTypeCatalog } from '../../hooks/useHealthInsuranceTypeCatalog'
import { useReligionCatalog } from '../../hooks/useReligionCatalog'
import { useTaxBracketCatalog } from '../../hooks/useTaxBracketCatalog'
import { getCatalogValue } from '../../../../../../../common/utils/windowUtils'

interface EmploymentTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info
}

/**
 * Employment Tab Component
 * Displays employment-related information about the employee
 */
const EmploymentTab: React.FC<EmploymentTabProps> = ({ employee, accessToken }) => {
  // Using isSelfView from props instead of calculating it locally
  // Fetch health insurance type catalog for health insurance type mapping
  const { getHealthInsuranceTypeValueById, loading: loadingHealthInsuranceTypes } =
    useHealthInsuranceTypeCatalog(accessToken)
  // Fetch religion catalog for church affiliation mapping
  const { getReligionValueById, loading: loadingReligions } = useReligionCatalog(accessToken)
  // Fetch tax bracket catalog for tax bracket mapping
  const { getTaxBracketValueById, loading: loadingTaxBrackets } = useTaxBracketCatalog(accessToken)
  // Prepare organizational data
  const organizationalData = [
    {
      label: 'Employee ID',
      value: employee.code || ''
    },
    {
      label: 'Company',
      value: employee.employeePosition?.company?.name || ''
    },
    {
      label: 'Job Position',
      value: employee.employeePosition?.jobPosition?.name || ''
    },
    {
      label: 'Location',
      value: employee.employeePosition?.siteLocation?.name || ''
    },
    {
      label: 'Organizational Unit',
      value: employee.employeePosition?.organizationalUnit?.name || ''
    },
    {
      label: 'Workspace',
      value: employee.workspace || ''
    },
    {
      label: 'Management Level',
      value: ''
    },
    {
      label: 'Cost Center',
      value: employee.employeePosition?.costCenter?.name || ''
    }
  ]

  // Prepare working conditions data
  const getWorkingConditionsData = () => {
    const workingCondition = employee.workingCondition?.[0]

    return [
      {
        label: 'Employment Type',
        value: getCatalogValue(workingCondition?.employmentType) || ''
      },
      {
        label: 'Hire Date',
        value: workingCondition?.hireDate ? dayjs(workingCondition.hireDate).format('MMM D, YYYY') : ''
      },
      {
        label: 'Contract Type',
        value: getCatalogValue(workingCondition?.contractType) || ''
      },
      {
        label: 'Probation End Date',
        value: workingCondition?.probationEnd ? dayjs(workingCondition.probationEnd).format('MMM D, YYYY') : ''
      },
      {
        label: 'Remote',
        value: workingCondition?.remote?.value || ''
      },
      {
        label: 'Exit Date',
        value: workingCondition?.exitDate ? dayjs(workingCondition.exitDate).format('MMM D, YYYY') : ''
      },
      {
        label: 'Exit Reason',
        value: workingCondition?.additionalProperties?.fixedTermReason || ''
      },
      {
        label: 'Region',
        value: workingCondition?.region?.value || ''
      },
      {
        label: 'Vacation Entitlement (Days)',
        value: workingCondition?.vacationDays?.toString() || ''
      }
    ]
  }

  const workingConditionsData = getWorkingConditionsData()

  // Prepare working hours data
  const getWorkingHoursData = () => {
    const workingHours = employee.workingHours?.[0]

    // Compute weekly hours by summing daily hours if missing
    const computedWeeklyHours = (() => {
      const days = [
        workingHours?.mondayHours,
        workingHours?.tuesdayHours,
        workingHours?.wednesdayHours,
        workingHours?.thursdayHours,
        workingHours?.fridayHours,
        workingHours?.saturdayHours,
        workingHours?.sundayHours
      ]
      return days.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    })()

    // Compute weekly days as count of days with hours > 0
    const computedWeeklyDays = (() => {
      const days = [
        workingHours?.mondayHours,
        workingHours?.tuesdayHours,
        workingHours?.wednesdayHours,
        workingHours?.thursdayHours,
        workingHours?.fridayHours,
        workingHours?.saturdayHours,
        workingHours?.sundayHours
      ]
      return days.reduce((count, val) => count + (typeof val === 'number' && val > 0 ? 1 : 0), 0)
    })()

    return [
      {
        label: 'Weekly Hours',
        value: computedWeeklyHours.toString() || ''
      },
      {
        label: 'FTE (Full-Time Equivalent)',
        value:
          workingHours?.fullTimeEquivalent !== undefined && workingHours?.fullTimeEquivalent !== null
            ? workingHours.fullTimeEquivalent.toString()
            : ''
      },
      {
        label: 'Days per Week',
        value: computedWeeklyDays.toString() || ''
      }
    ]
  }

  const workingHoursData = getWorkingHoursData()

  // Prepare payroll data
  const getPayrollData = () => {
    return [
      {
        label: 'Salary Group',
        value: employee.employeePosition?.costCenter?.name || ''
      },
      {
        label: 'Payment Method',
        value: 'Direct Deposit'
      },
      {
        label: 'Bank Account',
        value: employee.bankAccounts?.[0]?.iban || ''
      },
      {
        label: 'Bank Name',
        value: employee.bankAccounts?.[0]?.bankName || ''
      },
      {
        label: 'Account Holder',
        value: employee.bankAccounts?.[0]?.accountHolder || ''
      },
      {
        label: 'Full-Time Equivalent',
        value: employee.fullTimeEquivalent?.toString() || ''
      }
    ]
  }

  const payrollData = getPayrollData()

  // Prepare tax information data (combined from both tabs)
  const getTaxInformationData = () => {
    const taxDetails = employee.taxDetails?.[0] || {}

    return [
      // Tax information from both tabs
      {
        label: 'Tax Number',
        value: taxDetails.taxNumber || ''
      },
      {
        label: 'Tax Identification Number',
        value: taxDetails.taxIdentificationNumber || ''
      },
      {
        label: 'Social Security Number',
        value: taxDetails.socialSecurityNumber || ''
      },
      {
        label: 'Tax Bracket',
        value: loadingTaxBrackets ? 'Loading...' : getTaxBracketValueById(taxDetails.taxBracketRef || '')
      },
      // Church affiliation from Details tab
      {
        label: 'Church Affiliation',
        value: loadingReligions ? 'Loading...' : getReligionValueById(taxDetails.taxableChurchAffiliationRef || '')
      },
      // Child allowance present in both tabs - formatted according to user locale
      {
        label: 'Child Tax Allowance',
        value:
          taxDetails.childTaxAllowance !== undefined && taxDetails.childTaxAllowance !== null
            ? formatNumberFunction(taxDetails.childTaxAllowance.toString())
            : ''
      },
      // Health insurance info from Employment tab
      {
        label: 'Health Insurance',
        value: taxDetails.healthInsuranceName || ''
      },
      {
        label: 'Type Of Health Insurance',
        value: loadingHealthInsuranceTypes
          ? 'Loading...'
          : getHealthInsuranceTypeValueById(taxDetails.healthInsuranceTypeRef || '')
      }
    ]
  }

  const taxInformationData = getTaxInformationData()

  // Helper function to render data items in a grid with 3 columns
  const renderDataItems = (data: Array<{ label: string; value: string }>) => (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-3 gba:mt-2">
      {data.map(item => (
        <div
          key={`${item.label}-${item.value}`}
          className="gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-muted gba:rounded-md gba:transition-colors gba:min-w-0"
          data-testid={`employment-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <span className="gba:text-sm gba:text-muted-foreground gba:mb-0.5 gba:truncate gba:block" title={item.label}>
            {item.label}
          </span>
          <span className="gba:font-medium gba:text-foreground gba:truncate gba:block" title={item.value}>
            {item.value || '-'}
          </span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="gba:employment-tab gba:space-y-6" data-testid="employment-tab-container">
      {/* Employment Overview Headline */}
      <div className="gba:employment-header" data-testid="employment-header">
        <div className="gba:font-bold gba:text-2xl" data-testid="employment-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.employment_overview', 'Employment Data')}
        </div>
        <div className="gba:text-muted-foreground gba:text-lg gba:mb-4" data-testid="employment-description">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:hr_employee.employment_description',
            'View employment information and working conditions'
          )}
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6" data-testid="employment-cards">
        {/* Employment Profile Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-profile"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">Employment Profile</h3>
          </div>
          {renderDataItems(organizationalData)}
        </Card>

        {/* Working Conditions Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-conditions"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">Working Conditions</h3>
            <AppAction
              variant="update-secondary"
              data-testid="employee-working-conditions-edit-button"
              contexts={[
                { context: FlowContextName.updateEmployeeWorkingCondition, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="employee-working-conditions-edit"
              accessToken={accessToken}
            />
          </div>
          {renderDataItems(workingConditionsData)}
        </Card>

        {/* Working Hours Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-hours"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">Working Hours</h3>
            <AppAction
              variant="update-secondary"
              data-testid="employee-working-hours-edit-button"
              contexts={[
                { context: FlowContextName.updateEmployeeWorkingHours, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="employee-working-hours-edit"
              accessToken={accessToken}
            />
          </div>
          {renderDataItems(workingHoursData)}
        </Card>

        {/* Payroll Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-payroll"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2 gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">Payroll</h3>
            <AppAction
              variant="update-secondary"
              data-testid="employment-bank-account-action-button"
              contexts={[
                { context: FlowContextName.updateEmployeeBankAccount, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="employment-bank-account-action"
              accessToken={accessToken}
            />
          </div>
          {renderDataItems(payrollData)}
        </Card>

        {/* Tax Information Card */}
        <Card
          variant="outlined"
          className="gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all"
          data-testid="employment-section-tax"
        >
          <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-info">Tax Information</h3>
          </div>
          {renderDataItems(taxInformationData)}
        </Card>
      </div>
    </div>
  )
}

export default EmploymentTab
