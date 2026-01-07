import React from 'react'
import { useJobPositionContext } from '../context/JobPositionContext'
import { Button, Input, Label, Combobox } from '@newwork/nw-design-system'
import { CustomSelect } from './CustomSelect'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

const toStringOrUndefined = (val: any): string | undefined =>
  typeof val === 'string' && val.length > 0 ? val : undefined

interface JobPositionFormProps {
  isModal?: boolean
  onClose?: () => void
  modalTitle?: string
  submitButtonText?: string
}

const JobPositionForm: React.FC<JobPositionFormProps> = ({
  isModal = false,
  onClose,
  modalTitle,
  submitButtonText
}) => {
  const {
    formValues,
    setFormValues,
    organizationalUnits,
    jobFamilies,
    jobFunctions,
    allJobFunctions,
    jobProfiles,
    loading,
    error,
    submit,
    isEdit,
    structureId,
    // Search functionality
    searchJobProfiles,
    loadMoreJobProfiles,
    hasMoreJobProfiles,
    jobProfilesError,
    jobProfilesLoading,
    enableJobProfilesLoading
    // Job functions loading
  } = useJobPositionContext()

  // Check if all mandatory fields are filled
  const isFormValid =
    toStringOrUndefined(formValues.organizationalUnitId) &&
    toStringOrUndefined(formValues.jobFamilyId) &&
    toStringOrUndefined(formValues.jobFunctionId) &&
    toStringOrUndefined(formValues.name)

  // Handle job profile search - only search after 3+ characters
  const handleJobProfileSearch = (searchTerm: string) => {
    const trimmedTerm = searchTerm?.trim() || ''

    // Only trigger search if user has entered at least 3 characters or cleared the search
    if (trimmedTerm.length >= 3 || trimmedTerm.length === 0) {
      searchJobProfiles(trimmedTerm || undefined)
    }
    // If less than 3 characters, don't trigger search but don't clear existing results either
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      {/* Form Title */}
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">
          {modalTitle || (isEdit ? 'Update Job Position' : 'Create Job Position')}
        </h1>
      </div>

      <form
        className="gba:h-full gba:flex gba:flex-col"
        onSubmit={e => {
          // Prevent any form submission
          e.preventDefault()
          e.stopPropagation()
          return false
        }}
      >
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">
          {/* Job Position Information Section */}
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:border-b gba:border-border gba:pb-2">
              Job Position Information
            </h3>

            {/* Organizational Unit - Mandatory */}
            <div style={{ marginBottom: 'var(--nw-spacing-4)' }}>
              <Label style={{ marginBottom: 'var(--nw-spacing-1)' }}>Department *</Label>
              <Combobox
                options={organizationalUnits.map(unit => ({ value: unit.value, label: unit.name }))}
                value={toStringOrUndefined(formValues.organizationalUnitId)}
                onValueChange={value => setFormValues({ organizationalUnitId: String(value || '') })}
                placeholder="Please Select..."
                searchPlaceholder="Search departments..."
                emptyText="No departments found"
                className="w-full"
                disabled={isEdit} // Disabled in edit mode
              />
            </div>

            {/* Job Family - Mandatory */}
            <div style={{ marginBottom: 'var(--nw-spacing-4)' }}>
              <Label style={{ marginBottom: 'var(--nw-spacing-1)' }}>Job Family *</Label>
              <Combobox
                options={jobFamilies.map(family => ({ value: family.value, label: family.name }))}
                value={toStringOrUndefined(formValues.jobFamilyId)}
                onValueChange={value => {
                  const selectedFamilyId = String(value || '')
                  setFormValues({
                    jobFamilyId: selectedFamilyId,
                    jobFunctionId: '', // Reset job function when family changes
                    jobLevelGroupId: '', // Reset job level group
                    jobLevelId: '' // Reset job level
                  })
                }}
                placeholder="Please Select..."
                searchPlaceholder="Search job families..."
                emptyText="No job families found"
                className="w-full"
              />
            </div>

            {/* Job Function - Mandatory */}
            <div style={{ marginBottom: 'var(--nw-spacing-4)' }}>
              <Label style={{ marginBottom: 'var(--nw-spacing-1)' }}>Job Function *</Label>
              <Combobox
                options={jobFunctions.map(func => ({ value: func.value, label: func.name }))}
                value={toStringOrUndefined(formValues.jobFunctionId)}
                onValueChange={value => {
                  const selectedFunctionId = String(value || '')
                  setFormValues({
                    jobFunctionId: selectedFunctionId,
                    jobLevelGroupId: '', // Reset job level group
                    jobLevelId: '' // Reset job level
                  })

                  // Auto-select job level group if job function has one
                  if (selectedFunctionId) {
                    const selectedFunction = allJobFunctions.find(jf => jf.id === selectedFunctionId)
                    if (selectedFunction?.jobLevelGroup?.id) {
                      setFormValues({
                        jobFunctionId: selectedFunctionId,
                        jobLevelGroupId: selectedFunction.jobLevelGroup.id
                      })
                    }
                  }
                }}
                placeholder={!formValues.jobFamilyId ? 'Please select job family first...' : 'Please Select...'}
                searchPlaceholder="Search job functions..."
                emptyText="No job functions found"
                className="w-full"
                disabled={!formValues.jobFamilyId}
              />
              {!formValues.jobFamilyId && (
                <div
                  style={{
                    marginTop: 'var(--nw-spacing-1)',
                    fontSize: '0.875rem',
                    color: 'var(--nw-color-muted-foreground)'
                  }}
                >
                  Please select a job family first
                </div>
              )}
            </div>

            {/* Position Name - Mandatory */}
            <div style={{ marginBottom: 'var(--nw-spacing-4)' }}>
              <Label style={{ marginBottom: 'var(--nw-spacing-1)' }}>Position Name *</Label>
              <Input
                name="name"
                value={formValues.name}
                onChange={e => setFormValues({ name: e.target.value })}
                placeholder="Please Enter..."
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Optional Information Section */}
          <div className="gba:space-y-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:border-b gba:border-border gba:pb-2">
              Additional Information
            </h3>

            {/* Job Profile - Optional */}
            <div style={{ marginBottom: 'var(--nw-spacing-4)' }}>
              <Label style={{ marginBottom: 'var(--nw-spacing-1)' }}>Job Profile (Optional)</Label>
              <CustomSelect
                name="jobProfileId"
                value={toStringOrUndefined(formValues.jobProfileId)}
                onChange={e => setFormValues({ jobProfileId: String(e.value || '') })}
                data={jobProfiles}
                placeholder="Type to search..."
                showSearch={true}
                onSearch={handleJobProfileSearch}
                debounce={300}
                loading={jobProfilesLoading}
                disabled={jobProfilesLoading}
                onPopupScrollEnd={loadMoreJobProfiles}
                hasMore={hasMoreJobProfiles}
                allowClear={true}
                style={{ width: '100%' }}
                data-testid="job-profile-select"
                onFocus={enableJobProfilesLoading}
              />
              <div
                style={{
                  marginTop: 'var(--nw-spacing-1)',
                  fontSize: '0.75rem',
                  color: 'var(--nw-color-muted-foreground)'
                }}
              >
                Type to search by job profile name or code
              </div>

              {jobProfilesError && (
                <div
                  style={{
                    marginTop: 'var(--nw-spacing-1)',
                    fontSize: '0.875rem',
                    color: 'var(--nw-color-destructive)'
                  }}
                >
                  {jobProfilesError}
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                backgroundColor: 'var(--nw-color-destructive-50)',
                border: '1px solid var(--nw-color-destructive-200)',
                borderRadius: 'var(--nw-border-radius-md)',
                padding: 'var(--nw-spacing-4)'
              }}
            >
              <div
                style={{
                  color: 'var(--nw-color-destructive-800)',
                  fontSize: '0.875rem'
                }}
              >
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div
          style={{
            marginTop: 'var(--nw-spacing-6)',
            paddingTop: 'var(--nw-spacing-4)',
            borderTop: '1px solid var(--nw-color-border)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <Button
            type="button"
            disabled={loading || !isFormValid}
            data-testid="job-position-form-submit-button"
            onClick={async e => {
              e.preventDefault()
              e.stopPropagation()
              try {
                await submit()

                // Determine if this is an update or create operation
                const isUpdate = isEdit && formValues.id

                // Prepare the payload - only include the fields we actually collect
                const payload: any = {
                  jobPosition: {
                    name: formValues.name,
                    jobFamily: formValues.jobFamilyId,
                    jobFunction: formValues.jobFunctionId
                  },
                  organizationalUnitId: formValues.organizationalUnitId,
                  structureId: structureId,
                  changeMode: isUpdate ? 'UPDATE' : 'INSERT'
                }

                // Add optional fields if they exist
                if (formValues.jobProfileId) {
                  payload.jobPosition.jobProfile = formValues.jobProfileId
                }
                if (formValues.jobLevelGroupId) {
                  payload.jobPosition.jobLevelGroup = formValues.jobLevelGroupId
                }

                // For updates, include the job position ID and version
                if (isUpdate) {
                  payload.jobPosition.id = formValues.id
                  if (formValues.version !== undefined) {
                    payload.jobPosition.version = formValues.version
                  }
                }

                // Dispatch process continue event on successful submission
                dispatchProcessContinueEvent('job_position_submit', payload)

                // Close modal if in modal mode
                if (isModal && onClose) {
                  onClose()
                }
              } catch (err) {
                console.error('Error submitting job position form:', err)
              }
            }}
          >
            {submitButtonText || (isEdit ? 'Update Job Position' : 'Create Job Position')}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default JobPositionForm
