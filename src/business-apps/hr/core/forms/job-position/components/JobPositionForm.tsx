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
  const currentJobFunctionRef = useRef<string | undefined>();
  const currentJobLevelGroupRef = useRef<string | undefined>();
  const currentJobProfileRef = useRef<string | undefined>();

  // Check if all mandatory fields are filled
  const isFormValid = 
    toStringOrUndefined(formValues.name) &&
    toStringOrUndefined(formValues.jobProfileId) &&
    toStringOrUndefined(formValues.organizationalUnitId) &&
    toStringOrUndefined(formValues.jobFamilyId) &&
    toStringOrUndefined(formValues.jobFunctionId) &&
    toStringOrUndefined(formValues.jobLevelId) &&
    toStringOrUndefined(formValues.employmentTypeId) &&
    toStringOrUndefined(formValues.contractTypeId);

  // Handle job family changes - clear dependent fields when family changes
  useEffect(() => {
    const jobFamilyId = toStringOrUndefined(formValues.jobFamilyId);
    
    // Only process if the job family actually changed
    if (currentJobFamilyRef.current !== jobFamilyId) {
      const previousJobFamilyId = currentJobFamilyRef.current;
      currentJobFamilyRef.current = jobFamilyId;
      
      // Clear job function and job level when job family changes (not on initial load)
      if (previousJobFamilyId !== undefined && previousJobFamilyId !== jobFamilyId) {
        if (toStringOrUndefined(formValues.jobFunctionId)) {
          setFormValues({ jobFunctionId: '' });
        }
        if (toStringOrUndefined(formValues.jobLevelId)) {
          setFormValues({ jobLevelId: '' });
        }
      }
      
      // Fetch job functions for the new family
      if (jobFamilyId) {
        fetchJobFunctions(jobFamilyId);
      } else {
        fetchJobFunctions('');
      }
    }
  }, [formValues.jobFamilyId, formValues.jobFunctionId, formValues.jobLevelId, fetchJobFunctions, setFormValues]);

  // Handle job function changes - clear dependent fields when function changes
  useEffect(() => {
    const jobFunctionId = toStringOrUndefined(formValues.jobFunctionId);
    
    // Only process if the job function actually changed
    if (currentJobFunctionRef.current !== jobFunctionId) {
      const previousJobFunctionId = currentJobFunctionRef.current;
      currentJobFunctionRef.current = jobFunctionId;
      
      // Clear job level when job function changes (not on initial load)
      if (previousJobFunctionId !== undefined && previousJobFunctionId !== jobFunctionId) {
        if (toStringOrUndefined(formValues.jobLevelId)) {
          setFormValues({ jobLevelId: '' });
        }
      }
    }
  }, [formValues.jobFunctionId, formValues.jobLevelId, setFormValues]);

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

  // Auto-populate name from job profile only when job profile changes
  useEffect(() => {
    const jobProfileId = toStringOrUndefined(formValues.jobProfileId);
    
    // Only set the name if the job profile actually changed
    if (currentJobProfileRef.current !== jobProfileId) {
      currentJobProfileRef.current = jobProfileId;
      
      if (jobProfileId) {
        const selectedProfile = allJobProfiles.find(profile => profile.id === jobProfileId);
        if (selectedProfile) {
          setFormValues({ name: selectedProfile.name });
        }
      } else {
        // Clear name when job profile is cleared
        setFormValues({ name: '' });
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

          {/* Name field - Auto-populated from Job Profile but editable (disabled when no job profile selected) */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              Name *
            </label>
            <Input
              name="name"
              value={typeof formValues.name === 'string' ? formValues.name : ''}
              onChange={e => setFormValues({ name: String(e.value || '') })}
              placeholder="Please Enter..."
              disabled={!toStringOrUndefined(formValues.jobProfileId)}
            />
          </div>

          {/* Organizational Unit - Mandatory field with search (disabled in edit mode) */}
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
                disabled={isEdit}
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
                        
                        if (selectedJobFunctionId) {
                          const selectedJobFunction = allJobFunctions.find((jf: any) => jf.id === selectedJobFunctionId);
                          if (selectedJobFunction) {
                            // Prepare all updates in a single object
                            const updates: any = { jobFunctionId: selectedJobFunctionId };
                            
                            // Auto-select job family if not already selected
                            if (!toStringOrUndefined(formValues.jobFamilyId) && selectedJobFunction?.jobFamily?.id) {
                              updates.jobFamilyId = selectedJobFunction.jobFamily.id;
                            }
                            
                            // Auto-select job level group from the job function
                            if (selectedJobFunction?.jobLevelGroup?.id) {
                              updates.jobLevelGroupId = selectedJobFunction.jobLevelGroup.id;
                            }
                            
                            // Apply all updates at once
                            setFormValues(updates);
                          } else {
                            // Just set the job function ID if no matching function found
                            setFormValues({ jobFunctionId: selectedJobFunctionId });
                          }
                        } else {
                          // Clear job function and job level group when job function is cleared
                          setFormValues({ 
                            jobFunctionId: '', 
                            jobLevelGroupId: '' 
                          });
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
            disabled={!isFormValid}
            className="gba:w-full"
            size="large"
            onClick={async () => {
              try {
                await submit();
                
                // Determine if this is an update or create operation
                const isUpdate = isEdit && formValues.id;
                
                // Prepare the payload
                const payload: any = {
                  "jobPosition": {
                    "name": formValues.name,
                    "jobProfile": formValues.jobProfileId,
                    "jobFamily": formValues.jobFamilyId,
                    "jobFunction": formValues.jobFunctionId,
                    "jobLevel": formValues.jobLevelId,
                    "employmentTypeRef": formValues.employmentTypeId,
                    "contractTypeRef": formValues.contractTypeId
                  },
                  "organizationalUnitId": formValues.organizationalUnitId,
                  "structureId": structureId,
                  "changeMode": isUpdate ? "UPDATE" : "INSERT"
                };
                
                // For updates, include the job position ID and version
                if (isUpdate) {
                  payload.jobPosition.id = formValues.id;
                  if (formValues.version !== undefined) {
                    payload.jobPosition.version = formValues.version;
                  }
                }
                
                // Dispatch process continue event on successful submission
                dispatchProcessContinueEvent('job_position_submit', payload);
              } catch (err) {
                console.error('Error submitting job position form:', err);
              }
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