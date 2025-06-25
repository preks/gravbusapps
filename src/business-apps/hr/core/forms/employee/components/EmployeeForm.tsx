import React, { useEffect, useState } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { InputField, SelectField, Button, Select, Input } from '@newwork/gravity-ui-catalog';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import Pill from '@/components/pill';

const toStringOrUndefined = (val: any): string | undefined => (typeof val === 'string' && val.length > 0 ? val : undefined);

const EmployeeForm: React.FC = () => {
  const {
    formValues,
    setFormValues,
    organizationalUnits,
    jobPositions,
    allJobPositions,
    loading,
    error,
    submit,
    isEdit,
    // Organizational unit specific functionality
    searchOrganizationalUnits,
    loadMoreOrganizationalUnits,
    hasMoreOrganizationalUnits,
    organizationalUnitsError,
    organizationalUnitsLoading,
    // Job position specific functionality
    searchJobPositions,
    loadMoreJobPositions,
    hasMoreJobPositions,
    jobPositionsError,
    jobPositionsLoading,
  } = useEmployeeContext();

  // Check if all mandatory fields are filled
  const isFormValid = 
    toStringOrUndefined(formValues.firstName) &&
    toStringOrUndefined(formValues.lastName) &&
    toStringOrUndefined(formValues.email) &&
    toStringOrUndefined(formValues.organizationalUnitId) &&
    toStringOrUndefined(formValues.jobPositionId);

  // Validate email format
  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isEmailFieldValid = !formValues.email || isEmailValid(formValues.email);

  // Create enhanced job positions with organizational unit information in the label
  const enhancedJobPositions = jobPositions.map(position => {
    const fullPosition = allJobPositions.find(p => p.id === position.id);
    if (fullPosition && fullPosition.organizationalUnitEmployees && fullPosition.organizationalUnitEmployees.length > 0) {
      const orgUnit = fullPosition.organizationalUnitEmployees[0].organizationalUnit;
      return {
        ...position,
        // Create a custom label that includes the org unit info
        label: (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <div className="gba:font-medium">{position.name}</div>
            {orgUnit && (
              <div className="gba:flex gba:items-center">
                <Pill 
                  label={orgUnit.name} 
                  type="waiting" 
                  className="gba:text-xs"
                />
              </div>
            )}
          </div>
        ),
        // Keep the original name for search functionality
        name: position.name
      };
    }
    return position;
  });

  // Handle search directly from Select components
  const handleOrganizationalUnitSearch = (searchTerm: string) => {
    searchOrganizationalUnits(searchTerm || undefined);
  };

  const handleJobPositionSearch = (searchTerm: string) => {
    searchJobPositions(searchTerm || undefined);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      return;
    }

    if (!isEmailFieldValid) {
      return;
    }

    try {
      await submit();
      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('employee_submit', {
        "employee": {
          "firstName": formValues.firstName,
          "lastName": formValues.lastName,
          "email": formValues.email,
          "organizationalUnit": formValues.organizationalUnitId,
          "jobPosition": formValues.jobPositionId
        }
      });
    } catch (err) {
      console.error('Error submitting employee form:', err);
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <form
        onSubmit={handleSubmit}
        className="gba:h-full gba:flex gba:flex-col"
      >
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">

          {/* Personal Information Section */}
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:border-b gba:border-gray-200 gba:pb-2">
              Personal Information
            </h3>

            {/* First Name - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                First Name *
              </label>
              <Input
                name="firstName"
                value={formValues.firstName}
                onChange={e => setFormValues({ firstName: String(e) })}
                placeholder="Please Enter..."
                required
              />
            </div>

            {/* Last Name - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                Last Name *
              </label>
              <Input
                name="lastName"
                value={formValues.lastName}
                onChange={e => setFormValues({ lastName: String(e) })}
                placeholder="Please Enter..."
                required
              />
            </div>

            {/* Email - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                Email *
              </label>
              <Input
                name="email"
                type="email"
                value={formValues.email}
                onChange={e => setFormValues({ email: String(e) })}
                placeholder="Please Enter..."
                required
                status={!isEmailFieldValid ? 'error' : undefined}
              />
              {!isEmailFieldValid && (
                <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                  Please enter a valid email address
                </div>
              )}
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:border-b gba:border-gray-200 gba:pb-2">
              Employment Information
            </h3>

            {/* Organizational Unit Selection - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                Organizational Unit *
              </label>
              <Select
                name="organizationalUnitId"
                value={toStringOrUndefined(formValues.organizationalUnitId)}
                onChange={e => setFormValues({ organizationalUnitId: String(e.value || '') })}
                data={organizationalUnits}
                placeholder="Please Select..."
                showSearch={true}
                onSearch={handleOrganizationalUnitSearch}
                debounce={300}
                loading={organizationalUnitsLoading}
                onPopupScrollEnd={loadMoreOrganizationalUnits}
                allowClear
                style={{ width: '100%' }}
              />
              {organizationalUnitsError && (
                <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                  {organizationalUnitsError}
                </div>
              )}
            </div>

            {/* Job Position Selection - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                Job Position *
              </label>
              <Select
                name="jobPositionId"
                value={toStringOrUndefined(formValues.jobPositionId)}
                onChange={e => setFormValues({ jobPositionId: String(e.value || '') })}
                data={enhancedJobPositions}
                placeholder="Please Select..."
                showSearch={true}
                onSearch={handleJobPositionSearch}
                debounce={300}
                loading={jobPositionsLoading}
                onPopupScrollEnd={loadMoreJobPositions}
                allowClear
                style={{ width: '100%' }}
                disabled={jobPositions.length === 0 && !jobPositionsLoading}
              />
              {jobPositionsError && (
                <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                  {jobPositionsError}
                </div>
              )}
              {jobPositions.length === 0 && !jobPositionsLoading && !jobPositionsError && (
                <div className="gba:text-gray-500 gba:text-sm gba:mt-1">
                  {formValues.organizationalUnitId 
                    ? "No vacant positions available in the selected organizational unit" 
                    : "No vacant positions available"}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <div className="gba:text-red-800 gba:text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200">
          <Button
            variant="primary"
            loading={loading}
            disabled={!isFormValid || !isEmailFieldValid}
            className="gba:w-full"
            size="large"
            onClick={handleSubmit}
          >
            {isEdit ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm; 