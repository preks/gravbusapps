import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { ComboboxField, TextField, ReadOnlyField } from '@/business-apps/mdm/components/form-fields/FormFields.tsx'
import useJobPositions from '../hooks/useJobPositions.ts'
import {
  JobPositionFormValues,
  transformJobProfileForForm
} from '@/business-apps/hr/core/forms/job-position/utils/JobPosition.types.ts'
import type { JobProfile } from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types'

interface JobPositionFormFieldsProps {
  prefixDataTestId: string
  accessToken: string
  /** When true, site location and department are not shown (values stay in the form for submit). */
  isEditing?: boolean
}

export function JobPositionFormFields(props: Readonly<JobPositionFormFieldsProps>) {
  const { prefixDataTestId, accessToken, isEditing = false } = props
  const { setValue, getValues } = useFormContext<JobPositionFormValues>()

  const {
    siteLocations,
    departments,
    jobFamilies,
    jobFunctions,
    jobProfiles,
    handleSiteLocationSearch,
    handleDepartmentSearch,
    handleJobFamilySearch,
    handleJobFunctionSearch,
    handleJobProfileSearch,
    clearJobProfiles,
    ensureJobProfileInOptions
  } = useJobPositions({ accessToken })

  const watchedFamilyId = useWatch<JobPositionFormValues, 'jobFamily'>({ name: 'jobFamily' })?.id
  const watchedFunctionId = useWatch<JobPositionFormValues, 'jobFunction'>({ name: 'jobFunction' })?.id
  const watchedJobLevel = useWatch<JobPositionFormValues, 'jobLevel'>({ name: 'jobLevel' })
  const watchedLevelId = watchedJobLevel?.id
  const watchedProfileId = useWatch<JobPositionFormValues, 'jobProfile'>({ name: 'jobProfile' })?.id

  // Job profiles are not loaded in reference data (unlike job functions). ComboboxField resolves the
  // trigger label from `options` only — an empty `jobProfiles` list yields a blank trigger even when
  // defaultValues / RHF already hold the correct `jobProfile` object and id.
  useEffect(() => {
    if (!watchedProfileId) return
    void ensureJobProfileInOptions(watchedProfileId)
  }, [watchedProfileId, ensureJobProfileInOptions])

  // Populate empty fields when a job profile is selected
  useEffect(() => {
    if (!watchedProfileId) return
    const profile = jobProfiles.find((p: JobProfile) => p.id === watchedProfileId)
    if (!profile) return

    const derivedFunction = profile.jobFunction ?? null
    const derivedFamily = derivedFunction?.jobFamily ?? null
    const derivedLevel = profile.jobLevel ?? null

    if (!getValues('jobFamily') && derivedFamily) {
      setValue('jobFamily', { id: derivedFamily.id, code: derivedFamily.code, name: derivedFamily.name })
    }
    if (!getValues('jobFunction') && derivedFunction) {
      setValue('jobFunction', { id: derivedFunction.id, code: derivedFunction.code, name: derivedFunction.name })
    }
    if (!getValues('jobLevel') && derivedLevel) {
      setValue('jobLevel', {
        id: derivedLevel.id,
        code: derivedLevel.code,
        name: derivedLevel.name,
        hierarchyOrder: derivedLevel.hierarchyOrder
      })
    }
  }, [watchedProfileId, jobProfiles])

  return (
    <>
      {!isEditing && (
        <>
          <ComboboxField<JobPositionFormValues>
            name="siteLocation"
            label="Site Location"
            required={false}
            options={siteLocations.map(site => ({
              value: site.id,
              label: site.code ? `${site.name} (${site.code})` : site.name
            }))}
            placeholder="Select a Site Location"
            searchPlaceholder="Search site locations..."
            emptyText="No site locations found"
            dataTestId={`${prefixDataTestId}-site-location-combobox`}
            onSearch={handleSiteLocationSearch}
            onValueChange={(selectedId, field) => {
              field.onChange(siteLocations.find(s => s.id === selectedId) || null)
              handleSiteLocationSearch('')
            }}
          />

          <ComboboxField<JobPositionFormValues>
            name="department"
            label="Department"
            required
            options={departments.map(dept => ({
              value: dept.id,
              label: dept.code ? `${dept.name} (${dept.code})` : dept.name
            }))}
            placeholder="Select a Department"
            searchPlaceholder="Search departments..."
            emptyText="No departments found"
            dataTestId={`${prefixDataTestId}-department-combobox`}
            onSearch={handleDepartmentSearch}
            onValueChange={(selectedId, field) => {
              field.onChange(departments.find(d => d.id === selectedId) || null)
              handleDepartmentSearch('')
            }}
          />
        </>
      )}

      <ComboboxField<JobPositionFormValues>
        name="jobFamily"
        label="Job Family"
        required
        options={jobFamilies.map(jf => ({
          value: jf.id,
          label: `${jf.name} (${jf.code})`
        }))}
        placeholder="Select a Job Family"
        searchPlaceholder="Search job families..."
        emptyText="No job families found"
        dataTestId={`${prefixDataTestId}-job-family-combobox`}
        onSearch={handleJobFamilySearch}
        onValueChange={(selectedId, field) => {
          field.onChange(jobFamilies.find(jf => jf.id === selectedId) || null)
          clearJobProfiles()
          handleJobFamilySearch('')
          handleJobFunctionSearch('', { familyId: selectedId })
          setValue('jobFunction', null)
          setValue('jobLevel', null)
          setValue('jobProfile', null)
        }}
      />

      <ComboboxField<JobPositionFormValues>
        name="jobFunction"
        label="Job Function"
        required
        comboboxKeySuffix={watchedFamilyId ?? ''}
        options={(watchedFamilyId ? jobFunctions : []).map(jf => ({
          value: jf.id,
          label: `${jf.name} (${jf.code})`
        }))}
        placeholder="Select a Job Function"
        searchPlaceholder="Search job functions..."
        emptyText={watchedFamilyId ? 'No job functions found' : 'Please select a Job Family first'}
        dataTestId={`${prefixDataTestId}-job-function-combobox`}
        onSearch={query => handleJobFunctionSearch(query, { familyId: watchedFamilyId })}
        onValueChange={(selectedId, field) => {
          field.onChange(jobFunctions.find(jf => jf.id === selectedId) || null)

          handleJobFunctionSearch('', { familyId: watchedFamilyId })
          handleJobProfileSearch('', { functionId: selectedId })

          setValue('jobLevel', null)
          setValue('jobProfile', null)
        }}
      />

      <ComboboxField<JobPositionFormValues>
        name="jobProfile"
        label="Job Profile"
        required
        comboboxKeySuffix={[watchedFamilyId, watchedFunctionId, watchedLevelId].filter(Boolean).join(':')}
        options={jobProfiles.map(jp => ({
          value: jp.id,
          label: jp.code ? `${jp.name} (${jp.code})` : jp.name
        }))}
        placeholder="Select a Job Profile"
        searchPlaceholder="Search job profiles..."
        emptyText={watchedFamilyId ? 'No job profiles found' : 'Please select a Job Family first'}
        dataTestId={`${prefixDataTestId}-job-profile-combobox`}
        onSearch={query =>
          handleJobProfileSearch(query, {
            functionId: watchedFunctionId,
            familyId: watchedFamilyId
          })
        }
        onValueChange={(selectedId, field) => {
          const selected = jobProfiles.find(jp => jp.id === selectedId)
          field.onChange(selected ? transformJobProfileForForm(selected) : null)
          setValue('jobLevel', null)

          handleJobProfileSearch('', {
            functionId: selected?.jobFunction?.id ?? watchedFunctionId,
            familyId: watchedFamilyId
          })
        }}
      />

      <ReadOnlyField<JobPositionFormValues>
        name="jobLevel"
        label="Job Level"
        value={
          watchedJobLevel
            ? `${watchedJobLevel.name} (${watchedJobLevel.code}) - Level ${watchedJobLevel.hierarchyOrder}`
            : ''
        }
        placeholder="Determined by Job Profile"
        dataTestId={`${prefixDataTestId}-job-level-readonly`}
      />

      <TextField<JobPositionFormValues>
        name="name"
        label="Position Name"
        required
        placeholder="Enter position name..."
        dataTestId={`${prefixDataTestId}-name-input`}
      />
    </>
  )
}
