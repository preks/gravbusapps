import React, { Dispatch, SetStateAction, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import { Input, FormField, FormItem, FormLabel, FormControl, FormMessage, Textarea } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { Department } from '../../apps/organizational-data/types'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

const DATA_TEST_ID_PREFIX = 'DepartmentForm'

export interface DepartmentFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  department?: Department
  refetch: () => void
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  isDrawerActive?: boolean
  childAddButton?: React.ReactNode
  parentNodeId?: string
  rank?: number
  isEditDepartment?: boolean
  onCancel: () => void
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({
  prefixDataTestId,
  department,
  refetch,
  structureId,
  open,
  setOpen,
  isDrawerActive = false,
  childAddButton,
  accessToken,
  parentNodeId,
  rank,
  isEditDepartment,
  onCancel
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const orgchartClient = useOrgchartClient(accessToken)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)

  const defaultValues = {
    name: '',
    code: '',
    type: '',
    description: '',
    parentNodeId: ''
  }

  const onCancelForm = () => {
    onCancel()
    setOpen?.(false)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      const departmentData = {
        type: 'organization_unit',
        ...(parentNodeId && !isEditDepartment ? { parentNode: parentNodeId } : {}),
        data: {
          organizationalUnitData: {
            ...(isEditDepartment && department ? { company: { companyId: department.companyId ?? null } } : {}),
            ...(isEditDepartment && department
              ? {
                  costCenter: {
                    costCenterId: department.costCenterId ?? null,
                    costCenterName: department.costCenterName ?? null
                  }
                }
              : {}),
            name: values.name,
            description: values.description ?? '',
            ...(isEditDepartment && department ? { organizationUnitId: department.organizationUnitId } : {}),
            type: parentNodeId ? 'DEPARTMENT' : 'MANAGEMENT'
          },
          ...(parentNodeId ? { rank: rank } : {})
        },
        ...(isEditDepartment && department ? { id: department.nodeId } : {})
      }

      if (isEditDepartment) {
        // Update existing department
        await orgchartClient.updateOrganizationalUnitNode(structureId, departmentData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        // Create new department
        await orgchartClient.createOrganizationalUnitNode(structureId, departmentData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch()
      setOpen?.(false)
    } catch (error) {
      console.error('Error saving department:', error)
    } finally {
      onCancel()
      setLoading(false)
      setOpen?.(false)
    }
  }
  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={department ? 'Edit Department' : 'Create Department'}
      description="Configure department details and information"
      onSubmit={handleSubmit}
      onCancel={onCancelForm}
      defaultValues={
        department
          ? {
              ...department
            }
          : {
              ...defaultValues
            }
      }
      isEditing={!!department}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
    >
      <FormField
        name="name"
        rules={{
          required: t('forms.department.fields.name.validation', {
            defaultValue: 'Please enter department name'
          })
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.department.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.department.fields.name.placeholder', {
                  defaultValue: 'Enter department name'
                })}
                data-testid={`${dataTestId}-name-input`}
                {...field}
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
            <FormLabel>{t('forms.department.fields.description.label', { defaultValue: 'Description' })}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.department.fields.description.placeholder', {
                  defaultValue: 'Enter department description (optional)'
                })}
                data-testid={`${dataTestId}-description-textarea`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormWrapperModal>
  )
}

export default DepartmentForm
