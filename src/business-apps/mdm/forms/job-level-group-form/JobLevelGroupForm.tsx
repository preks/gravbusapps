import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { JobLevel } from '../../apps/job-structure-data'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { JOB_LEVEL_GROUP_CATALOG, JOB_LEVEL_GROUP_VERSION } from '../../apps/compensation-data/hooks/useJobLevelGroups'
import { useCodeError } from '../../hooks/useCodeError'

export interface JobLevelGroup {
  id: string
  name: string
  code: string
  description?: string
  levels?: JobLevel[]
}

export interface JobLevelGroupFormProps extends BusinessAppContextProps {
  jobLevelGroup?: Partial<JobLevelGroup>
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton: React.ReactNode
  refetch: () => void
  accessToken: string
  usedCodes?: string[]
}

const JobLevelGroupForm: React.FC<JobLevelGroupFormProps> = ({
  jobLevelGroup,
  onCancel,
  prefixDataTestId,
  childAddButton,
  refetch,
  accessToken,
  usedCodes = []
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, 'JobLevelGroupForm')
  const catalogClient = useCatalogManagerClient(accessToken)
  const { codeError, setCodeError, validateCode } = useCodeError(usedCodes)

  const handleSubmit = async (values: any) => {
    if (!validateCode(values.code) && !jobLevelGroup) {
      return
    }

    const payload = {
      ...(jobLevelGroup ? { id: jobLevelGroup.id } : {}),
      code: values.code,
      value: values.name,
      additionalValue1: values.description,
      translations: []
    }

    if (jobLevelGroup) {
      await catalogClient.updateCatalogEntry(
        JOB_LEVEL_GROUP_CATALOG,
        JOB_LEVEL_GROUP_VERSION,
        jobLevelGroup.id ?? '',
        payload
      )
    } else {
      await catalogClient.createCatalogEntry(JOB_LEVEL_GROUP_CATALOG, JOB_LEVEL_GROUP_VERSION, payload)
    }

    refetch()
  }

  const defaultValues = useMemo(
    () => ({
      name: jobLevelGroup?.name || '',
      code: jobLevelGroup?.code || '',
      description: jobLevelGroup?.description || ''
    }),
    [jobLevelGroup]
  )

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={jobLevelGroup ? 'Edit Job Level Group' : 'Create Job Level Group'}
      description="Configure job level group details and career path information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!jobLevelGroup}
      dataTestId={dataTestId}
      isValid={!codeError}
      setCodeError={setCodeError}
    >
      <FormField
        name="name"
        rules={{ required: 'Please enter group name' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Software Engineering, Management, Sales"
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!jobLevelGroup && (
        <FormField
          name="code"
          rules={{ required: 'Please enter code' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., SWE, MGT, SALES"
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    validateCode(e.target.value)
                  }}
                  data-testid={`${dataTestId}-code-input`}
                />
              </FormControl>
              <FormMessage>{codeError}</FormMessage>
            </FormItem>
          )}
        />
      )}

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the career path and role types in this group"
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default JobLevelGroupForm
