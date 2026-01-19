import React, { useState } from 'react'
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
import { CompensationBand } from '../../apps/compensation-data'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { JobLevel } from '../../apps/job-structure-data'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const DATA_TEST_ID_PREFIX = 'JobLevelForm'

export interface JobLevelFormProps extends BusinessAppContextProps {
  jobLevel?: JobLevel
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  compensationBands: CompensationBand[]
  groupId: string
  refetch: () => void
  defaultValues?: Record<string, any>
  isDrawerActive?: boolean
}

const JobLevelForm: React.FC<JobLevelFormProps> = ({
  jobLevel,
  onCancel,
  prefixDataTestId,
  childAddButton,
  compensationBands,
  groupId,
  accessToken,
  refetch,
  defaultValues = {},
  isDrawerActive = false
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const payload = {
        changeMode: 'INSERT',
        jobLevel: {
          code: values.code,
          name: values.name,
          jobLevelGroupRef: groupId,
          ...(values.description ? { description: values.description } : {}),
          ...(values.experienceYears ? { additionalProperties: { additionalProp1: values.experienceYears } } : {}),
          hierarchyOrder: values.level,
          compensationBand:
            values.compensationBandId && values.compensationBandId.trim() !== '' ? values.compensationBandId : null,
          ...(jobLevel ? { version: jobLevel.version, id: jobLevel.id } : {})
        }
      }

      await restClient.post('/employee/saveJobLevel', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      setTimeout(() => {
        refetch()
      }, 2000)
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobLevel ? 'Edit Job Level' : 'Create Job Level'}
      description="Configure job level details and requirements"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={
        jobLevel
          ? {
              ...jobLevel,
              compensationBand: jobLevel.compensationBandId || jobLevel.compensationBand?.id || ''
            }
          : {
              ...defaultValues
            }
      }
      isEditing={!!jobLevel}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
    >
      <FormField
        name="name"
        rules={{ required: 'Please enter job level name' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Level Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Senior Software Engineer, Engineering Manager" {...field} />
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
              <Input placeholder="e.g., SSE, EM" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="level"
        rules={{ required: 'Please enter level number' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Level Number</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={20}
                placeholder="1-20"
                className="gba:w-full"
                {...field}
                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="experienceYears"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Experience Required (Years)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={30}
                placeholder="Years of experience"
                className="gba:w-full"
                {...field}
                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
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
                placeholder="Describe the responsibilities and requirements for this level"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="compensationBandId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Compensation Band</FormLabel>
            <FormControl>
              <Combobox
                key={`combobox-${field.value || 'empty'}`}
                options={compensationBands.map(band => ({
                  value: band.id,
                  label: band.name || ''
                }))}
                value={field.value || ''}
                onValueChange={field.onChange}
                placeholder="Select compensation band (optional)"
                searchPlaceholder="Search compensation bands..."
                emptyText="No compensation bands found"
                className="gba:!w-full"
                data-testid={`${dataTestId}-compensation-band-combobox`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default JobLevelForm
