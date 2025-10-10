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
  Combobox
} from '@newwork/nw-design-system'
import { JobFamily, JobFunction, JobLevelGroup } from '@/business-apps/mdm/apps/job-structure-data/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

const DATA_TEST_ID_PREFIX = 'JobFunctionForm'

export interface JobFunctionFormProps extends BusinessAppContextProps {
  childAddButton: React.ReactNode
  jobFunction?: Partial<JobFunction>
  onCancel?: () => void
  prefixDataTestId: string
  refetch: () => void
  isDrawerActive?: boolean
  jobFamilies: JobFamily[]
  jobLevelGroups: JobLevelGroup[]
}

const JobFunctionForm: React.FC<JobFunctionFormProps> = ({
  childAddButton,
  jobFunction,
  onCancel,
  prefixDataTestId,
  accessToken,
  refetch,
  isDrawerActive = false,
  jobFamilies,
  jobLevelGroups
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        jobFunction: {
          code: values.code,
          name: values.name,
          description: values.description,
          jobFamilyRef: values.jobFamilyRef,
          jobLevelGroupRef: values.jobLevelGroupRef,
          ...(jobFunction ? { version: jobFunction.version, id: jobFunction.id } : {})
        }
      }

      await restClient.post('/employee/saveJobFunction', payload, {
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
      jobFunction
        ? {
            name: jobFunction.name || '',
            code: jobFunction.code || '',
            description: jobFunction.description || '',
            jobFamilyRef: jobFunction.jobFamily?.id || null,
            jobLevelGroupRef: jobFunction.jobLevelGroup?.id || ''
          }
        : {},
    [jobFunction]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobFunction ? 'Edit Job Function' : 'Create Job Function'}
      description={
        jobFunction
          ? 'Update the job function information'
          : 'Create a new job function to define specific roles and responsibilities'
      }
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!jobFunction}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="name"
        rules={{ required: 'Please enter job function name' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Software Development, Product Management, Sales"
                {...field}
                data-testid={formatDataTestId(dataTestId, 'Name')}
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
              <Input
                placeholder="e.g., SW_DEV, PROD_MGMT, SALES"
                {...field}
                data-testid={formatDataTestId(dataTestId, 'Code')}
              />
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
                placeholder="Describe this job function and the types of roles it encompasses"
                rows={3}
                {...field}
                data-testid={formatDataTestId(dataTestId, 'Description')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="jobFamilyRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Family</FormLabel>
            <FormControl>
              <Combobox
                key={`job-family-combobox-${field.value || 'empty'}`}
                options={jobFamilies.map(family => ({
                  value: family.id,
                  label: family.name
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select job family (optional)"
                searchPlaceholder="Search job families..."
                emptyText="No job families found"
                className="gba:!w-full"
                data-testid={formatDataTestId(dataTestId, 'JobFamily')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="jobLevelGroupRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Level Group</FormLabel>
            <FormControl>
              <Combobox
                key={`job-level-group-combobox-${field.value || 'empty'}`}
                options={jobLevelGroups.map(group => ({
                  value: group.id,
                  label: group.name
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select job level group (optional)"
                searchPlaceholder="Search job level groups..."
                emptyText="No job level groups found"
                className="gba:!w-full"
                data-testid={formatDataTestId(dataTestId, 'JobLevelGroup')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default JobFunctionForm
