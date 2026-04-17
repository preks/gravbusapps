import React, { useCallback } from 'react'
import { useJobPositionContext } from '../context/JobPositionContext'
import { Button, Input, Label, Combobox } from '@newwork/nw-design-system'
import { JobFamilySelect } from './JobFamilySelect'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

const toStringOrUndefined = (val: unknown): string | undefined =>
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
    searchJobProfiles,
    loadMoreJobProfiles,
    hasMoreJobProfiles,
    jobProfilesError,
    jobProfilesLoading,
    searchOrganizationalUnits,
    loadMoreOrganizationalUnits,
    hasMoreOrganizationalUnits,
    organizationalUnitsLoading,
    searchJobFamilies,
    loadMoreJobFamilies,
    hasMoreJobFamilies,
    jobFamiliesLoading
  } = useJobPositionContext()

  const isFormValid =
    toStringOrUndefined(formValues.organizationalUnitId) &&
    toStringOrUndefined(formValues.jobFamilyId) &&
    toStringOrUndefined(formValues.jobFunctionId) &&
    toStringOrUndefined(formValues.name)

  const handleJobProfileSearch = useCallback(
    (searchTerm: string) => {
      const trimmed = searchTerm?.trim() ?? ''
      searchJobProfiles(trimmed.length > 0 ? trimmed : undefined)
    },
    [searchJobProfiles]
  )

  const handleDepartmentSearch = useCallback(
    (searchTerm: string) => {
      const trimmed = searchTerm?.trim() ?? ''
      searchOrganizationalUnits(trimmed.length > 0 ? trimmed : undefined)
    },
    [searchOrganizationalUnits]
  )

  const jobProfilePlaceholder = formValues.jobFunctionId ? 'Please Select...' : 'Please select job function first...'

  const jobProfileEmptyText = (() => {
    if (!formValues.jobFunctionId) {
      return 'Please select a job function first'
    }
    if (jobProfilesLoading) {
      return 'Loading job profiles...'
    }
    return 'No job profiles found'
  })()

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:mb-6">
        <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">
          {modalTitle || (isEdit ? 'Update Job Position' : 'Create Job Position')}
        </h1>
      </div>

      <form
        className="gba:h-full gba:flex gba:flex-col"
        onSubmit={e => {
          e.preventDefault()
          e.stopPropagation()
          return false
        }}
      >
        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:space-y-4">
          {/* 1. Department */}
          <div>
            <Label className="gba:mb-1 gba:block">Department *</Label>
            <Combobox
              options={organizationalUnits.map(unit => ({ value: unit.value, label: unit.name }))}
              value={toStringOrUndefined(formValues.organizationalUnitId)}
              onValueChange={value => setFormValues({ organizationalUnitId: String(value || '') })}
              placeholder="Please Select..."
              searchPlaceholder="Search departments..."
              emptyText={organizationalUnitsLoading ? 'Loading departments...' : 'No departments found'}
              className="gba:w-full"
              disabled={isEdit}
              onSearch={handleDepartmentSearch}
              searchDebounce={300}
              loading={organizationalUnitsLoading}
              hasMore={hasMoreOrganizationalUnits}
              onLoadMore={loadMoreOrganizationalUnits}
              data-testid="job-position-department-combobox"
            />
          </div>

          {/* 2. Position Name */}
          <div>
            <Label className="gba:mb-1 gba:block">Position Name *</Label>
            <Input
              name="name"
              value={formValues.name}
              onChange={e => setFormValues({ name: e.target.value })}
              placeholder="Please Enter..."
              required
              className="gba:w-full"
              data-testid="job-position-name-input"
            />
          </div>

          {/* 3. Job Family */}
          <div>
            <Label className="gba:mb-1 gba:block">Job Family *</Label>
            <JobFamilySelect
              jobFamilies={jobFamilies}
              value={toStringOrUndefined(formValues.jobFamilyId)}
              onValueChange={selectedFamilyId => {
                setFormValues({
                  jobFamilyId: selectedFamilyId,
                  jobFunctionId: '',
                  jobLevelGroupId: '',
                  jobLevelId: ''
                })
              }}
              loading={jobFamiliesLoading}
              hasMore={hasMoreJobFamilies}
              onSearch={searchJobFamilies}
              onLoadMore={loadMoreJobFamilies}
              placeholder="Please Select..."
              searchPlaceholder="Search job families..."
              emptyText={jobFamiliesLoading ? 'Loading job families...' : 'No job families found'}
              data-testid="job-position-job-family-combobox"
            />
          </div>

          {/* 4. Job Function */}
          <div>
            <Label className="gba:mb-1 gba:block">Job Function *</Label>
            <Combobox
              options={jobFunctions.map(func => ({ value: func.value, label: func.name }))}
              value={toStringOrUndefined(formValues.jobFunctionId)}
              onValueChange={value => {
                const selectedFunctionId = String(value || '')
                const selectedFunction = allJobFunctions.find(jf => jf.id === selectedFunctionId)
                setFormValues({
                  jobFunctionId: selectedFunctionId,
                  jobLevelGroupId: selectedFunction?.jobLevelGroup?.id ?? '',
                  jobLevelId: '',
                  jobProfileId: undefined
                })
              }}
              placeholder={!formValues.jobFamilyId ? 'Please select job family first...' : 'Please Select...'}
              searchPlaceholder="Search job functions..."
              emptyText="No job functions found"
              className="gba:w-full"
              disabled={!formValues.jobFamilyId}
            />
            {!formValues.jobFamilyId && (
              <div className="gba:mt-1 gba:text-sm gba:text-muted-foreground">Please select a job family first</div>
            )}
          </div>

          {/* 5. Job Profile */}
          <div>
            <Label className="gba:mb-1 gba:block">Job Profile</Label>
            <Combobox
              options={jobProfiles.map(p => ({ value: p.value, label: p.name }))}
              value={toStringOrUndefined(formValues.jobProfileId)}
              onValueChange={value => setFormValues({ jobProfileId: value ? String(value) : undefined })}
              placeholder={jobProfilePlaceholder}
              searchPlaceholder="Search job profiles..."
              emptyText={jobProfileEmptyText}
              className="gba:w-full"
              disabled={!formValues.jobFunctionId}
              onSearch={handleJobProfileSearch}
              searchDebounce={300}
              loading={jobProfilesLoading}
              hasMore={hasMoreJobProfiles}
              onLoadMore={loadMoreJobProfiles}
              align="start"
              data-testid="job-profile-select"
            />

            {jobProfilesError && <div className="gba:mt-1 gba:text-sm gba:text-destructive">{jobProfilesError}</div>}
          </div>

          {error && (
            <div className="gba:rounded-md gba:border gba:border-destructive/30 gba:bg-destructive/10 gba:p-4">
              <div className="gba:text-sm gba:text-destructive">{error}</div>
            </div>
          )}
        </div>

        <div className="gba:mt-6 gba:flex gba:justify-end gba:border-t gba:border-border gba:pt-4">
          <Button
            type="button"
            disabled={loading || !isFormValid}
            data-testid="job-position-form-submit-button"
            onClick={async e => {
              e.preventDefault()
              e.stopPropagation()
              try {
                await submit()

                const isUpdate = isEdit && formValues.id

                const payload: {
                  jobPosition: {
                    name: string
                    jobFamily: string
                    jobFunction: string
                    jobProfile?: string
                    jobLevelGroup?: string
                    id?: string
                    version?: number
                  }
                  organizationalUnitId: string
                  structureId: string
                  changeMode: 'UPDATE' | 'INSERT'
                } = {
                  jobPosition: {
                    name: formValues.name,
                    jobFamily: formValues.jobFamilyId,
                    jobFunction: formValues.jobFunctionId
                  },
                  organizationalUnitId: formValues.organizationalUnitId,
                  structureId: structureId,
                  changeMode: isUpdate ? 'UPDATE' : 'INSERT'
                }

                if (formValues.jobProfileId) {
                  payload.jobPosition.jobProfile = formValues.jobProfileId
                }
                if (formValues.jobLevelGroupId) {
                  payload.jobPosition.jobLevelGroup = formValues.jobLevelGroupId
                }

                if (isUpdate) {
                  payload.jobPosition.id = formValues.id
                  if (formValues.version !== undefined) {
                    payload.jobPosition.version = formValues.version
                  }
                }

                dispatchProcessContinueEvent('job_position_submit', payload)

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
