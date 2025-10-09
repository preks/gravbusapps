import React, { Dispatch, SetStateAction, useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import FormWrapperModal from '../../apps/generic-components/form-wrapper/FormWrapperModal'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox
} from '@newwork/nw-design-system'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { Project } from '../../apps/organizational-data/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { Account } from '../../apps/organizational-data/hooks/useProjects'

const DATA_TEST_ID_PREFIX = 'ProjectForm'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

export interface ProjectFormProps extends BusinessAppContextProps {
  project?: Project
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  refetch: () => void
  isDrawerActive?: boolean
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  parentNodeId?: string
  accounts: Account[]
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  refetch,
  isDrawerActive = false,
  structureId,
  open,
  setOpen,
  accounts
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<string>(project?.projectType || '')
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>('')

  const accountOptions = useMemo(() => {
    return accounts
      .filter(account => account.name?.toLowerCase().includes(accountSearchTerm.toLowerCase()))
      .map(account => ({
        value: account.id,
        label: account.name
      }))
  }, [accounts, accountSearchTerm])

  useEffect(() => {
    setSelectedAccountId(null)
  }, [projectType])

  useEffect(() => {
    if (project) {
      setProjectType(project.projectType || '')
      if (project.customerId) {
        const account = accounts.find(acc => acc.id === project.customerId)
        setSelectedAccountId(account?.id || null)
      }
    }
  }, [project, accounts])

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      let formattedValidTo = values.validTo
      if (values.validTo && typeof values.validTo === 'string') {
        const dateString = values.validTo as string
        formattedValidTo = `${dateString}:00.000Z`
      }

      const projectData = {
        name: values.name,
        description: values.description,
        projectType: values.projectType,
        validTo: formattedValidTo,
        structureId: structureId,
        ...(values.projectType === 'EXTERNAL' && selectedAccountId ? { customerId: selectedAccountId } : {}),
        ...(project ? { id: project.id } : {})
      }

      if (project) {
        await restClient.put(`/projects/${project.id}`, projectData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/projects`, projectData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch()
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setLoading(false)
      setOpen?.(false)
    }
  }

  const defaultValues = useMemo(() => {
    return {
      ...project,
      validTo: project?.validTo ? new Date(project.validTo).toISOString().slice(0, 16) : undefined,
      customerId: project?.customerId || undefined
    }
  }, [project])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={project ? 'Edit Project' : 'Create Project'}
      description="Configure project details and information"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      defaultValues={defaultValues}
      isEditing={!!project}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
    >
      <FormField
        name="name"
        rules={{
          required: t('forms.project.fields.name.validation', {
            defaultValue: 'Please enter project name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.project.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.project.fields.name.placeholder', {
                  defaultValue: 'Enter project name'
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
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
            <FormLabel>{t('forms.project.fields.description.label', { defaultValue: 'Description' })}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.project.fields.description.placeholder', {
                  defaultValue: 'Enter project description (optional)'
                })}
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:gap-4">
          <FormField
            name="projectType"
            rules={{
              required: t('forms.project.fields.projectType.validation', {
                defaultValue: 'Please select a project type'
              })
            }}
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.projectType.label', { defaultValue: 'Project Type' })}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={value => {
                      field.onChange(value)
                      setProjectType(value)
                    }}
                    value={field.value}
                    data-testid={`${dataTestId}-projectType-select`}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('forms.project.fields.projectType.placeholder', {
                          defaultValue: 'Select project type'
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">
                        {t('forms.project.fields.projectType.options.internal', {
                          defaultValue: 'Internal'
                        })}
                      </SelectItem>
                      <SelectItem value="EXTERNAL">
                        {t('forms.project.fields.projectType.options.external', {
                          defaultValue: 'External'
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {projectType === 'EXTERNAL' && (
            <FormField
              name="customerId"
              rules={{
                required: t('forms.project.fields.customer.validation', {
                  defaultValue: 'Please select a customer account'
                })
              }}
              render={({ field }) => (
                <FormItem className="gba:w-1/2">
                  <FormLabel>
                    {t('forms.project.fields.customer.label', { defaultValue: 'Customer Account' })}
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      value={selectedAccountId || field.value || ''}
                      onValueChange={(value: string) => {
                        const account = accountOptions.find(acc => acc.value === value)
                        setSelectedAccountId(account?.value || null)
                        field.onChange(value)
                      }}
                      options={accountOptions}
                      onSearch={value => setAccountSearchTerm(value)}
                      placeholder={t('forms.project.fields.customer.placeholder', {
                        defaultValue: 'Select account'
                      })}
                      data-testid={`${dataTestId}-customer-combobox`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          name="validTo"
          render={({ field }) => (
            <FormItem className="gba:w-1/2">
              <FormLabel>{t('forms.project.fields.validTo.label', { defaultValue: 'Valid Until' })}</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  placeholder={t('forms.project.fields.validTo.placeholder', {
                    defaultValue: 'Select end date (optional)'
                  })}
                  {...field}
                  data-testid={`${dataTestId}-validTo-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormWrapperModal>
  )
}

export default ProjectForm
