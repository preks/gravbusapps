import React, { useEffect, useState, useRef } from 'react';
import { useJobPositionContext } from '../context/JobPositionContext';
import { InputField, SelectField, Button, Select, Input } from '@newwork/gravity-ui-catalog';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

const toStringOrUndefined = (val: any): string | undefined => (typeof val === 'string' && val.length > 0 ? val : undefined);

const JobPositionForm: React.FC = () => {
  const {
    formValues,
    setFormValues,
    jobProfiles,
    allJobProfiles,
    jobFamilies,
    jobFunctions,
    allJobFunctions,
    jobLevelGroups,
    jobLevels,
    allJobLevels,
    organizationalUnits,
    employmentTypes,
    contractTypes,
    loading,
    error,
    fetchJobFunctions,
    fetchJobLevels,
    submit,
    isEdit,
    structureId,
    // Job profile specific functionality
    searchJobProfiles,
    loadMoreJobProfiles,
    hasMoreJobProfiles,
    jobProfilesError,
    jobProfilesLoading,
    // Organizational unit specific functionality
    searchOrganizationalUnits,
    loadMoreOrganizationalUnits,
    hasMoreOrganizationalUnits,
    organizationalUnitsError,
    organizationalUnitsLoading,
    // Job family specific functionality
    searchJobFamilies,
    loadMoreJobFamilies,
    hasMoreJobFamilies,
    jobFamiliesError,
    jobFamiliesLoading,
    // Job function specific functionality
    searchJobFunctions,
    loadMoreJobFunctions,
    hasMoreJobFunctions,
    jobFunctionsError,
    jobFunctionsLoading,
    // Job level group specific functionality
    searchJobLevelGroups,
    loadMoreJobLevelGroups,
    hasMoreJobLevelGroups,
    jobLevelGroupsError,
    jobLevelGroupsLoading,
    // Job level specific functionality
    searchJobLevels,
    loadMoreJobLevels,
    hasMoreJobLevels,
    jobLevelsError,
    jobLevelsLoading,
    // Employment type specific functionality
    searchEmploymentTypes,
    loadMoreEmploymentTypes,
    hasMoreEmploymentTypes,
    employmentTypesError,
    employmentTypesLoading,
    // Contract type specific functionality
    searchContractTypes,
    loadMoreContractTypes,
    hasMoreContractTypes,
    contractTypesError,
    contractTypesLoading,
  } = useJobPositionContext();

  // State for collapsible additional properties
  const [showAdditionalProperties, setShowAdditionalProperties] = useState(false);
  
  // Refs to track current values to avoid infinite loops
  const currentJobFamilyRef = useRef<string | undefined>();
  const currentJobLevelGroupRef = useRef<string | undefined>();

  // Check if all mandatory fields are filled
  const isFormValid = 
    toStringOrUndefined(formValues.name) &&
    toStringOrUndefined(formValues.jobProfileId) &&
    toStringOrUndefined(formValues.organizationalUnitId) &&
    toStringOrUndefined(formValues.jobFamilyId) &&
    toStringOrUndefined(formValues.jobFunctionId) &&
    toStringOrUndefined(formValues.jobLevelId);

  // Filter job functions when job family changes (whether set directly or indirectly)
  useEffect(() => {
    const jobFamilyId = toStringOrUndefined(formValues.jobFamilyId);
    
    // Only fetch if the job family actually changed
    if (currentJobFamilyRef.current !== jobFamilyId) {
      currentJobFamilyRef.current = jobFamilyId;
      
      if (jobFamilyId) {
        fetchJobFunctions(jobFamilyId);
      } else {
        fetchJobFunctions('');
      }
    }
  }, [formValues.jobFamilyId, fetchJobFunctions]);

  // Clear job function when job family is cleared (separate effect to avoid circular dependencies)
  useEffect(() => {
    const jobFamilyId = toStringOrUndefined(formValues.jobFamilyId);
    if (!jobFamilyId && toStringOrUndefined(formValues.jobFunctionId)) {
      setFormValues({ jobFunctionId: '' });
    }
  }, [formValues.jobFamilyId, formValues.jobFunctionId, setFormValues]);

  // Filter job levels when job level group changes (derived from job function)
  useEffect(() => {
    const jobLevelGroupId = toStringOrUndefined(formValues.jobLevelGroupId);
    
    // Only fetch if the job level group actually changed
    if (currentJobLevelGroupRef.current !== jobLevelGroupId) {
      currentJobLevelGroupRef.current = jobLevelGroupId;
      
      if (jobLevelGroupId) {
        fetchJobLevels(jobLevelGroupId);
      } else {
        fetchJobLevels('');
      }
    }
  }, [formValues.jobLevelGroupId, fetchJobLevels]);

  // Clear job level when job level group is cleared (separate effect to avoid circular dependencies)
  useEffect(() => {
    const jobLevelGroupId = toStringOrUndefined(formValues.jobLevelGroupId);
    if (!jobLevelGroupId && toStringOrUndefined(formValues.jobLevelId)) {
      setFormValues({ jobLevelId: '' });
    }
  }, [formValues.jobLevelGroupId, formValues.jobLevelId, setFormValues]);

  // Auto-populate name from job profile
  useEffect(() => {
    if (formValues.jobProfileId) {
      const selectedProfile = allJobProfiles.find(profile => profile.id === formValues.jobProfileId);
      if (selectedProfile) {
        setFormValues({ name: selectedProfile.name });
      }
    }
  }, [formValues.jobProfileId, allJobProfiles, setFormValues]);

  // Handle search directly from Select components
  const handleJobProfileSearch = (searchTerm: string) => {
    searchJobProfiles(searchTerm || undefined);
  };

  const handleOrganizationalUnitSearch = (searchTerm: string) => {
    console.log('handleOrganizationalUnitSearch called with:', searchTerm);
    searchOrganizationalUnits(searchTerm || undefined);
  };

  // Debug organizational units
  useEffect(() => {
    console.log('JobPositionForm - Organizational Units:', {
      organizationalUnits,
      organizationalUnitsLoading,
      organizationalUnitsError,
      hasMoreOrganizationalUnits
    });
  }, [organizationalUnits, organizationalUnitsLoading, organizationalUnitsError, hasMoreOrganizationalUnits]);

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <form
        onSubmit={e => {
          e.preventDefault();
        }}
        className="gba:h-full gba:flex gba:flex-col"
      >
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">

          {/* Job Profile Selection - First field */}
          <div className="gba:space-y-3">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                Job Profile *
              </label>
              <Select
                name="jobProfileId"
                value={toStringOrUndefined(formValues.jobProfileId)}
                onChange={e => setFormValues({ jobProfileId: String(e.value || '') })}
                data={jobProfiles}
                placeholder="Please Select..."
                showSearch={true}
                onSearch={handleJobProfileSearch}
                debounce={300}
                loading={jobProfilesLoading}
                onPopupScrollEnd={loadMoreJobProfiles}
                filterOption={false}
              />
            </div>

            {/* Job profiles error */}
            {jobProfilesError && (
              <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                {jobProfilesError}
              </div>
            )}
          </div>

          {/* Name field - Auto-populated from Job Profile but editable */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              Name *
            </label>
            <Input
              name="name"
              value={typeof formValues.name === 'string' ? formValues.name : ''}
              onChange={(value) => setFormValues({ name: String(value || '') })}
              placeholder="Please Enter..."
            />
          </div>

          {/* Organizational Unit - Mandatory field with search */}
          <div className="gba:space-y-3">
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
                filterOption={false}
              />
            </div>

            {/* Organizational units error */}
            {organizationalUnitsError && (
              <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                {organizationalUnitsError}
              </div>
            )}
          </div>

          {/* Additional Properties - Collapsible Section */}
          <div className="gba:border gba:border-gray-200 gba:rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdditionalProperties(!showAdditionalProperties)}
              className="gba:w-full gba:px-4 gba:py-3 gba:text-left gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:hover:bg-gray-100 gba:rounded-lg gba:transition-colors"
            >
              <span className="gba:font-medium gba:text-gray-700">Additional Properties</span>
              <span className={`gba:transform gba:transition-transform ${showAdditionalProperties ? 'gba:rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showAdditionalProperties && (
              <div className="gba:p-4 gba:space-y-6 gba:border-t gba:border-gray-200">
                {/* Job Family */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                      Job Family *
                    </label>
                    <Select
                      name="jobFamilyId"
                      value={toStringOrUndefined(formValues.jobFamilyId)}
                      onChange={e => setFormValues({ jobFamilyId: String(e.value || '') })}
                      data={jobFamilies}
                      placeholder="Please Select..."
                      showSearch={true}
                      onSearch={searchJobFamilies}
                      debounce={300}
                      loading={jobFamiliesLoading}
                      onPopupScrollEnd={loadMoreJobFamilies}
                      filterOption={false}
                    />
                  </div>
                  {jobFamiliesError && (
                    <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                      {jobFamiliesError}
                    </div>
                  )}
                </div>

                {/* Job Function */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                      Job Function *
                    </label>
                    <Select
                      name="jobFunctionId"
                      value={toStringOrUndefined(formValues.jobFunctionId)}
                      onChange={e => {
                        const selectedJobFunctionId = String(e.value || '');
                        setFormValues({ jobFunctionId: selectedJobFunctionId });
                        
                        if (selectedJobFunctionId) {
                          const selectedJobFunction = allJobFunctions.find((jf: any) => jf.id === selectedJobFunctionId);
                          if (selectedJobFunction) {
                            // Auto-select job family if not already selected
                            if (!toStringOrUndefined(formValues.jobFamilyId) && selectedJobFunction?.jobFamily?.id) {
                              setFormValues({ jobFamilyId: selectedJobFunction.jobFamily.id });
                            }
                            // Auto-select job level group from the job function
                            if (selectedJobFunction?.jobLevelGroup?.id) {
                              setFormValues({ jobLevelGroupId: selectedJobFunction.jobLevelGroup.id });
                            }
                          }
                        } else {
                          // Clear job level group when job function is cleared
                          setFormValues({ jobLevelGroupId: '' });
                        }
                      }}
                      data={jobFunctions}
                      placeholder="Please Select..."
                      showSearch={true}
                      onSearch={searchJobFunctions}
                      debounce={300}
                      loading={jobFunctionsLoading}
                      onPopupScrollEnd={loadMoreJobFunctions}
                      filterOption={false}
                    />
                  </div>
                  {jobFunctionsError && (
                    <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                      {jobFunctionsError}
                    </div>
                  )}
                </div>

                {/* Job Level */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                      Job Level *
                    </label>
                    <Select
                      name="jobLevelId"
                      value={toStringOrUndefined(formValues.jobLevelId)}
                      onChange={e => {
                        const selectedJobLevelId = String(e.value || '');
                        setFormValues({ jobLevelId: selectedJobLevelId });
                      }}
                      data={jobLevels}
                      placeholder="Please Select..."
                      showSearch={true}
                      onSearch={searchJobLevels}
                      debounce={300}
                      loading={jobLevelsLoading}
                      onPopupScrollEnd={loadMoreJobLevels}
                      filterOption={false}
                      disabled={!toStringOrUndefined(formValues.jobFunctionId)}
                    />
                  </div>
                  {jobLevelsError && (
                    <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                      {jobLevelsError}
                    </div>
                  )}
                </div>

                {/* Employment Type */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                      Employment Type
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
                      filterOption={false}
                    />
                  </div>
                  {employmentTypesError && (
                    <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                      {employmentTypesError}
                    </div>
                  )}
                </div>

                {/* Contract Type */}
                <div className="gba:space-y-3">
                  <div>
                    <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
                      Contract Type
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
                      filterOption={false}
                    />
                  </div>
                  {contractTypesError && (
                    <div className="gba:text-red-500 gba:text-sm gba:p-2 gba:bg-red-50 gba:rounded">
                      {contractTypesError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="gba:text-red-500 gba:text-sm gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded">
              {error}
            </div>
          )}
        </div>

        {/* Submit Button - Always at the bottom */}
        <div className="gba:flex-shrink-0 gba:pt-6 gba:border-t gba:border-gray-200">
          <Button
            variant="primary"
            loading={loading}
            disabled={loading || !isFormValid}
            className="gba:w-full"
            size="large"
            onClick={(e) => {
              e.preventDefault();
              console.log('Button clicked!');
              console.log('Form values:', formValues);
              console.log('Structure ID:', structureId);
              console.log('Loading state:', loading);
              
              dispatchProcessContinueEvent('pse_submit',
                {
                  "jobPosition": {
                    "name": formValues.name,
                    "jobProfile": formValues.jobProfileId,
                    "jobFunction": formValues.jobFunctionId,
                    "jobLevel": formValues.jobLevelId,
                    "employmentTypeRef": formValues.employmentTypeId,
                    "contractTypeRef": formValues.contractTypeId
                  },
                  "organizationalUnitId": formValues.organizationalUnitId,
                  "structureId": structureId,
                  "changeMode": "INSERT"
                }
              );
              submit();
            }}
          >
            {isEdit ? 'Update Job Position' : 'Create Job Position'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default JobPositionForm; 