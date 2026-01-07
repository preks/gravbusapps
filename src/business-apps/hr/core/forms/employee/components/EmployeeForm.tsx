import React, { useState } from 'react'
import { useEmployeeContext } from '../context/EmployeeContext'
import { Button, Select, Input } from '@newwork/gravity-ui-catalog'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import Pill from '@/components/pill'

const toStringOrUndefined = (val: any): string | undefined =>
  typeof val === 'string' && val.length > 0 ? val : undefined

const EmployeeForm: React.FC = () => {
  const {
    formValues,
    setFormValues,
    organizationalUnits,
    jobPositions,
    allJobPositions,
    employmentTypes,
    contractTypes,
    loading,
    error,
    submit,
    isEdit,
    structureId,
    // Organizational unit specific functionality
    searchOrganizationalUnits,
    loadMoreOrganizationalUnits,
    organizationalUnitsError,
    organizationalUnitsLoading,
    // Job position specific functionality
    searchJobPositions,
    loadMoreJobPositions,
    jobPositionsError,
    jobPositionsLoading,
    // Employment type specific functionality
    searchEmploymentTypes,
    loadMoreEmploymentTypes,
    employmentTypesError,
    employmentTypesLoading,
    // Contract type specific functionality
    searchContractTypes,
    loadMoreContractTypes,
    contractTypesError,
    contractTypesLoading
  } = useEmployeeContext()

  // State for collapsible additional attributes
  const [showAdditionalAttributes, setShowAdditionalAttributes] = useState(false)

  // Check if all mandatory fields are filled
  const isFormValid =
    toStringOrUndefined(formValues.firstName) &&
    toStringOrUndefined(formValues.lastName) &&
    toStringOrUndefined(formValues.email) &&
    toStringOrUndefined(formValues.organizationalUnitId) &&
    toStringOrUndefined(formValues.jobPositionId) &&
    toStringOrUndefined(formValues.employmentTypeId) &&
    toStringOrUndefined(formValues.contractTypeId)

  // Validate email format
  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isEmailFieldValid = !formValues.email || isEmailValid(formValues.email)

  // Create enhanced job positions with organizational unit information in the label
  const enhancedJobPositions = jobPositions.map(position => {
    const fullPosition = allJobPositions.find(p => p.id === position.id)
    if (
      fullPosition &&
      fullPosition.organizationalUnitEmployees &&
      fullPosition.organizationalUnitEmployees.length > 0
    ) {
      const orgUnit = fullPosition.organizationalUnitEmployees[0].organizationalUnit
      return {
        ...position,
        // Create a custom label that includes the org unit info
        label: (
          <div className="gba:flex gba:flex-col gba:gap-1">
            <div className="gba:font-medium">{position.name}</div>
            {orgUnit && (
              <div className="gba:flex gba:items-center">
                <Pill label={orgUnit.name} type="waiting" className="gba:text-xs" />
              </div>
            )}
          </div>
        ),
        // Keep the original name for search functionality
        name: position.name
      }
    }
    return position
  })

  // Handle search directly from Select components
  const handleOrganizationalUnitSearch = (searchTerm: string) => {
    searchOrganizationalUnits(searchTerm || undefined)
  }

  const handleJobPositionSearch = (searchTerm: string) => {
    searchJobPositions(searchTerm || undefined)
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <form className="gba:h-full gba:flex gba:flex-col">
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">
          {/* Personal Information Section */}
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:border-b gba:border-border gba:pb-2">
              Personal Information
            </h3>

            {/* First Name - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                First Name *
              </label>
              <Input
                name="firstName"
                value={formValues.firstName}
                onChange={e => setFormValues({ firstName: String(e.value || '') })}
                placeholder="Please Enter..."
                required
              />
            </div>

            {/* Last Name - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                Last Name *
              </label>
              <Input
                name="lastName"
                value={formValues.lastName}
                onChange={e => setFormValues({ lastName: String(e.value || '') })}
                placeholder="Please Enter..."
                required
              />
            </div>

            {/* Email - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                Email *
              </label>
              <Input
                name="email"
                type="email"
                value={formValues.email}
                onChange={e => setFormValues({ email: String(e.value || '') })}
                placeholder="Please Enter..."
                required
                status={!isEmailFieldValid ? 'error' : undefined}
              />
              {!isEmailFieldValid && (
                <div className="gba:text-destructive gba:text-sm gba:mt-1">Please enter a valid email address</div>
              )}
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:border-b gba:border-border gba:pb-2">
              Employment Information
            </h3>

            {/* Organizational Unit Selection - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
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
                <div className="gba:text-destructive gba:text-sm gba:mt-1">{organizationalUnitsError}</div>
              )}
            </div>

            {/* Job Position Selection - Mandatory */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                Job Position *
              </label>
              <Select
                name="jobPositionId"
                value={toStringOrUndefined(formValues.jobPositionId)}
                onChange={e => {
                  const selectedJobPositionId = String(e.value || '')

                  if (selectedJobPositionId) {
                    // Find the selected job position from allJobPositions to get complete data
                    const selectedJobPosition = allJobPositions.find(jp => jp.id === selectedJobPositionId)

                    if (selectedJobPosition) {
                      // Auto-fill employment type and contract type from job position
                      const updates: any = { jobPositionId: selectedJobPositionId }

                      if (selectedJobPosition.employmentType?.id) {
                        updates.employmentTypeId = selectedJobPosition.employmentType.id
                      }

                      if (selectedJobPosition.contractType?.id) {
                        updates.contractTypeId = selectedJobPosition.contractType.id
                      }

                      setFormValues(updates)
                    } else {
                      // Just set the job position ID if no matching position found
                      setFormValues({ jobPositionId: selectedJobPositionId })
                    }
                  } else {
                    // Clear job position and related fields when job position is cleared
                    setFormValues({
                      jobPositionId: '',
                      employmentTypeId: '',
                      contractTypeId: ''
                    })
                  }
                }}
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
                <div className="gba:text-destructive gba:text-sm gba:mt-1">{jobPositionsError}</div>
              )}
              {jobPositions.length === 0 && !jobPositionsLoading && !jobPositionsError && (
                <div className="gba:text-muted-foreground gba:text-sm gba:mt-1">
                  {formValues.organizationalUnitId
                    ? 'No vacant positions available in the selected organizational unit'
                    : 'No vacant positions available'}
                </div>
              )}
            </div>

            {/* Hire Date - Optional */}
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                Hire Date
              </label>
              <Input
                name="hireDate"
                type="date"
                value={formValues.hireDate}
                onChange={e => setFormValues({ hireDate: String(e.value || '') })}
                placeholder="Please Select..."
              />
            </div>
          </div>

          {/* Additional Attributes - Collapsible Section */}
          <div className="gba:border gba:border-border gba:rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdditionalAttributes(!showAdditionalAttributes)}
              className="gba:w-full gba:px-4 gba:py-3 gba:text-left gba:flex gba:items-center gba:justify-between gba:bg-muted gba:hover:bg-muted gba:rounded-lg gba:transition-colors"
            >
              <span className="gba:font-medium gba:text-muted-foreground">Additional Attributes</span>
              <span
                className={`gba:transform gba:transition-transform ${showAdditionalAttributes ? 'gba:rotate-180' : ''}`}
              >
                ▼
              </span>
            </button>

            {showAdditionalAttributes && (
              <div className="gba:p-4 gba:space-y-6 gba:border-t gba:border-border">
                {/* Preferred Name */}
                <div>
                  <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                    Preferred Name
                  </label>
                  <Input
                    name="preferredName"
                    value={formValues.preferredName}
                    onChange={e => setFormValues({ preferredName: String(e.value || '') })}
                    placeholder="Please Enter..."
                  />
                </div>

                {/* Employment Type */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                      Employment Type *
                    </label>
                    <Select
                      name="employmentTypeId"
                      value={toStringOrUndefined(formValues.employmentTypeId)}
                      onChange={e => setFormValues({ employmentTypeId: String(e.value || '') })}
                      data={employmentTypes}
                      placeholder="Please Select..."
                      showSearch={true}
                      onSearch={searchEmploymentTypes}
                      debounce={300}
                      loading={employmentTypesLoading}
                      onPopupScrollEnd={loadMoreEmploymentTypes}
                      allowClear
                      style={{ width: '100%' }}
                      disabled={!toStringOrUndefined(formValues.jobPositionId)}
                    />
                    {employmentTypesError && (
                      <div className="gba:text-destructive gba:text-sm gba:mt-1">{employmentTypesError}</div>
                    )}
                  </div>
                </div>

                {/* Contract Type */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-1">
                      Contract Type *
                    </label>
                    <Select
                      name="contractTypeId"
                      value={toStringOrUndefined(formValues.contractTypeId)}
                      onChange={e => setFormValues({ contractTypeId: String(e.value || '') })}
                      data={contractTypes}
                      placeholder="Please Select..."
                      showSearch={true}
                      onSearch={searchContractTypes}
                      debounce={300}
                      loading={contractTypesLoading}
                      onPopupScrollEnd={loadMoreContractTypes}
                      allowClear
                      style={{ width: '100%' }}
                      disabled={!toStringOrUndefined(formValues.jobPositionId)}
                    />
                    {contractTypesError && (
                      <div className="gba:text-destructive gba:text-sm gba:mt-1">{contractTypesError}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="gba:bg-destructive-secondary gba:border gba:border-destructive gba:rounded-md gba:p-4">
              <div className="gba:text-destructive gba:text-sm">{error}</div>
            </div>
          )}
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-border">
          <Button
            variant="primary"
            loading={loading}
            disabled={!isFormValid || !isEmailFieldValid}
            className="gba:w-full"
            size="large"
            onClick={async () => {
              try {
                await submit()
                // Dispatch process continue event on successful submission

                // Format hire date to include time (2024-01-01T00:00:00)
                // If no hire date is set, use current date
                const hireDateToUse = formValues.hireDate || new Date().toISOString().split('T')[0]
                const hireDateFormatted = `${hireDateToUse}T00:00:00`

                const payload: any = {
                  employee: {
                    firstName: formValues.firstName,
                    lastName: formValues.lastName,
                    preferredName: formValues.preferredName,
                    fullName: `${formValues.firstName} ${formValues.lastName}`,
                    communication: [
                      {
                        purpose: 'INTERNAL',
                        typeRef: 'CommunicationType:v1:1',
                        channelRef: 'CommunicationChannel:v1:e-mail',
                        value: formValues.email,
                        valueExtension: 'string'
                      }
                    ],
                    workingCondition: [
                      {
                        contractStatus: 'ACTIVE',
                        contractTypeRef: formValues.contractTypeId,
                        employmentTypeRef: formValues.employmentTypeId,
                        hireDate: hireDateFormatted
                      }
                    ]
                  },
                  organizationalUnitId: formValues.organizationalUnitId,
                  structureId: structureId,
                  jobPositionId: formValues.jobPositionId,
                  changeMode: 'INSERT',
                  createUser: true
                }

                // Add displayName only if preferredName is set
                if (formValues.preferredName && formValues.preferredName.trim()) {
                  payload.employee.displayName = `${formValues.preferredName} ${formValues.lastName}`
                } else {
                  payload.employee.displayName = `${formValues.firstName} ${formValues.lastName}`
                }

                dispatchProcessContinueEvent('employee_submit', payload)
              } catch (err) {
                console.error('Error submitting employee form:', err)
              }
            }}
          >
            {isEdit ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EmployeeForm
