import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Combobox,
  Switch
} from '@newwork/nw-design-system'
import { JobFunction, JobProfile, JobLevelGroup, JobLevel } from '@/business-apps/mdm/apps/job-structure-data/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { env } from '@/common/env/EnvUtils'

import { useRestClient } from '@/common/network/rest/useRestClient'

const DATA_TEST_ID_PREFIX = 'JobProfileForm'

export interface JobProfileFormProps extends BusinessAppContextProps {
  jobProfile?: JobProfile
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  jobFunctions: JobFunction[]
  jobLevelGroups: JobLevelGroup[]
  contractTypes: Array<{ id: string; value: string }>
  employmentTypes: Array<{ id: string; value: string }>
  refetch: () => void
  isDrawerActive?: boolean
  defaultJobLevels?: JobLevel[]
  jobLevelGroupRef?: string
}

const JobProfileForm: React.FC<JobProfileFormProps> = ({
  jobProfile,
  prefixDataTestId,
  childAddButton,
  jobFunctions,
  jobLevelGroups,
  contractTypes,
  employmentTypes,
  accessToken,
  refetch,
  isDrawerActive = false
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [loading, setLoading] = useState(false)
  const [selectedJobFunction, setSelectedJobFunction] = useState<{
    id: string
    name: string
  } | null>(jobProfile?.jobFunction ?? null)
  const [selectedJobLevel, setSelectedJobLevel] = useState<{
    id: string
    name: string
  } | null>(jobProfile?.jobLevel ?? null)

  const jobLevels = useMemo(() => {
    const targetJobFunction = jobFunctions.find(jobFunction => jobFunction.id === selectedJobFunction?.id)

    if (!targetJobFunction) {
      return []
    }

    const targetJobLevelGroup = jobLevelGroups.find(
      jobLevelGroup => jobLevelGroup.id === targetJobFunction?.jobLevelGroupRef
    )

    const jobLevels = (targetJobLevelGroup?.jobLevels ?? []).map(jobLevel => ({
      id: jobLevel.id,
      name: jobLevel.name
    }))

    return jobLevels
  }, [jobLevelGroups, selectedJobFunction, jobProfile, jobFunctions])

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        jobProfile: {
          code: values.code,
          name: values.name,
          description: values.description,
          contractTypeRef: values.contractTypeRef?.length > 0 ? values.contractTypeRef : null,
          employmentTypeRef: values.employmentTypeRef?.length > 0 ? values.employmentTypeRef : null,
          jobFunction: values.jobFunctionId,
          jobLevel: values.jobLevelId?.length > 0 ? values.jobLevelId : null,
          recordState: values.active,
          ...(jobProfile ? { version: jobProfile.version, id: jobProfile.id } : {})
        }
      }

      await restClient.post('/employee/saveJobProfile', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      refetch()
    } catch (error) {
      console.error('Error saving Job Function:', error)
    } finally {
      setLoading(false)
    }
  }

  const defaultValues = useMemo(
    () =>
      jobProfile
        ? {
            id: jobProfile.id,
            name: jobProfile.name,
            code: jobProfile.code,
            description: jobProfile.description,
            jobFunctionId: jobProfile.jobFunctionId,
            jobLevelId: jobProfile.jobLevelId,
            contractTypeRef: jobProfile.contractTypeRef,
            employmentTypeRef: jobProfile.employmentTypeRef,
            active: jobProfile.recordState ? 'active' : 'inactive'
          }
        : {},
    [jobProfile]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobProfile ? 'Edit Job Profile' : 'Create Job Profile'}
      description="Configure job profile details and requirements"
      onSubmit={handleSubmit}
      onCancel={() => {
        setSelectedJobLevel(jobProfile?.jobLevel ?? null)
        setSelectedJobFunction(jobProfile?.jobFunction ?? null)
      }}
      defaultValues={defaultValues}
      isEditing={!!jobProfile}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="name"
        rules={{ required: 'Please enter job profile name' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Profile Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Senior Software Engineer, Product Manager"
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="code"
        rules={{ required: 'Please enter code' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Code</FormLabel>
            <FormControl>
              <Input placeholder="e.g., SSE, PM" {...field} data-testid={`${dataTestId}-code-input`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the responsibilities and requirements for this profile"
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="jobFunctionId"
        rules={{ required: 'Please select a job function' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Function</FormLabel>
            <FormControl>
              <Combobox
                key={`job-function-combobox-${field.value || 'empty'}`}
                options={jobFunctions.map(func => ({
                  value: func.id,
                  label: func.name
                }))}
                value={field.value || ''}
                onValueChange={value => {
                  field.onChange(value)

                  const targetJobFunction = jobFunctions.find(jobFunction => jobFunction.id === value)

                  if (targetJobFunction) {
                    setSelectedJobFunction(targetJobFunction)
                    setSelectedJobLevel(null)
                  } else {
                    setSelectedJobFunction(null)
                    setSelectedJobLevel(null)
                  }
                }}
                placeholder="Select job function"
                searchPlaceholder="Search job functions..."
                emptyText="No job functions found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-job-function-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="jobLevelId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Level</FormLabel>
            <FormControl>
              <Combobox
                key={`job-level-combobox-${field.value || 'empty'}`}
                options={jobLevels.map(level => ({
                  value: level.id,
                  label: level.name
                }))}
                value={selectedJobLevel?.id || ''}
                onValueChange={value => {
                  field.onChange(value)
                  const targetLevel = jobLevels.find(jobLevel => jobLevel.id === value)

                  if (targetLevel) {
                    setSelectedJobLevel({
                      id: targetLevel.id,
                      name: targetLevel.name
                    })
                  }
                }}
                placeholder="Select job level (optional)"
                searchPlaceholder="Search job levels..."
                emptyText="No job levels found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-job-level-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="contractTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contract Type</FormLabel>
            <FormControl>
              <Combobox
                key={`contract-type-combobox-${field.value || 'empty'}`}
                options={contractTypes.map(type => ({
                  value: type.id,
                  label: type.value
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select contract type (optional)"
                searchPlaceholder="Search contract types..."
                emptyText="No contract types found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-contract-type-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="employmentTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Employment Type</FormLabel>
            <FormControl>
              <Combobox
                key={`employment-type-combobox-${field.value || 'empty'}`}
                options={employmentTypes.map(type => ({
                  value: type.id,
                  label: type.value
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select employment type (optional)"
                searchPlaceholder="Search employment types..."
                emptyText="No employment types found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-employment-type-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="active"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Active</FormLabel>
            <FormControl>
              <Switch
                checked={field.value === 'active'}
                onCheckedChange={checked => field.onChange(checked ? 'active' : 'inactive')}
                data-testid={`${dataTestId}-active-switch`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default JobProfileForm
